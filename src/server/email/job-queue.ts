import os from 'os';

import { db } from '@/lib/db';
import { emailCampaigns, emailJobs } from '@/lib/db/schema';
import { and, eq, lte, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { ensureEmailTransportReady } from './transport';
import { countRecipients, normalizeRecipientFilters } from './recipients';

export type EmailJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export function getWorkerId() {
  return `${os.hostname()}:${process.pid}`;
}

function getLockTimeoutMs(): number {
  const raw = process.env.EMAIL_JOB_LOCK_TIMEOUT_MS;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  // Default: 5 minutes. Vercel cron runs every minute; a job stuck in "processing"
  // (e.g. because a serverless invocation was hard-killed) should be recoverable
  // within a few cron ticks, not after 15 minutes.
  // Must be comfortably longer than the cron function's maxDuration (60 s).
  return Number.isFinite(n) && n > 0 ? n : 5 * 60 * 1000;
}

function parseRunAt(input: unknown): Date {
  if (input instanceof Date && !isNaN(input.getTime())) return input;
  if (typeof input === 'string') {
    const d = new Date(input);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

function hasRecipientSelection(filters: {
  cities?: string[];
  tags?: string[];
  segments?: string[];
  categories?: string[];
  customerIds?: string[];
  rawEmails?: string[];
}) {
  return (
    (filters.cities?.length || 0) > 0 ||
    (filters.tags?.length || 0) > 0 ||
    (filters.segments?.length || 0) > 0 ||
    (filters.categories?.length || 0) > 0 ||
    (filters.customerIds?.length || 0) > 0 ||
    (filters.rawEmails?.length || 0) > 0
  );
}

export async function enqueueCampaignSend(params: {
  orgId: string;
  campaignId: string;
  senderUserId: string;
  runAt?: unknown;
}) {
  const now = new Date();
  const runAt = parseRunAt(params.runAt);

  const campaign = await db.query.emailCampaigns.findFirst({
    where: (c, { and, eq }) => and(eq(c.id, params.campaignId), eq(c.orgId, params.orgId)),
  });

  if (!campaign) {
    return { ok: false as const, status: 404, error: 'Campaign not found', code: 'NOT_FOUND' as const };
  }

  if (campaign.status === 'sent') {
    return {
      ok: false as const,
      status: 409,
      error: 'Campaign is already sent',
      code: 'ALREADY_SENT' as const,
    };
  }

  if (!campaign.subject.trim()) {
    return {
      ok: false as const,
      status: 400,
      error: 'Campaign subject is required before sending',
      code: 'BAD_REQUEST' as const,
    };
  }

  const recipientFilters = normalizeRecipientFilters(campaign.recipientFilters);
  if (!hasRecipientSelection(recipientFilters)) {
    return {
      ok: false as const,
      status: 400,
      error: 'Select at least one recipient before sending',
      code: 'BAD_REQUEST' as const,
    };
  }

  const resolvedRecipientCount = await countRecipients(params.orgId, recipientFilters);
  if (resolvedRecipientCount <= 0) {
    return {
      ok: false as const,
      status: 400,
      error: 'No recipients with valid email addresses were found',
      code: 'BAD_REQUEST' as const,
    };
  }

  const transport = ensureEmailTransportReady();
  if (!transport.ok) {
    return {
      ok: false as const,
      status: 503,
      error: transport.errorMessage,
      code: transport.errorCode,
    };
  }

  const existing = await db.query.emailJobs.findFirst({
    where: (j, { and, eq, inArray }) =>
      and(eq(j.campaignId, params.campaignId), inArray(j.status, ['queued', 'processing'])),
    orderBy: (j, { desc }) => desc(j.createdAt),
  });

  if (existing) {
    return { ok: true as const, alreadyQueued: true, jobId: existing.id, runAt: existing.runAt };
  }

  const jobId = `job_${nanoid()}`;

  await db.insert(emailJobs).values({
    id: jobId,
    orgId: params.orgId,
    campaignId: params.campaignId,
    senderUserId: params.senderUserId,
    status: 'queued',
    runAt,
    attempts: 0,
    maxAttempts: 3,
    lockedAt: null,
    lockedBy: null,
    startedAt: null,
    completedAt: null,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  });

  const nextStatus = runAt.getTime() > now.getTime() ? 'scheduled' : 'sending';

  await db
    .update(emailCampaigns)
    .set({
      status: nextStatus,
      scheduledAt: nextStatus === 'scheduled' ? runAt : null,
      updatedAt: now,
    })
    .where(eq(emailCampaigns.id, params.campaignId));

  return { ok: true as const, alreadyQueued: false, jobId, runAt };
}

export async function claimNextDueEmailJob(workerId: string) {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - getLockTimeoutMs());

  return db.transaction(async (tx) => {
    const queued = await tx.query.emailJobs.findFirst({
      where: (j, { and, eq, lte }) => and(eq(j.status, 'queued'), lte(j.runAt, now)),
      orderBy: (j, { asc }) => asc(j.runAt),
    });

    if (queued) {
      const updated = await tx
        .update(emailJobs)
        .set({
          status: 'processing',
          lockedAt: now,
          lockedBy: workerId,
          startedAt: queued.startedAt ?? now,
          // Note: attempts are incremented on actual failures, not on claim.
          updatedAt: now,
        })
        .where(and(eq(emailJobs.id, queued.id), eq(emailJobs.status, 'queued')))
        .returning();

      if (updated.length === 0) return null;
      return updated[0];
    }

    // Recover stale "processing" jobs if a worker/serverless invocation died mid-run.
    const stale = await tx.query.emailJobs.findFirst({
      where: (j, { and, eq, lte }) => and(eq(j.status, 'processing'), lte(j.lockedAt, staleBefore)),
      orderBy: (j, { asc }) => asc(j.lockedAt),
    });

    if (!stale) return null;

    const updated = await tx
      .update(emailJobs)
      .set({
        status: 'processing',
        lockedAt: now,
        lockedBy: workerId,
        startedAt: stale.startedAt ?? now,
        updatedAt: now,
      })
      .where(and(eq(emailJobs.id, stale.id), eq(emailJobs.status, 'processing'), lte(emailJobs.lockedAt, staleBefore)))
      .returning();

    if (updated.length === 0) return null;
    return updated[0];
  });
}

export async function yieldEmailJob(jobId: string, delayMs: number) {
  const now = new Date();
  const runAt = new Date(now.getTime() + Math.max(0, delayMs || 0));
  await db
    .update(emailJobs)
    .set({
      status: 'queued',
      runAt,
      lockedAt: null,
      lockedBy: null,
      updatedAt: now,
    })
    .where(eq(emailJobs.id, jobId));
}

export async function markEmailJobCompleted(jobId: string) {
  const now = new Date();
  await db
    .update(emailJobs)
    .set({
      status: 'completed',
      completedAt: now,
      updatedAt: now,
      lastError: null,
      lockedAt: null,
      lockedBy: null,
    })
    .where(eq(emailJobs.id, jobId));
}

// Turso/libsql embeds the full SQL in error messages for batch queries:
// "Failed query: INSERT INTO ... values (?, ...) : SQLITE_UNKNOWN: <reason>"
// The actual error reason is at the END. Naively slicing to 1000 chars stores
// only the SQL — the cause is invisible. Extract the meaningful part instead.
function extractJobError(error: string): string {
  if (error.length <= 1000) return error;
  // Find the SQLITE error code which appears after the SQL
  const idx = error.lastIndexOf(': SQLITE_');
  if (idx !== -1 && error.length - idx < 800) {
    return error.slice(idx + 2).slice(0, 1000);
  }
  // Fallback: take the tail where the reason typically lives
  return '...' + error.slice(-997);
}

export async function markEmailJobFailed(jobId: string, error: string) {
  const now = new Date();
  await db
    .update(emailJobs)
    .set({
      status: 'failed',
      completedAt: now,
      updatedAt: now,
      lastError: extractJobError(error),
      lockedAt: null,
      lockedBy: null,
      attempts: sql`${emailJobs.attempts} + 1`,
    })
    .where(eq(emailJobs.id, jobId));
}
