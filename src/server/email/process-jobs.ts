import { db } from '@/lib/db';
import { campaignRecipients, customers, emailCampaigns, emailJobs, emailJobItems } from '@/lib/db/schema';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { claimNextDueEmailJob, markEmailJobCompleted, markEmailJobFailed, yieldEmailJob } from './job-queue';
import { selectRecipients } from './recipients';
import { ensureEmailTransportReady, sendEmail } from './transport';
import { applyAssetBundleToHtml, prepareCampaignAssetBundle } from './assets';
import {
  appendUnsubscribeFooter,
  buildOpenPixelUrl,
  buildUnsubscribeUrl,
  injectOpenPixel,
  rewriteHtmlLinksForClickTracking,
} from './tracking';

type EmailJobRow = typeof emailJobs.$inferSelect;

function personalize(text: string, data: Record<string, string>) {
  return Object.entries(data).reduce((acc, [k, v]) => acc.replaceAll(k, v), text);
}

function appendSignatureHtml(contentHtml: string, signatureHtml: string | null) {
  if (!signatureHtml) return contentHtml;

  const marker = '</body>';
  const signatureBlock = `\n<div style=\"margin-top:24px\">${signatureHtml}</div>\n`;

  if (contentHtml.toLowerCase().includes(marker)) {
    const idx = contentHtml.toLowerCase().lastIndexOf(marker);
    return contentHtml.slice(0, idx) + signatureBlock + contentHtml.slice(idx);
  }

  return contentHtml + signatureBlock;
}

function getIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function toErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim()) {
    return error;
  }
  return fallback;
}

function truncateFailure(message: string): string {
  return message.slice(0, 1000);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function ensureCampaignRecipientsSnapshot(job: EmailJobRow, campaign: typeof emailCampaigns.$inferSelect) {
  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, job.campaignId));

  const existingCount = Number(countRow?.count || 0);
  if (existingCount > 0) {
    // If a previous worker died mid-send, the old implementation could leave a partial snapshot.
    // When we detect "expected > actual", try to backfill based on the campaign's filters.
    if (campaign.totalRecipients && campaign.totalRecipients > existingCount) {
      const recipients = await selectRecipients(job.orgId, campaign.recipientFilters || {});
      if (recipients.length > existingCount) {
        const existing = await db
          .select({ customerId: campaignRecipients.customerId })
          .from(campaignRecipients)
          .where(eq(campaignRecipients.campaignId, job.campaignId));
        const existingSet = new Set(existing.map((r) => r.customerId));

        const missing = recipients.filter((r) => !existingSet.has(r.id));
        if (missing.length > 0) {
          const rows = missing.map((r) => ({
            id: `rcpt_${nanoid()}`,
            campaignId: job.campaignId,
            customerId: r.id,
            email: r.email,
            status: 'pending' as const,
            sentAt: null,
            errorMessage: null,
          }));

          await db.transaction(async (tx) => {
            for (const batch of chunk(rows, 100)) {
              await tx.insert(campaignRecipients).values(batch as any);
            }
          });
        }
      }
    }

    const [newCountRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(campaignRecipients)
      .where(eq(campaignRecipients.campaignId, job.campaignId));
    const newCount = Number(newCountRow?.count || 0);

    // Backfill totalRecipients if missing.
    if (!campaign.totalRecipients || campaign.totalRecipients === 0 || campaign.totalRecipients !== newCount) {
      await db
        .update(emailCampaigns)
        .set({ totalRecipients: newCount, updatedAt: new Date() })
        .where(eq(emailCampaigns.id, job.campaignId))
        .catch(() => undefined);
    }
    return { ok: true as const, totalRecipients: newCount };
  }

  const recipients = await selectRecipients(job.orgId, campaign.recipientFilters || {});
  if (recipients.length === 0) {
    return { ok: false as const, status: 400, error: 'No recipients with email addresses' };
  }

  const now = new Date();
  const rows = recipients.map((r) => ({
    id: `rcpt_${nanoid()}`,
    campaignId: job.campaignId,
    customerId: r.id,
    email: r.email,
    status: 'pending' as const,
    sentAt: null,
    errorMessage: null,
  }));

  // Insert in a single transaction; chunk to avoid SQLite parameter limits.
  await db.transaction(async (tx) => {
    for (const batch of chunk(rows, 100)) {
      await tx.insert(campaignRecipients).values(batch as any);
    }

    await tx
      .update(emailCampaigns)
      .set({
        status: 'sending',
        totalRecipients: rows.length,
        updatedAt: now,
      })
      .where(eq(emailCampaigns.id, job.campaignId));
  });

  return { ok: true as const, totalRecipients: rows.length };
}

