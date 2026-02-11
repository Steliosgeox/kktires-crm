import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from '../src/lib/db/schema';
import { vi } from 'vitest';

const ORG_ID = 'org_kktires';
const USER_ID = 'user_test_1';
const USER_EMAIL = 'test@example.com';
const LEAD_ID = 'lead_test_1';

const mockRequireSession = vi.fn();

vi.mock('@/server/authz', () => ({
  requireSession: mockRequireSession,
  getOrgIdFromSession: (session: any) => session?.user?.currentOrgId || ORG_ID,
}));

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

    // Seed minimal org + user.
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
    // Best-effort cleanup; libsql client may not expose close in all builds.
    try {
      await client?.close?.();
    } catch {
      // ignore
    }
  });

  beforeEach(() => {
    mockRequireSession.mockResolvedValue({
      user: {
        id: USER_ID,
        email: USER_EMAIL,
        currentOrgId: ORG_ID,
        currentOrgRole: 'owner',
      },
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
    const req = new Request('http://localhost/api/settings/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' }),
    });

    const res = await route.PUT(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('New Name');

    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, USER_ID),
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

    const req = new Request('http://localhost/api/settings/org', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'KK Tires Updated',
        vatId: '123456789',
        address: 'Patision 10',
        city: 'Athens',
        phone: '+30 210 1234567',
        website: 'https://kktires.gr',
      }),
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

    const req = new Request('http://localhost/api/settings/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: 'light',
        notifications: {
          email: false,
          push: true,
          birthdays: true,
          tasks: false,
          campaigns: true,
        },
      }),
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
      new Request('http://localhost/api/leads/' + LEAD_ID + '/convert', { method: 'POST' }),
      { params: Promise.resolve({ id: LEAD_ID }) } as any
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(typeof data.customerId).toBe('string');
    expect(data.customerId.startsWith('cust_')).toBe(true);

    const lead = await db.query.leads.findFirst({
      where: (l, { and, eq }) => and(eq(l.id, LEAD_ID), eq(l.orgId, ORG_ID)),
    });
    expect(lead?.status).toBe('won');
    expect(lead?.convertedToCustomerId).toBe(data.customerId);

    const customer = await db.query.customers.findFirst({
      where: (c, { and, eq }) => and(eq(c.id, data.customerId), eq(c.orgId, ORG_ID)),
    });
    expect(customer?.firstName).toBe('Alice');
    expect(customer?.createdBy).toBe(USER_ID);
  });
});
