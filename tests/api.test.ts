import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';
import { vi } from 'vitest';

const ORG_ID = 'org_kktires';
const USER_ID = 'user_test_1';
const USER_EMAIL = 'test@example.com';
const LEAD_ID = 'lead_test_1';

const {
  mockRequireSession,
  mockCountRecipients,
  mockNormalizeRecipientFilters,
  mockEnqueueCampaignSend,
  mockSendEmail,
  mockProcessDueEmailJobs,
  mockAuth,
} = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockCountRecipients: vi.fn(),
  mockNormalizeRecipientFilters: vi.fn(),
  mockEnqueueCampaignSend: vi.fn(),
  mockSendEmail: vi.fn(),
  mockProcessDueEmailJobs: vi.fn(),
  mockAuth: vi.fn(),
}));

vi.mock('@/auth', () => ({
  auth: mockAuth,
  handlers: { GET: vi.fn(), POST: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('@/server/authz', () => ({
  requireSession: mockRequireSession,
  getOrgIdFromSession: (session: { user?: { currentOrgId?: string } } | null) =>
    session?.user?.currentOrgId || ORG_ID,
  hasRole: (
    session: { user?: { currentOrgRole?: string } } | null,
    roles: Array<'owner' | 'admin' | 'member'>
  ) => roles.includes((session?.user?.currentOrgRole as 'owner' | 'admin' | 'member') || 'member'),
}));

vi.mock('@/server/email/recipients', () => ({
  countRecipients: mockCountRecipients,
  normalizeRecipientFilters: mockNormalizeRecipientFilters,
}));

vi.mock('@/server/email/job-queue', () => ({
  enqueueCampaignSend: mockEnqueueCampaignSend,
}));

vi.mock('@/server/email/transport', () => ({
  sendEmail: mockSendEmail,
}));

vi.mock('@/server/email/process-jobs', () => ({
  processDueEmailJobs: mockProcessDueEmailJobs,
}));

function ownerSession() {
  return {
    user: {
      id: USER_ID,
      email: USER_EMAIL,
      currentOrgId: ORG_ID,
      currentOrgRole: 'owner' as const,
    },
  };
}

function jsonRequest(url: string, method: string, body: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function idParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

describe('API routes (DB-backed)', () => {
  let client: Client;
  let db: LibSQLDatabase<typeof schema>;

  beforeAll(async () => {
    const dbDir = path.join('tests', '.tmp');
    const dbFile = path.join(dbDir, 'api.test.db');
    const url = 'file:./tests/.tmp/api.test.db';

    process.env.DATABASE_URL = url;
    process.env.DATABASE_AUTH_TOKEN = '';

    await mkdir(dbDir, { recursive: true });
    await rm(dbFile, { force: true });

    client = createClient({ url });
    db = drizzle(client, { schema });

    await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });

    await db.insert(schema.organizations).values({
      id: ORG_ID,
      name: 'KK Tires',
      slug: 'kktires',
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
      name: 'Test User',
      email: USER_EMAIL,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(schema.leads).values({
      id: LEAD_ID,
      orgId: ORG_ID,
      firstName: 'Alice',
      lastName: 'Doe',
      company: 'Example Co',
      email: 'alice@example.com',
      phone: '+30 210 0000000',
      source: 'manual',
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterAll(async () => {
    try {
      await client?.close?.();
    } catch {
      // ignore
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue(ownerSession());
    mockCountRecipients.mockResolvedValue(3);
    mockAuth.mockResolvedValue(ownerSession());
    mockNormalizeRecipientFilters.mockImplementation((value: unknown) => {
      if (!value || typeof value !== 'object') {
        return { cities: [], tags: [], segments: [], categories: [] };
      }
      const input = value as Record<string, unknown>;
      return {
        cities: Array.isArray(input.cities) ? input.cities : [],
        tags: Array.isArray(input.tags) ? input.tags : [],
        segments: Array.isArray(input.segments) ? input.segments : [],
        categories: Array.isArray(input.categories) ? input.categories : [],
      };
    });
    mockEnqueueCampaignSend.mockResolvedValue({
      ok: true,
      status: 200,
      alreadyQueued: false,
      jobId: 'job_test_1',
      runAt: new Date().toISOString(),
    });
    mockSendEmail.mockResolvedValue({
      ok: true,
      provider: 'smtp',
      messageId: '<test-message@example.com>',
    });
    mockProcessDueEmailJobs.mockResolvedValue({
      processedJobs: 0,
      sent: 0,
      failed: 0,
    });
  });

  it('GET /api/settings/profile returns profile', async () => {
    const route = await import('../src/app/api/settings/profile/route');
    const res = await route.GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.email).toBe(USER_EMAIL);
  });

  it('PUT /api/settings/profile updates name', async () => {
    const route = await import('../src/app/api/settings/profile/route');
    const req = jsonRequest('http://localhost/api/settings/profile', 'PUT', {
      name: 'New Name',
    });

    const res = await route.PUT(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('New Name');

    const user = await db.query.users.findFirst({
      where: (u, { eq: whereEq }) => whereEq(u.id, USER_ID),
      columns: { name: true },
    });
    expect(user?.name).toBe('New Name');
  });

  it('GET/PUT /api/settings/org reads and persists org settings', async () => {
    const route = await import('../src/app/api/settings/org/route');

    const res1 = await route.GET();
    expect(res1.status).toBe(200);
    const org1 = await res1.json();
    expect(org1.id).toBe(ORG_ID);
    expect(org1.name).toBe('KK Tires');

    const req = jsonRequest('http://localhost/api/settings/org', 'PUT', {
      name: 'KK Tires Updated',
      vatId: '123456789',
      address: 'Patision 10',
      city: 'Athens',
      phone: '+30 210 1234567',
      website: 'https://kktires.gr',
    });
    const res2 = await route.PUT(req as any);
    expect(res2.status).toBe(200);
    const org2 = await res2.json();
    expect(org2.name).toBe('KK Tires Updated');
    expect(org2.settings?.companyProfile?.vatId).toBe('123456789');
    expect(org2.settings?.companyProfile?.city).toBe('Athens');
  });

  it('GET/PUT /api/settings/preferences creates and updates preferences', async () => {
    const route = await import('../src/app/api/settings/preferences/route');

    const res1 = await route.GET();
    expect(res1.status).toBe(200);
    const pref1 = await res1.json();
    expect(pref1.userId).toBe(USER_ID);
    expect(pref1.orgId).toBe(ORG_ID);
    expect(pref1.theme).toBeTruthy();
    expect(pref1.notifications).toBeTruthy();

    const req = jsonRequest('http://localhost/api/settings/preferences', 'PUT', {
      theme: 'light',
      notifications: {
        email: false,
        push: true,
        birthdays: true,
        tasks: false,
        campaigns: true,
      },
    });

    const res2 = await route.PUT(req as any);
    expect(res2.status).toBe(200);
    const pref2 = await res2.json();
    expect(pref2.theme).toBe('light');
    expect(pref2.notifications.email).toBe(false);
    expect(pref2.notifications.tasks).toBe(false);
  });

  it('POST /api/leads/[id]/convert creates customer and marks lead as won', async () => {
    const route = await import('../src/app/api/leads/[id]/convert/route');

    const res = await route.POST(
      new Request(`http://localhost/api/leads/${LEAD_ID}/convert`, { method: 'POST' }),
      idParams(LEAD_ID) as any
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(typeof data.customerId).toBe('string');
    expect(data.customerId.startsWith('cust_')).toBe(true);

    const lead = await db.query.leads.findFirst({
      where: (l, { and: whereAnd, eq: whereEq }) =>
        whereAnd(whereEq(l.id, LEAD_ID), whereEq(l.orgId, ORG_ID)),
    });
    expect(lead?.status).toBe('won');
    expect(lead?.convertedToCustomerId).toBe(data.customerId);

    const customer = await db.query.customers.findFirst({
      where: (c, { and: whereAnd, eq: whereEq }) =>
        whereAnd(whereEq(c.id, data.customerId), whereEq(c.orgId, ORG_ID)),
    });
    expect(customer?.firstName).toBe('Alice');
    expect(customer?.createdBy).toBe(USER_ID);
  });

  it('POST /api/customers requires auth and validates body', async () => {
    const route = await import('../src/app/api/customers/route');
    mockRequireSession.mockResolvedValueOnce(null);
    const unauthRes = await route.POST(
      jsonRequest('http://localhost/api/customers', 'POST', { firstName: 'X' }) as any
    );
    expect(unauthRes.status).toBe(401);

    const badRes = await route.POST(jsonRequest('http://localhost/api/customers', 'POST', {}) as any);
    expect(badRes.status).toBe(400);
    const bad = await badRes.json();
    expect(bad.code).toBe('BAD_REQUEST');
  });

  it('POST /api/customers defaults and normalizes category to wholesale pipeline', async () => {
    const route = await import('../src/app/api/customers/route');

    const defaultCategoryRes = await route.POST(
      jsonRequest('http://localhost/api/customers', 'POST', {
        firstName: 'Category Default',
      }) as any
    );
    expect(defaultCategoryRes.status).toBe(201);
    const createdDefault = await defaultCategoryRes.json();
    expect(createdDefault.category).toBe('wholesale');

    const normalizedCategoryRes = await route.POST(
      jsonRequest('http://localhost/api/customers', 'POST', {
        firstName: 'Category Normalized',
        category: 'Χονδρική',
      }) as any
    );
    expect(normalizedCategoryRes.status).toBe(201);
    const createdNormalized = await normalizedCategoryRes.json();
    expect(createdNormalized.category).toBe('wholesale');

    const explicitCategoryRes = await route.POST(
      jsonRequest('http://localhost/api/customers', 'POST', {
        firstName: 'Category Explicit',
        category: 'vip',
      }) as any
    );
    expect(explicitCategoryRes.status).toBe(201);
    const createdExplicit = await explicitCategoryRes.json();
    expect(createdExplicit.category).toBe('vip');
  });

  it('customers CRUD works and list pagination is clamped', async () => {
    const customersRoute = await import('../src/app/api/customers/route');
    const customerByIdRoute = await import('../src/app/api/customers/[id]/route');

    const createRes = await customersRoute.POST(
      jsonRequest('http://localhost/api/customers', 'POST', {
        firstName: 'Bob',
        email: 'bob@example.com',
        city: 'Athens',
      }) as any
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();

    const listRes = await customersRoute.GET(
      new Request('http://localhost/api/customers?page=0&limit=999') as any
    );
    expect(listRes.status).toBe(200);
    const listed = await listRes.json();
    expect(listed.pagination.page).toBe(1);
    expect(listed.pagination.limit).toBe(100);

    const updateRes = await customerByIdRoute.PUT(
      jsonRequest(`http://localhost/api/customers/${created.id}`, 'PUT', {
        city: 'Thessaloniki',
        isVip: true,
      }) as any,
      idParams(created.id) as any
    );
    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json();
    expect(updated.city).toBe('Thessaloniki');
    expect(updated.isVip).toBe(true);

    const deleteRes = await customerByIdRoute.DELETE(
      new Request(`http://localhost/api/customers/${created.id}`, { method: 'DELETE' }) as any,
      idParams(created.id) as any
    );
    expect(deleteRes.status).toBe(200);

    const getMissing = await customerByIdRoute.GET(
      new Request(`http://localhost/api/customers/${created.id}`) as any,
      idParams(created.id) as any
    );
    expect(getMissing.status).toBe(404);
  });

  it('customer category standardization endpoint previews and applies safely', async () => {
    const customersRoute = await import('../src/app/api/customers/route');
    const standardizeRoute = await import('../src/app/api/customers/categories/standardize/route');

    const suffix = Date.now().toString();

    await customersRoute.POST(
      jsonRequest('http://localhost/api/customers', 'POST', {
        firstName: `Std Retail ${suffix}`,
        category: 'retail',
      }) as any
    );
    await customersRoute.POST(
      jsonRequest('http://localhost/api/customers', 'POST', {
        firstName: `Std VIP ${suffix}`,
        category: 'vip',
      }) as any
    );

    const previewRes = await standardizeRoute.GET(
      new Request('http://localhost/api/customers/categories/standardize?target=wholesale') as any
    );
    expect(previewRes.status).toBe(200);
    const preview = await previewRes.json();
    expect(preview.target).toBe('wholesale');
    expect(preview.total).toBeGreaterThan(0);
    expect(preview.byCategory).toBeTruthy();

    const badConfirmRes = await standardizeRoute.POST(
      jsonRequest('http://localhost/api/customers/categories/standardize', 'POST', {
        target: 'wholesale',
        confirm: false,
      }) as any
    );
    expect(badConfirmRes.status).toBe(400);

    const applyRes = await standardizeRoute.POST(
      jsonRequest('http://localhost/api/customers/categories/standardize', 'POST', {
        target: 'wholesale',
        confirm: true,
      }) as any
    );
    expect(applyRes.status).toBe(200);
    const applied = await applyRes.json();
    expect(applied.target).toBe('wholesale');
    expect(applied.updatedCount).toBeGreaterThanOrEqual(1);

    const secondApplyRes = await standardizeRoute.POST(
      jsonRequest('http://localhost/api/customers/categories/standardize', 'POST', {
        target: 'wholesale',
        confirm: true,
      }) as any
    );
    expect(secondApplyRes.status).toBe(200);
    const secondApply = await secondApplyRes.json();
    expect(secondApply.updatedCount).toBe(0);

    mockRequireSession.mockResolvedValueOnce(null);
    const unauthorizedRes = await standardizeRoute.GET(
      new Request('http://localhost/api/customers/categories/standardize?target=wholesale') as any
    );
    expect(unauthorizedRes.status).toBe(401);

    mockRequireSession.mockResolvedValueOnce({
      user: {
        id: USER_ID,
        email: USER_EMAIL,
        currentOrgId: ORG_ID,
        currentOrgRole: 'member',
      },
    });
    const forbiddenRes = await standardizeRoute.POST(
      jsonRequest('http://localhost/api/customers/categories/standardize', 'POST', {
        target: 'wholesale',
        confirm: true,
      }) as any
    );
    expect(forbiddenRes.status).toBe(403);
  });

  it('POST /api/customers/import normalizes and defaults category to wholesale', async () => {
    const importRoute = await import('../src/app/api/customers/import/route');

    const suffix = Date.now().toString();
    const res = await importRoute.POST(
      jsonRequest('http://localhost/api/customers/import', 'POST', {
        customers: [
          { firstName: `Import Wholesale ${suffix}`, category: 'Χονδρική' },
          { firstName: `Import Unknown ${suffix}`, category: 'not-a-category' },
        ],
      }) as any
    );

    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.success).toBe(2);

    const importedWholesale = await db.query.customers.findFirst({
      where: (c, { and: whereAnd, eq: whereEq }) =>
        whereAnd(whereEq(c.orgId, ORG_ID), whereEq(c.firstName, `Import Wholesale ${suffix}`)),
    });
    const importedUnknown = await db.query.customers.findFirst({
      where: (c, { and: whereAnd, eq: whereEq }) =>
        whereAnd(whereEq(c.orgId, ORG_ID), whereEq(c.firstName, `Import Unknown ${suffix}`)),
    });

    expect(importedWholesale?.category).toBe('wholesale');
    expect(importedUnknown?.category).toBe('wholesale');
  });

  it('POST /api/migrate normalizes and defaults category to wholesale', async () => {
    const migrateRoute = await import('../src/app/api/migrate/route');
    const prevEnabled = process.env.ENABLE_MIGRATE_ENDPOINT;
    process.env.ENABLE_MIGRATE_ENDPOINT = 'true';

    try {
      const suffix = Date.now().toString();
      const res = await migrateRoute.POST(
        jsonRequest('http://localhost/api/migrate', 'POST', {
          customers: [
            { FirstName: `Migrate Wholesale ${suffix}`, Category: 'Χονδρική' },
            { FirstName: `Migrate Unknown ${suffix}`, Category: 'unknown_category' },
          ],
          clearExisting: false,
        }) as any
      );

      expect(res.status).toBe(200);
      const payload = await res.json();
      expect(payload.success).toBe(true);

      const migratedWholesale = await db.query.customers.findFirst({
        where: (c, { and: whereAnd, eq: whereEq }) =>
          whereAnd(whereEq(c.orgId, ORG_ID), whereEq(c.firstName, `Migrate Wholesale ${suffix}`)),
      });
      const migratedUnknown = await db.query.customers.findFirst({
        where: (c, { and: whereAnd, eq: whereEq }) =>
          whereAnd(whereEq(c.orgId, ORG_ID), whereEq(c.firstName, `Migrate Unknown ${suffix}`)),
      });

      expect(migratedWholesale?.category).toBe('wholesale');
      expect(migratedUnknown?.category).toBe('wholesale');
    } finally {
      process.env.ENABLE_MIGRATE_ENDPOINT = prevEnabled;
    }
  });

  it('customer export neutralizes formula injection in CSV output', async () => {
    const customersRoute = await import('../src/app/api/customers/route');
    const exportRoute = await import('../src/app/api/customers/export/route');

    mockRequireSession.mockResolvedValueOnce(null);
    const unauthRes = await exportRoute.POST(
      jsonRequest('http://localhost/api/customers/export', 'POST', {
        fields: ['firstName'],
        format: 'csv',
      }) as any
    );
    expect(unauthRes.status).toBe(401);

    const createRes = await customersRoute.POST(
      jsonRequest('http://localhost/api/customers', 'POST', {
        firstName: '=HYPERLINK("http://malicious.test","x")',
        email: 'formula@example.com',
      }) as any
    );
    expect(createRes.status).toBe(201);

    const exportRes = await exportRoute.POST(
      jsonRequest('http://localhost/api/customers/export', 'POST', {
        fields: ['firstName', 'email'],
        format: 'csv',
        filter: 'all',
      }) as any
    );
    expect(exportRes.status).toBe(200);
    expect(exportRes.headers.get('content-type')).toContain('text/csv');
    const csv = await exportRes.text();
    expect(csv).toContain('\'=HYPERLINK(');
    expect(csv).toContain('formula@example.com');

    const excelRes = await exportRoute.POST(
      jsonRequest('http://localhost/api/customers/export', 'POST', {
        fields: ['firstName', 'email'],
        format: 'excel',
        filter: 'all',
      }) as any
    );
    expect(excelRes.status).toBe(200);
    expect(excelRes.headers.get('content-type')).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    const workbookBuffer = await excelRes.arrayBuffer();
    expect(workbookBuffer.byteLength).toBeGreaterThan(0);
  });

  it('leads CRUD validates and persists updates', async () => {
    const leadsRoute = await import('../src/app/api/leads/route');
    const leadByIdRoute = await import('../src/app/api/leads/[id]/route');

    const bad = await leadsRoute.POST(jsonRequest('http://localhost/api/leads', 'POST', {}) as any);
    expect(bad.status).toBe(400);

    const createRes = await leadsRoute.POST(
      jsonRequest('http://localhost/api/leads', 'POST', {
        firstName: 'Nikos',
        email: 'nikos@example.com',
        source: 'manual',
      }) as any
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();

    const patchRes = await leadByIdRoute.PATCH(
      jsonRequest(`http://localhost/api/leads/${created.id}`, 'PATCH', {
        status: 'qualified',
        score: 88,
      }),
      idParams(created.id)
    );
    expect(patchRes.status).toBe(200);
    const patched = await patchRes.json();
    expect(patched.status).toBe('qualified');
    expect(patched.score).toBe(88);

    const deleteRes = await leadByIdRoute.DELETE(
      new Request(`http://localhost/api/leads/${created.id}`, { method: 'DELETE' }),
      idParams(created.id)
    );
    expect(deleteRes.status).toBe(200);
  });

  it('tasks CRUD validates and persists updates', async () => {
    const tasksRoute = await import('../src/app/api/tasks/route');
    const taskByIdRoute = await import('../src/app/api/tasks/[id]/route');

    const createRes = await tasksRoute.POST(
      jsonRequest('http://localhost/api/tasks', 'POST', {
        title: 'Call customer',
        priority: 'high',
      }) as any
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();

    const patchRes = await taskByIdRoute.PATCH(
      jsonRequest(`http://localhost/api/tasks/${created.id}`, 'PATCH', {
        status: 'done',
      }),
      idParams(created.id)
    );
    expect(patchRes.status).toBe(200);
    const patched = await patchRes.json();
    expect(patched.status).toBe('done');
    expect(patched.completedAt).toBeTruthy();

    const deleteRes = await taskByIdRoute.DELETE(
      new Request(`http://localhost/api/tasks/${created.id}`, { method: 'DELETE' }),
      idParams(created.id)
    );
    expect(deleteRes.status).toBe(200);
  });

  it('campaign create/update/send uses recipient and queue services', async () => {
    const campaignsRoute = await import('../src/app/api/campaigns/route');
    const campaignByIdRoute = await import('../src/app/api/campaigns/[id]/route');
    const sendRoute = await import('../src/app/api/campaigns/[id]/send/route');

    const createRes = await campaignsRoute.POST(
      jsonRequest('http://localhost/api/campaigns', 'POST', {
        name: 'Promo Campaign',
        subject: 'Special offer',
        content: '<p>Hello</p>',
        recipientFilters: { cities: ['Athens'] },
      }) as any
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(mockNormalizeRecipientFilters).toHaveBeenCalled();
    expect(mockCountRecipients).toHaveBeenCalledWith(ORG_ID, { cities: ['Athens'], tags: [], segments: [], categories: [] });

    const updateRes = await campaignByIdRoute.PUT(
      jsonRequest(`http://localhost/api/campaigns/${created.id}`, 'PUT', {
        status: 'scheduled',
        scheduledAt: new Date(Date.now() + 60_000).toISOString(),
      }) as any,
      idParams(created.id) as any
    );
    expect(updateRes.status).toBe(200);

    const sendRes = await sendRoute.POST(
      jsonRequest(`http://localhost/api/campaigns/${created.id}/send`, 'POST', {
        runAt: new Date(Date.now() + 120_000).toISOString(),
      }),
      idParams(created.id)
    );
    expect(sendRes.status).toBe(200);
    const sent = await sendRes.json();
    expect(sent.success).toBe(true);
    expect(mockEnqueueCampaignSend).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: ORG_ID,
        campaignId: created.id,
        senderUserId: USER_ID,
      })
    );

    mockEnqueueCampaignSend.mockResolvedValueOnce({
      ok: false,
      status: 409,
      error: 'Campaign is already sent',
    });
    const conflictRes = await sendRoute.POST(
      jsonRequest(`http://localhost/api/campaigns/${created.id}/send`, 'POST', {
        runAt: new Date(Date.now() + 120_000).toISOString(),
      }),
      idParams(created.id)
    );
    expect(conflictRes.status).toBe(409);

    mockEnqueueCampaignSend.mockResolvedValueOnce({
      ok: false,
      status: 503,
      error: 'SMTP is not configured. Missing: SMTP_HOST.',
      code: 'SMTP_NOT_CONFIGURED',
    });
    const smtpRes = await sendRoute.POST(
      jsonRequest(`http://localhost/api/campaigns/${created.id}/send`, 'POST', {
        runAt: new Date(Date.now() + 120_000).toISOString(),
      }),
      idParams(created.id)
    );
    expect(smtpRes.status).toBe(503);
    const smtpPayload = await smtpRes.json();
    expect(smtpPayload.code).toBe('SMTP_NOT_CONFIGURED');
    expect(typeof smtpPayload.requestId).toBe('string');

    mockRequireSession.mockResolvedValueOnce(null);
    const unauthRes = await sendRoute.POST(
      jsonRequest(`http://localhost/api/campaigns/${created.id}/send`, 'POST', {
        runAt: new Date(Date.now() + 120_000).toISOString(),
      }),
      idParams(created.id)
    );
    expect(unauthRes.status).toBe(401);
  });

  it('tags, templates, and segments write routes persist data', async () => {
    const tagsRoute = await import('../src/app/api/tags/route');
    const tagsByIdRoute = await import('../src/app/api/tags/[id]/route');
    const templatesRoute = await import('../src/app/api/templates/route');
    const templatesByIdRoute = await import('../src/app/api/templates/[id]/route');
    const segmentsRoute = await import('../src/app/api/segments/route');
    const segmentsByIdRoute = await import('../src/app/api/segments/[id]/route');

    const tagRes = await tagsRoute.POST(
      jsonRequest('http://localhost/api/tags', 'POST', {
        name: 'VIP',
        color: '#FF0000',
      }) as any
    );
    expect(tagRes.status).toBe(201);
    const tag = await tagRes.json();

    const tagUpdateRes = await tagsByIdRoute.PUT(
      jsonRequest(`http://localhost/api/tags/${tag.id}`, 'PUT', {
        description: 'High value',
      }) as any,
      idParams(tag.id) as any
    );
    expect(tagUpdateRes.status).toBe(200);

    const templateRes = await templatesRoute.POST(
      jsonRequest('http://localhost/api/templates', 'POST', {
        name: 'Welcome',
        subject: 'Welcome aboard',
        content: '<p>Hi</p>',
      }) as any
    );
    expect(templateRes.status).toBe(201);
    const template = await templateRes.json();

    const templateUpdateRes = await templatesByIdRoute.PUT(
      jsonRequest(`http://localhost/api/templates/${template.id}`, 'PUT', {
        category: 'welcome',
      }) as any,
      idParams(template.id) as any
    );
    expect(templateUpdateRes.status).toBe(200);

    const segmentRes = await segmentsRoute.POST(
      jsonRequest('http://localhost/api/segments', 'POST', {
        name: 'Athens Customers',
        filters: {
          logic: 'and',
          conditions: [{ field: 'city', operator: 'equals', value: 'Athens' }],
        },
      }) as any
    );
    expect(segmentRes.status).toBe(200);
    const segmentPayload = await segmentRes.json();
    const segmentId = segmentPayload.segment.id as string;

    const segmentUpdateRes = await segmentsByIdRoute.PUT(
      jsonRequest(`http://localhost/api/segments/${segmentId}`, 'PUT', {
        description: 'Updated segment',
      }) as any,
      idParams(segmentId) as any
    );
    expect(segmentUpdateRes.status).toBe(200);
  });

  it('email send route enforces auth and SMTP transport readiness', async () => {
    const emailRoute = await import('../src/app/api/email/send/route');

    mockRequireSession.mockResolvedValueOnce(null);
    const unauthRes = await emailRoute.POST(
      jsonRequest('http://localhost/api/email/send', 'POST', {
        to: 'person@example.com',
        subject: 'Test',
        content: '<p>Hello</p>',
      }) as any
    );
    expect(unauthRes.status).toBe(401);

    mockSendEmail.mockResolvedValueOnce({
      ok: false,
      provider: 'smtp',
      errorCode: 'SMTP_NOT_CONFIGURED',
      errorMessage: 'SMTP is not configured. Missing: SMTP_HOST.',
    });
    const notConfiguredRes = await emailRoute.POST(
      jsonRequest('http://localhost/api/email/send', 'POST', {
        to: 'person@example.com',
        subject: 'Test',
        content: '<p>Hello</p>',
      }) as any
    );
    expect(notConfiguredRes.status).toBe(503);
    const notConfiguredPayload = await notConfiguredRes.json();
    expect(notConfiguredPayload.code).toBe('SMTP_NOT_CONFIGURED');
    expect(typeof notConfiguredPayload.requestId).toBe('string');

    const okRes = await emailRoute.POST(
      jsonRequest('http://localhost/api/email/send', 'POST', {
        to: 'person@example.com',
        subject: 'Test',
        content: '<p>Hello</p>',
      }) as any
    );
    expect(okRes.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalled();

    const campaignSendRes = await emailRoute.PUT(
      jsonRequest('http://localhost/api/email/send', 'PUT', {
        campaignId: 'camp_test_1',
      }) as any
    );
    expect(campaignSendRes.status).toBe(200);
    expect(mockEnqueueCampaignSend).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: ORG_ID,
        campaignId: 'camp_test_1',
      })
    );
  });

  it('email asset upload route enforces auth and validates file input', async () => {
    const uploadRoute = await import('../src/app/api/email/assets/upload/route');

    mockRequireSession.mockResolvedValueOnce(null);
    const unauthForm = new FormData();
    const unauthRes = await uploadRoute.POST(
      new Request('http://localhost/api/email/assets/upload', {
        method: 'POST',
        body: unauthForm,
      }) as any
    );
    expect(unauthRes.status).toBe(401);

    const missingFileForm = new FormData();
    const missingFileRes = await uploadRoute.POST(
      new Request('http://localhost/api/email/assets/upload', {
        method: 'POST',
        body: missingFileForm,
      }) as any
    );
    expect(missingFileRes.status).toBe(400);
    const payload = await missingFileRes.json();
    expect(payload.code).toBe('BAD_REQUEST');
    expect(typeof payload.requestId).toBe('string');
  });

  it('health route hides details unless authorized', async () => {
    const healthRoute = await import('../src/app/api/health/route');

    mockRequireSession.mockResolvedValueOnce(null);
    const basicRes = await healthRoute.GET(new Request('http://localhost/api/health'));
    expect(basicRes.status).toBe(200);
    const basic = await basicRes.json();
    expect(basic.database).toBeUndefined();

    const prevSecret = process.env.HEALTHCHECK_SECRET;
    process.env.HEALTHCHECK_SECRET = 'health_secret';
    try {
      const detailedRes = await healthRoute.GET(
        new Request('http://localhost/api/health', {
          headers: { authorization: 'Bearer health_secret' },
        })
      );
      expect(detailedRes.status).toBe(200);
      const detailed = await detailedRes.json();
      expect(detailed.database).toBe('connected');
      expect(detailed.tables.organizations).toBeGreaterThanOrEqual(1);
      expect(detailed.emailReadiness.transport.provider).toBe('smtp');
      expect(typeof detailed.emailReadiness.transport.configured).toBe('boolean');
      expect(detailed.emailReadiness.queueTables.email_jobs.ok).toBe(true);
      expect(detailed.emailReadiness.queueTables.email_job_items.ok).toBe(true);
    } finally {
      process.env.HEALTHCHECK_SECRET = prevSecret;
    }
  });

  it('cron routes enforce CRON_SECRET and support external scheduler auth patterns', async () => {
    const cronEmailRoute = await import('../src/app/api/cron/email-jobs/route');
    const cronGeocodeRoute = await import('../src/app/api/cron/geocode-customers/route');

    const prevNodeEnv = process.env.NODE_ENV;
    const prevCronSecret = process.env.CRON_SECRET;
    const env = process.env as Record<string, string | undefined>;
    env.NODE_ENV = 'production';
    env.CRON_SECRET = 'cron_secret';

    try {
      const emailUnauthorized = await cronEmailRoute.GET(
        new Request('http://localhost/api/cron/email-jobs')
      );
      expect(emailUnauthorized.status).toBe(401);

      const emailAuthorizedBearer = await cronEmailRoute.GET(
        new Request('http://localhost/api/cron/email-jobs', {
          headers: { authorization: 'Bearer cron_secret' },
        })
      );
      expect(emailAuthorizedBearer.status).toBe(200);
      expect(mockProcessDueEmailJobs).toHaveBeenCalled();

      const emailAuthorizedHeader = await cronEmailRoute.GET(
        new Request('http://localhost/api/cron/email-jobs', {
          headers: { 'x-cron-secret': 'cron_secret' },
        })
      );
      expect(emailAuthorizedHeader.status).toBe(200);

      const emailAuthorizedQuery = await cronEmailRoute.GET(
        new Request('http://localhost/api/cron/email-jobs?cron_secret=cron_secret')
      );
      expect(emailAuthorizedQuery.status).toBe(200);

      const geocodeUnauthorized = await cronGeocodeRoute.GET(
        new Request('http://localhost/api/cron/geocode-customers')
      );
      expect(geocodeUnauthorized.status).toBe(401);
    } finally {
      env.NODE_ENV = prevNodeEnv;
      env.CRON_SECRET = prevCronSecret;
    }
  });

  it('debug auth-state stays disabled without AUTH_DEBUG', async () => {
    const debugRoute = await import('../src/app/api/debug/auth-state/route');
    const prevAuthDebug = process.env.AUTH_DEBUG;
    process.env.AUTH_DEBUG = '0';

    try {
      const res = await debugRoute.GET(
        new Request('http://localhost/api/debug/auth-state') as any
      );
      expect(res.status).toBe(404);
    } finally {
      process.env.AUTH_DEBUG = prevAuthDebug;
    }
  });

  it('cross-org updates are blocked by org scope checks', async () => {
    const customersRoute = await import('../src/app/api/customers/route');
    const customerByIdRoute = await import('../src/app/api/customers/[id]/route');

    const createRes = await customersRoute.POST(
      jsonRequest('http://localhost/api/customers', 'POST', {
        firstName: 'Scoped User',
      }) as any
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();

    mockRequireSession.mockResolvedValueOnce({
      user: {
        id: USER_ID,
        email: USER_EMAIL,
        currentOrgId: 'org_other',
        currentOrgRole: 'owner',
      },
    });

    const updateRes = await customerByIdRoute.PUT(
      jsonRequest(`http://localhost/api/customers/${created.id}`, 'PUT', {
        city: 'Should Not Apply',
      }) as any,
      idParams(created.id) as any
    );
    expect(updateRes.status).toBe(404);

    const customer = await db.query.customers.findFirst({
      where: eq(schema.customers.id, created.id),
    });
    expect(customer?.city).not.toBe('Should Not Apply');
  });
});
