import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import * as schema from '../src/lib/db/schema';

const ORG_ID = 'org_process_jobs';
const USER_ID = 'user_process_jobs';

const { mockEnsureEmailTransportReady, mockSendEmail } = vi.hoisted(() => ({
  mockEnsureEmailTransportReady: vi.fn(),
  mockSendEmail: vi.fn(),
}));

vi.mock('@/server/email/transport', () => ({
  ensureEmailTransportReady: mockEnsureEmailTransportReady,
  sendEmail: mockSendEmail,
}));

type ProcessJobsModule = typeof import('../src/server/email/process-jobs');
let processJobsModule: ProcessJobsModule;
let client: Client;
let db: LibSQLDatabase<typeof schema>;

async function seedCampaignAndJob(campaignId: string) {
  const now = new Date();
  await db.insert(schema.emailCampaigns).values({
    id: campaignId,
    orgId: ORG_ID,
    name: `Campaign ${campaignId}`,
    subject: 'Subject',
    content: '<p>Hello {{firstName}}</p>',
    status: 'draft',
    recipientFilters: { cities: [], tags: [], segments: [], categories: [] },
    totalRecipients: 0,
    sentCount: 0,
    openCount: 0,
    clickCount: 0,
    bounceCount: 0,
    unsubscribeCount: 0,
    createdBy: USER_ID,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(schema.emailJobs).values({
    id: `job_${campaignId}`,
    orgId: ORG_ID,
    campaignId,
    senderUserId: USER_ID,
    status: 'queued',
    runAt: new Date(Date.now() - 60_000),
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
}

async function seedCustomer(id: string, email: string, firstName: string) {
  const now = new Date();
  await db.insert(schema.customers).values({
    id,
    orgId: ORG_ID,
    firstName,
    email,
    createdAt: now,
    updatedAt: now,
    createdBy: USER_ID,
  });
}

describe('processDueEmailJobs', () => {
  beforeAll(async () => {
    const dbDir = path.join('tests', '.tmp');
    const dbFile = path.join(dbDir, 'process-jobs.test.db');
    const url = 'file:./tests/.tmp/process-jobs.test.db';

    await mkdir(dbDir, { recursive: true });
    await rm(dbFile, { force: true });

    process.env.DATABASE_URL = url;
    process.env.DATABASE_AUTH_TOKEN = '';
    process.env.EMAIL_JOB_CONCURRENCY = '1';
    process.env.EMAIL_JOB_MAX_ITEMS_PER_RUN = '100';

    client = createClient({ url });
    db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });

    await db.insert(schema.organizations).values({
      id: ORG_ID,
      name: 'Process Jobs Org',
      slug: 'process-jobs-org',
      settings: {
        currency: 'EUR',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        timezone: 'Europe/Athens',
        language: 'el',
      },
      subscriptionTier: 'premium',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(schema.users).values({
      id: USER_ID,
      email: 'jobs@example.com',
      name: 'Jobs User',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.resetModules();
    processJobsModule = await import('../src/server/email/process-jobs');
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    mockEnsureEmailTransportReady.mockReturnValue({ ok: true, provider: 'smtp' });
    mockSendEmail.mockResolvedValue({ ok: true, provider: 'smtp', messageId: '<m1@example.com>' });

    await db.delete(schema.emailJobItems);
    await db.delete(schema.emailJobs);
    await db.delete(schema.emailTracking);
    await db.delete(schema.campaignRecipients);
    await db.delete(schema.emailCampaigns);
    await db.delete(schema.customers);
  });

  afterAll(async () => {
    try {
      await client?.close?.();
    } catch {
      // ignore
    }
  });

  it('marks campaign/job as failed when there are no eligible recipients', async () => {
    await seedCampaignAndJob('camp_no_recipients');

    const result = await processJobsModule.processDueEmailJobs({
      workerId: 'worker-test',
      timeBudgetMs: 10_000,
      maxJobs: 1,
    });

    expect(result.processedJobs).toBe(1);
    const campaign = await db.query.emailCampaigns.findFirst({
      where: (c, { eq: whereEq }) => whereEq(c.id, 'camp_no_recipients'),
    });
    const job = await db.query.emailJobs.findFirst({
      where: (j, { eq: whereEq }) => whereEq(j.id, 'job_camp_no_recipients'),
    });

    expect(campaign?.status).toBe('failed');
    expect(job?.status).toBe('failed');
    expect(job?.lastError).toContain('No recipients');
  });

  it('finalizes campaign as sent when at least one recipient succeeds', async () => {
    await seedCustomer('cust_1', 'one@example.com', 'One');
    await seedCustomer('cust_2', 'two@example.com', 'Two');
    await seedCampaignAndJob('camp_partial_fail');

    let callCount = 0;
    mockSendEmail.mockImplementation(async () => {
      callCount += 1;
      if (callCount === 1) {
        return { ok: true, provider: 'smtp', messageId: '<ok@example.com>' };
      }
      return {
        ok: false,
        provider: 'smtp',
        errorCode: 'SMTP_SEND_FAILED',
        errorMessage: 'connect ECONNREFUSED 127.0.0.1:587',
      };
    });

    await processJobsModule.processDueEmailJobs({
      workerId: 'worker-test',
      timeBudgetMs: 10_000,
      maxJobs: 1,
    });

    const campaign = await db.query.emailCampaigns.findFirst({
      where: (c, { eq: whereEq }) => whereEq(c.id, 'camp_partial_fail'),
    });
    const recipients = await db
      .select({
        status: schema.campaignRecipients.status,
        errorMessage: schema.campaignRecipients.errorMessage,
      })
      .from(schema.campaignRecipients)
      .where(eq(schema.campaignRecipients.campaignId, 'camp_partial_fail'));
    const job = await db.query.emailJobs.findFirst({
      where: (j, { eq: whereEq }) => whereEq(j.id, 'job_camp_partial_fail'),
    });

    expect(campaign?.status).toBe('sent');
    expect(campaign?.totalRecipients).toBe(2);
    expect(campaign?.sentCount).toBe(1);
    expect(job?.status).toBe('completed');
    expect(recipients.some((r) => r.status === 'sent')).toBe(true);
    expect(
      recipients.some((r) => r.status === 'failed' && String(r.errorMessage || '').includes('SMTP_SEND_FAILED'))
    ).toBe(true);
  });

  it('finalizes campaign as sent when all recipients are delivered', async () => {
    await seedCustomer('cust_3', 'three@example.com', 'Three');
    await seedCustomer('cust_4', 'four@example.com', 'Four');
    await seedCampaignAndJob('camp_all_sent');

    mockSendEmail.mockResolvedValue({
      ok: true,
      provider: 'smtp',
      messageId: '<all-sent@example.com>',
    });

    await processJobsModule.processDueEmailJobs({
      workerId: 'worker-test',
      timeBudgetMs: 10_000,
      maxJobs: 1,
    });

    const campaign = await db.query.emailCampaigns.findFirst({
      where: (c, { eq: whereEq }) => whereEq(c.id, 'camp_all_sent'),
    });
    const job = await db.query.emailJobs.findFirst({
      where: (j, { eq: whereEq }) => whereEq(j.id, 'job_camp_all_sent'),
    });

    expect(campaign?.status).toBe('sent');
    expect(campaign?.sentCount).toBe(2);
    expect(campaign?.totalRecipients).toBe(2);
    expect(job?.status).toBe('completed');
  });

  it('resets stale processing job-items and resumes delivery', async () => {
    await seedCustomer('cust_5', 'five@example.com', 'Five');
    await seedCampaignAndJob('camp_resume_stale');

    const now = new Date();
    await db.insert(schema.campaignRecipients).values({
      id: 'rcpt_resume_1',
      campaignId: 'camp_resume_stale',
      customerId: 'cust_5',
      email: 'five@example.com',
      status: 'pending',
      sentAt: null,
      errorMessage: null,
    });

    await db.insert(schema.emailJobItems).values({
      id: 'jit_resume_1',
      jobId: 'job_camp_resume_stale',
      campaignId: 'camp_resume_stale',
      recipientId: 'rcpt_resume_1',
      status: 'processing',
      sentAt: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    });

    mockSendEmail.mockResolvedValue({
      ok: true,
      provider: 'smtp',
      messageId: '<resume@example.com>',
    });

    await processJobsModule.processDueEmailJobs({
      workerId: 'worker-test',
      timeBudgetMs: 10_000,
      maxJobs: 1,
    });

    const recipient = await db.query.campaignRecipients.findFirst({
      where: (r, { eq: whereEq }) => whereEq(r.id, 'rcpt_resume_1'),
    });
    const campaign = await db.query.emailCampaigns.findFirst({
      where: (c, { eq: whereEq }) => whereEq(c.id, 'camp_resume_stale'),
    });

    expect(recipient?.status).toBe('sent');
    expect(campaign?.status).toBe('sent');
    expect(campaign?.sentCount).toBe(1);
  });
});
