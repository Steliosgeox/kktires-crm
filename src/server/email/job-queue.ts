import os from 'os';

import { db } from '@/lib/db';
import { emailCampaigns, emailJobs } from '@/lib/db/schema';
import { and, eq, inArray, lte, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export type EmailJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export function getWorkerId() {
  return `${os.hostname()}:${process.pid}`;
}

function getLockTimeoutMs(): number {
  const raw = process.env.EMAIL_JOB_LOCK_TIMEOUT_MS;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  // Default: 15 minutes. Vercel/serverless invocations should never keep jobs locked between runs.
  return Number.isFinite(n) && n > 0 ? n : 15 * 60 * 1000;
}

function parseRunAt(input: unknown): Date {
  if (input instanceof Date && !isNaN(input.getTime())) return input;
  if (typeof input === 'string') {
    const d = new Date(input);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
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
    return { ok: false as const, status: 404, error: 'Campaign not found' };
  }

  if (campaign.status === 'sent') {
    return { ok: false as const, status: 409, error: 'Campaign is already sent' };
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

export async function markEmailJobFailed(jobId: string, error: string) {
  const now = new Date();
  await db
    .update(emailJobs)
    .set({
      status: 'failed',
      completedAt: now,
      updatedAt: now,
      lastError: error.slice(0, 1000),
      lockedAt: null,
      lockedBy: null,
      attempts: sql`${emailJobs.attempts} + 1`,
    })
    .where(eq(emailJobs.id, jobId));
}
