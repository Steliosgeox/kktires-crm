/* eslint-disable */
require('dotenv').config();
const { createClient } = require('@libsql/client');

async function main() {
  const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error('DATABASE_URL is required');
  if (!authToken) throw new Error('DATABASE_AUTH_TOKEN is required');

  const client = createClient({ url, authToken });
  const rows = await client.execute('SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at ASC');
  console.log(rows.rows);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

