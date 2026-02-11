import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

import * as schema from '../../src/lib/db/schema';

const ORG_ID = 'org_kktires';
const USER_ID = 'user_e2e_1';
const USER_EMAIL = 'test@example.com';

export default async function globalSetup() {
  const tmpDir = path.join(process.cwd(), 'tests', '.tmp');
  const dbFile = path.join(tmpDir, 'e2e.db');
  const storageStateFile = path.join(tmpDir, 'e2e.storageState.json');

  await mkdir(tmpDir, { recursive: true });
  await rm(dbFile, { force: true });
  await rm(storageStateFile, { force: true });

  const url = 'file:./tests/.tmp/e2e.db';

  const client = createClient({ url });
  const db = drizzle(client, { schema });

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
    name: 'E2E User',
    email: USER_EMAIL,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(schema.organizationMembers).values({
    id: 'mbr_e2e_1',
    userId: USER_ID,
    orgId: ORG_ID,
    role: 'owner',
    joinedAt: new Date(),
  });

  const sessionToken = crypto.randomBytes(32).toString('hex');
  await db.insert(schema.sessions).values({
    sessionToken,
    userId: USER_ID,
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
  });

  const storageState = {
    cookies: [
      {
        name: 'authjs.session-token',
        value: sessionToken,
        domain: '127.0.0.1',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax' as const,
      },
    ],
    origins: [],
  };

  await writeFile(storageStateFile, JSON.stringify(storageState, null, 2), 'utf8');

  try {
    await client.close?.();
  } catch {
    // ignore
  }
}
