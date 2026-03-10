import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { vi } from 'vitest';

import * as schema from '../src/lib/db/schema';

const ORG_ID = 'org_job_queue';
const USER_ID = 'user_job_queue';

const { mockEnsureEmailTransportReady } = vi.hoisted(() => ({
  mockEnsureEmailTransportReady: vi.fn(),
}));

vi.mock('@/server/email/transport', () => ({
  ensureEmailTransportReady: mockEnsureEmailTransportReady,
}));

type JobQueueModule = typeof import('@/server/email/job-queue');
let jobQueueModule: JobQueueModule;
let client: Client;
let db: LibSQLDatabase<typeof schema>;

async function seedCampaign(
  campaignId: string,
  recipientFilters: {
    cities?: string[];
    tags?: string[];
    segments?: string[];
    categories?: string[];
    customerIds?: string[];
    rawEmails?: string[];
  }
) {
  const now = new Date();
  await db.insert(schema.emailCampaigns).values({
    id: campaignId,
    orgId: ORG_ID,
    name: `Campaign ${campaignId}`,
    subject: 'Subject',
    content: '<p>Hello</p>',
    status: 'draft',
    recipientFilters: {
      cities: recipientFilters.cities || [],
      tags: recipientFilters.tags || [],
      segments: recipientFilters.segments || [],
      categories: recipientFilters.categories || [],
      customerIds: recipientFilters.customerIds || [],
      rawEmails: recipientFilters.rawEmails || [],
    },
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
}

async function seedCustomer(id: string, input: { email?: string | null; firstName?: string }) {
  const now = new Date();
  await db.insert(schema.customers).values({
    id,
    orgId: ORG_ID,
    firstName: input.firstName || 'Customer',
    email: input.email ?? null,
    createdAt: now,
    updatedAt: now,
    createdBy: USER_ID,
  });
}

describe('enqueueCampaignSend', () => {
  beforeAll(async () => {
    const dbDir = path.join('tests', '.tmp');
    const dbFile = path.join(dbDir, 'job-queue.test.db');
    const url = 'file:./tests/.tmp/job-queue.test.db';

    await mkdir(dbDir, { recursive: true });
    await rm(dbFile, { force: true });

    process.env.DATABASE_URL = url;
    process.env.DATABASE_AUTH_TOKEN = '';

    client = createClient({ url });
    db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });

    await db.insert(schema.organizations).values({
      id: ORG_ID,
      name: 'Job Queue Org',
      slug: 'job-queue-org',
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
      email: 'queue@example.com',
      name: 'Queue User',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.resetModules();
    jobQueueModule = await import('@/server/email/job-queue');
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    mockEnsureEmailTransportReady.mockReturnValue({ ok: true, provider: 'smtp' });

    await db.delete(schema.emailJobs);
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

  it('rejects a campaign with no explicit recipient selection', async () => {
    await seedCampaign('camp_no_selection', {});

    const result = await jobQueueModule.enqueueCampaignSend({
      orgId: ORG_ID,
      campaignId: 'camp_no_selection',
      senderUserId: USER_ID,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toContain('Select at least one recipient');

    const jobs = await db.select({ id: schema.emailJobs.id }).from(schema.emailJobs);
    expect(jobs).toHaveLength(0);
  });

  it('rejects a campaign whose selected recipients do not resolve to emailable addresses', async () => {
    await seedCustomer('cust_no_email', { email: null, firstName: 'No Email' });
    await seedCampaign('camp_no_valid_recipients', {
      customerIds: ['cust_no_email'],
    });

    const result = await jobQueueModule.enqueueCampaignSend({
      orgId: ORG_ID,
      campaignId: 'camp_no_valid_recipients',
      senderUserId: USER_ID,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toContain('No recipients with valid email addresses');
  });

  it('queues a campaign when explicit selected recipients resolve successfully', async () => {
    await seedCustomer('cust_valid', { email: 'valid@example.com', firstName: 'Valid' });
    await seedCampaign('camp_ready', {
      customerIds: ['cust_valid'],
    });

    const result = await jobQueueModule.enqueueCampaignSend({
      orgId: ORG_ID,
      campaignId: 'camp_ready',
      senderUserId: USER_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [job] = await db
      .select({
        id: schema.emailJobs.id,
        status: schema.emailJobs.status,
      })
      .from(schema.emailJobs);
    const campaign = await db.query.emailCampaigns.findFirst({
      where: (c, { eq }) => eq(c.id, 'camp_ready'),
    });

    expect(job?.id).toBe(result.jobId);
    expect(job?.status).toBe('queued');
    expect(campaign?.status).toBe('sending');
  });
});
