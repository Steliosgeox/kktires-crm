/* eslint-disable */
const { createClient } = require('@libsql/client');

async function main() {
  const dbFile = process.argv[2] || 'local_migrate_test_jobs.db';
  const url = dbFile.startsWith('file:') ? dbFile : `file:./${dbFile}`;

  const client = createClient({ url });

  const info = await client.execute("PRAGMA table_info('__drizzle_migrations')");
  console.log('[__drizzle_migrations schema]');
  console.log(info.rows);

  const rows = await client.execute("SELECT * FROM __drizzle_migrations ORDER BY id ASC");
  console.log('[__drizzle_migrations rows]');
  console.log(rows.rows);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

