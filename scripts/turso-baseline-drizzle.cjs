/* eslint-disable */
require('dotenv').config();
const { createClient } = require('@libsql/client');

const BASELINE = [
  // 0000_init.sql
  {
    hash: '3daa619cbb257bb7fcaf708e42926dec09a2351c658ec1a1a86229f72fa5f423',
    created_at: 1770719232360,
  },
  // 0001_email_jobs.sql
  {
    hash: 'a9c41acec8330a347be5281ff7b728f2cb5d1e1f5eaa43bc9411b31fe0ffb3db',
    created_at: 1770722039781,
  },
];

async function main() {
  const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error('DATABASE_URL is required');
  if (!authToken) throw new Error('DATABASE_AUTH_TOKEN is required');

  const client = createClient({ url, authToken });

  // Ensure migrations table exists (same shape drizzle-kit expects).
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      "id" integer PRIMARY KEY AUTOINCREMENT,
      "hash" text NOT NULL,
      "created_at" numeric
    )
  `);

  const existing = await client.execute('SELECT hash FROM __drizzle_migrations');
  const set = new Set(existing.rows.map((r) => r.hash));

  let inserted = 0;
  for (const m of BASELINE) {
    if (set.has(m.hash)) continue;
    await client.execute({
      sql: 'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
      args: [m.hash, m.created_at],
    });
    inserted++;
  }

  const count = await client.execute('SELECT COUNT(*) AS c FROM __drizzle_migrations');
  console.log(`[turso-baseline] inserted=${inserted} total=${count.rows[0].c}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