async function resetStaleProcessingJobItems(jobId: string) {
  const now = new Date();
  // This job is locked at the job level. Any "processing" items can only be leftovers from a
  // previous crashed invocation; reset them so the job can resume.
  await db
    .update(emailJobItems)
    .set({ status: 'pending', updatedAt: now })
    .where(and(eq(emailJobItems.jobId, jobId), eq(emailJobItems.status, 'processing')))
    .catch(() => undefined);
}

async function ensureJobQueue(job: EmailJobRow) {
  // If the job queue is missing (e.g. crash mid-run), rebuild it from pending campaign recipients.
  const [pendingRecipientsRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(campaignRecipients)
    .where(and(eq(campaignRecipients.campaignId, job.campaignId), eq(campaignRecipients.status, 'pending')));

  const pendingRecipients = Number(pendingRecipientsRow?.count || 0);
  if (pendingRecipients === 0) return { ok: true as const, pendingRecipients: 0 };

  const [queuedForPendingRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(emailJobItems)
    .innerJoin(campaignRecipients, eq(campaignRecipients.id, emailJobItems.recipientId))
    .where(
      and(
        eq(emailJobItems.jobId, job.id),
        eq(campaignRecipients.status, 'pending'),
        inArray(emailJobItems.status, ['pending', 'processing'])
      )
    );

  const queuedForPending = Number(queuedForPendingRow?.count || 0);
  if (queuedForPending === pendingRecipients) return { ok: true as const, pendingRecipients };

  const now = new Date();
  // Queue exists but is missing items. Fill only the missing recipient ids to avoid duplicates.
  const existing = await db
    .select({ recipientId: emailJobItems.recipientId })
    .from(emailJobItems)
    .where(and(eq(emailJobItems.jobId, job.id), inArray(emailJobItems.status, ['pending', 'processing'])));
  const existingSet = new Set(existing.map((r) => r.recipientId));

  const recipientIds = await db
    .select({ id: campaignRecipients.id })
    .from(campaignRecipients)
    .where(and(eq(campaignRecipients.campaignId, job.campaignId), eq(campaignRecipients.status, 'pending')));

  const missing = recipientIds
    .map((r) => r.id)
    .filter((rid) => !existingSet.has(rid));

  if (missing.length > 0) {
    const items = missing.map((rid) => ({
      id: `jit_${nanoid()}`,
      jobId: job.id,
      campaignId: job.campaignId,
      recipientId: rid,
      status: 'pending' as const,
      sentAt: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    }));

    await db.transaction(async (tx) => {
      for (const batch of chunk(items, 100)) {
        await tx.insert(emailJobItems).values(batch as any);
      }
    });
  }

  return { ok: true as const, pendingRecipients };
}

async function finalizeCampaignIfDone(job: EmailJobRow) {
  const [pendingRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(campaignRecipients)
    .where(and(eq(campaignRecipients.campaignId, job.campaignId), eq(campaignRecipients.status, 'pending')));

  const pending = Number(pendingRow?.count || 0);
  if (pending > 0) return { ok: true as const, done: false };

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, job.campaignId));

  const [sentRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(campaignRecipients)
    .where(and(eq(campaignRecipients.campaignId, job.campaignId), eq(campaignRecipients.status, 'sent')));

  const [failedRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(campaignRecipients)
    .where(and(eq(campaignRecipients.campaignId, job.campaignId), eq(campaignRecipients.status, 'failed')));

  const total = Number(totalRow?.count || 0);
  const sent = Number(sentRow?.count || 0);
  const failed = Number(failedRow?.count || 0);
  // Only mark as 'failed' if NO recipients were successfully sent
  const status = sent === 0 ? 'failed' : 'sent';
  const now = new Date();

  await db
    .update(emailCampaigns)
    .set({
      status,
      sentAt: now,
      totalRecipients: total,
      sentCount: sent,
      updatedAt: now,
    })
    .where(eq(emailCampaigns.id, job.campaignId))
    .catch(() => undefined);

  return { ok: true as const, done: true, total, sent, failed, status };
}

async function processOneJob(job: EmailJobRow, params: { timeBudgetMs: number }) {
  const startMs = Date.now();
  const maxItems = getIntEnv('EMAIL_JOB_MAX_ITEMS_PER_RUN', 50);
  const concurrency = Math.max(1, Math.min(10, getIntEnv('EMAIL_JOB_CONCURRENCY', 4)));

  const campaign = await db.query.emailCampaigns.findFirst({
    where: (c, { and, eq }) => and(eq(c.id, job.campaignId), eq(c.orgId, job.orgId)),
  });

  if (!campaign) {
    await markEmailJobFailed(job.id, 'Campaign not found');
    return { ok: false as const, error: 'Campaign not found' };
  }

  if (campaign.status === 'sent') {
    await markEmailJobCompleted(job.id);
    return { ok: true as const, sent: 0, failed: 0, processed: 0, done: true };
  }

  const readiness = ensureEmailTransportReady();
  if (!readiness.ok) {
    await markEmailJobFailed(job.id, readiness.errorMessage);
    await db
      .update(emailCampaigns)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(emailCampaigns.id, job.campaignId))
      .catch(() => undefined);
    return { ok: false as const, error: readiness.errorMessage };
  }

  // Ensure we have the full recipient snapshot for this campaign.
  const snapshot = await ensureCampaignRecipientsSnapshot(job, campaign);
  if (!snapshot.ok) {
    await markEmailJobFailed(job.id, snapshot.error);
    await db
      .update(emailCampaigns)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(emailCampaigns.id, job.campaignId))
      .catch(() => undefined);
    return { ok: false as const, error: snapshot.error };
  }

  // Ensure campaign is marked as sending when the job actually runs.
  if (campaign.status === 'scheduled' || campaign.status === 'draft') {
    await db
      .update(emailCampaigns)
      .set({ status: 'sending', updatedAt: new Date() })
      .where(eq(emailCampaigns.id, job.campaignId))
      .catch(() => undefined);
  }

  await resetStaleProcessingJobItems(job.id);

  const queue = await ensureJobQueue(job);
  if (!queue.ok) {
    await markEmailJobFailed(job.id, 'Failed to initialize job queue');
    await db
      .update(emailCampaigns)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(emailCampaigns.id, job.campaignId))
      .catch(() => undefined);
    return { ok: false as const, error: 'Failed to initialize job queue' };
  }

  const signature =
    campaign.signatureId
      ? await db.query.emailSignatures.findFirst({
        where: (s, { and, eq }) => and(eq(s.id, campaign.signatureId as string), eq(s.orgId, job.orgId)),
      })
      : null;

  const campaignAssetBundle = await prepareCampaignAssetBundle({
    orgId: job.orgId,
    campaignId: job.campaignId,
  });

  let processed = 0;
  let sent = 0;
  let failed = 0;

  while (processed < maxItems && Date.now() - startMs < Math.max(1000, params.timeBudgetMs - 250)) {
    const remaining = Math.max(0, maxItems - processed);
    const take = Math.min(remaining, concurrency * 2);
    if (take <= 0) break;

    const items = await db
      .select({
        jobItemId: emailJobItems.id,
        recipientId: campaignRecipients.id,
        recipientEmail: campaignRecipients.email,
        firstName: customers.firstName,
        lastName: customers.lastName,
        company: customers.company,
        city: customers.city,
        phone: customers.phone,
        mobile: customers.mobile,
      })
      .from(emailJobItems)
      .innerJoin(campaignRecipients, eq(campaignRecipients.id, emailJobItems.recipientId))
      .innerJoin(customers, eq(customers.id, campaignRecipients.customerId))
      .where(
        and(
          eq(emailJobItems.jobId, job.id),
          eq(emailJobItems.status, 'pending'),
          eq(campaignRecipients.status, 'pending'),
          eq(customers.orgId, job.orgId)
        )
      )
      .orderBy(asc(emailJobItems.createdAt))
      .limit(take);

    if (items.length === 0) break;

    for (const group of chunk(items, concurrency)) {
      const groupStart = Date.now();
      type ProcessItemResult = { ok: boolean; skipped?: boolean; sent?: boolean };
      const results = await Promise.allSettled(
        group.map(async (item) => {
          const now = new Date();

          const claimed = await db
            .update(emailJobItems)
            .set({ status: 'processing', updatedAt: now })
            .where(and(eq(emailJobItems.id, item.jobItemId), eq(emailJobItems.status, 'pending')))
            .returning({ id: emailJobItems.id });

          if (claimed.length === 0) {
            return { ok: false as const, skipped: true as const };
          }

          try {
            const vars: Record<string, string> = {
              '{{firstName}}': item.firstName || '',
              '{{lastName}}': item.lastName || '',
              '{{company}}': item.company || '',
              '{{email}}': item.recipientEmail || '',
              '{{city}}': item.city || '',
              '{{phone}}': item.phone || item.mobile || '',
            };

            const subject = personalize(campaign.subject, vars);
            let content = appendSignatureHtml(personalize(campaign.content, vars), signature?.content || null);
            const withAssets = applyAssetBundleToHtml(content, campaignAssetBundle);
            content = withAssets.html;
            const attachments = withAssets.attachments.map((attachment) => ({ ...attachment }));

            const pixelUrl = buildOpenPixelUrl({ campaignId: job.campaignId, recipientId: item.recipientId });
            const unsubscribeUrl = buildUnsubscribeUrl({ campaignId: job.campaignId, recipientId: item.recipientId });

            content = rewriteHtmlLinksForClickTracking({
              html: content,
              campaignId: job.campaignId,
              recipientId: item.recipientId,
            });
            content = injectOpenPixel(content, pixelUrl);
            content = appendUnsubscribeFooter(content, unsubscribeUrl);

            const headers: Record<string, string> = {};
            if (unsubscribeUrl) {
              headers['List-Unsubscribe'] = `<${unsubscribeUrl}>`;
            }

            const sendResult = await sendEmail({
              to: item.recipientEmail,
              subject,
              html: content,
              headers,
              from: campaign.fromEmail || undefined,
              attachments,
            });

            const failureMessage = sendResult.ok
              ? null
              : truncateFailure(`${sendResult.errorCode}: ${sendResult.errorMessage}`);

            await db
              .update(campaignRecipients)
              .set({
                status: sendResult.ok ? 'sent' : 'failed',
                sentAt: sendResult.ok ? now : null,
                errorMessage: failureMessage,
              })
              .where(eq(campaignRecipients.id, item.recipientId));

            await db
              .update(emailJobItems)
              .set({
                status: sendResult.ok ? 'sent' : 'failed',
                sentAt: sendResult.ok ? now : null,
                errorMessage: failureMessage,
                updatedAt: new Date(),
              })
              .where(eq(emailJobItems.id, item.jobItemId));

            return { ok: true as const, sent: sendResult.ok };
          } catch (error) {
            const reason = truncateFailure(toErrorMessage(error, 'Failed to process email item'));

            await db
              .update(campaignRecipients)
              .set({
                status: 'failed',
                sentAt: null,
                errorMessage: reason,
              })
              .where(eq(campaignRecipients.id, item.recipientId))
              .catch(() => undefined);

            await db
              .update(emailJobItems)
              .set({
                status: 'failed',
                sentAt: null,
                errorMessage: reason,
                updatedAt: new Date(),
              })
              .where(eq(emailJobItems.id, item.jobItemId))
              .catch(() => undefined);

            return { ok: true as const, sent: false };
          }
        })
      );

      results.forEach((r) => {
        if (r.status !== 'fulfilled') {
          failed++;
          return;
        }
        const value = r.value as ProcessItemResult;
        if (value.skipped) return;
        processed++;
        if (value.sent) sent++;
        else failed++;
      });

      // Soft time budget check between groups.
      if (Date.now() - startMs >= Math.max(1000, params.timeBudgetMs - 250)) break;

      // Prevent extremely tight loops from starving the event loop.
      if (Date.now() - groupStart < 10) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }
  }

  if (sent > 0) {
    // Keep an approximate "sentCount" while sending, so the UI can show progress.
    await db
      .update(emailCampaigns)
      .set({
        sentCount: sql`${emailCampaigns.sentCount} + ${sent}`,
        updatedAt: new Date(),
      })
      .where(eq(emailCampaigns.id, job.campaignId))
      .catch(() => undefined);
  }

  const done = await finalizeCampaignIfDone(job);
  if (done.ok && done.done) {
    await markEmailJobCompleted(job.id);
    await db.delete(emailJobItems).where(eq(emailJobItems.jobId, job.id)).catch(() => undefined);
    return { ok: true as const, processed, sent, failed, done: true };
  }

  // Not done: unlock the job so a future cron tick can claim it again.
  await yieldEmailJob(job.id, getIntEnv('EMAIL_JOB_YIELD_DELAY_MS', 0));

  return { ok: true as const, processed, sent, failed, done: false };
}

export async function processDueEmailJobs(params: {
  workerId: string;
  timeBudgetMs?: number;
  maxJobs?: number;
}) {
  const startMs = Date.now();
  const timeBudgetMs = Math.max(1000, params.timeBudgetMs ?? 8000);
  const maxJobs = Math.max(1, Math.min(50, params.maxJobs ?? 5));

  let claimed = 0;
  let processedJobs = 0;
  let processedItems = 0;
  let sent = 0;
  let failed = 0;

  while (processedJobs < maxJobs && Date.now() - startMs < timeBudgetMs - 250) {
    const job = await claimNextDueEmailJob(params.workerId);
    if (!job) break;
    claimed++;

    try {
      const remaining = Math.max(1000, timeBudgetMs - (Date.now() - startMs));
      const res = await processOneJob(job, { timeBudgetMs: remaining });
      processedJobs++;
      if (res.ok) {
        processedItems += res.processed || 0;
        sent += res.sent || 0;
        failed += res.failed || 0;
      } else {
        failed += 1;
      }
    } catch (error) {
      // Best-effort: mark the job failed so it doesn't stay stuck in "processing".
      await markEmailJobFailed(job.id, error instanceof Error ? error.message : 'Unknown job error');
    }
  }

  return {
    ok: true as const,
    claimed,
    processedJobs,
    processedItems,
    sent,
    failed,
    elapsedMs: Date.now() - startMs,
  };
}
