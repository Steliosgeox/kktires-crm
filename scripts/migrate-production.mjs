/**
 * Production migration runner for Turso DB.
 * Applies pending Drizzle migrations that the drizzle-kit CLI skipped
 * due to hash-format differences in the __drizzle_migrations table.
 *
 * Usage:
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node scripts/migrate-production.mjs
 * Or with the production env file:
 *   node -r dotenv/config scripts/migrate-production.mjs dotenv_config_path=.env.production.crm
 */

import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

// Parse env file if no TURSO_DATABASE_URL in environment
function loadEnvFile(path) {
  const env = {};
  try {
    readFileSync(path, 'utf8').split('\n').forEach(line => {
      const m = line.match(/^([^=]+)="?([^"]*?)"?\s*$/);
      if (m) env[m[1].trim()] = m[2].trim();
    });
  } catch { /* file not found */ }
  return env;
}

const fileEnv = loadEnvFile(join(__dir, '../.env.production.crm'));
const url = process.env.TURSO_DATABASE_URL || fileEnv.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN || fileEnv.TURSO_AUTH_TOKEN;

if (!url) throw new Error('TURSO_DATABASE_URL required');

const client = createClient({ url, authToken });

async function getAppliedMigrations() {
  const result = await client.execute('SELECT hash FROM __drizzle_migrations');
  return new Set(result.rows.map(r => String(r[0])));
}

async function recordMigration(name) {
  await client.execute({
    sql: 'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
    args: [name, Date.now()],
  });
}

async function run0009() {
  console.log('\nRunning migration 0009_manual_recipients_and_segment_members...');

  await client.execute('PRAGMA foreign_keys=OFF');

  // Clean up any leftover temp table from a previous failed attempt
  await client.execute('DROP TABLE IF EXISTS `__new_campaign_recipients`').catch(() => {});
  await client.execute('DROP TABLE IF EXISTS `__old_campaign_recipients`').catch(() => {});

  await client.execute(`
    CREATE TABLE \`__new_campaign_recipients\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`campaign_id\` text NOT NULL,
      \`customer_id\` text,
      \`email\` text NOT NULL,
      \`recipient_source\` text NOT NULL DEFAULT 'customer',
      \`display_name\` text,
      \`status\` text NOT NULL DEFAULT 'pending',
      \`sent_at\` integer,
      \`error_message\` text,
      \`failure_category\` text,
      \`failure_reason_detailed\` text,
      \`bounce_type\` text,
      \`attempt_count\` integer DEFAULT 0,
      \`last_attempt_at\` integer,
      \`next_retry_at\` integer,
      \`mx_valid\` integer,
      \`dns_checked_at\` integer,
      \`email_normalized\` text,
      \`domain\` text,
      FOREIGN KEY (\`campaign_id\`) REFERENCES \`email_campaigns\`(\`id\`) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\`(\`id\`) ON UPDATE no action ON DELETE set null
    )
  `);
  console.log('  Created __new_campaign_recipients');

  await client.execute(`
    INSERT INTO \`__new_campaign_recipients\`
      (\`id\`, \`campaign_id\`, \`customer_id\`, \`email\`,
       \`recipient_source\`, \`display_name\`, \`status\`, \`sent_at\`,
       \`error_message\`, \`failure_category\`, \`failure_reason_detailed\`,
       \`bounce_type\`, \`attempt_count\`, \`last_attempt_at\`, \`next_retry_at\`,
       \`mx_valid\`, \`dns_checked_at\`, \`email_normalized\`, \`domain\`)
    SELECT
      \`id\`, \`campaign_id\`, \`customer_id\`, \`email\`,
      COALESCE(\`recipient_source\`, 'customer'),
      \`display_name\`, \`status\`, \`sent_at\`,
      \`error_message\`, \`failure_category\`, \`failure_reason_detailed\`,
      \`bounce_type\`, \`attempt_count\`, \`last_attempt_at\`, \`next_retry_at\`,
      \`mx_valid\`, \`dns_checked_at\`, \`email_normalized\`, \`domain\`
    FROM \`campaign_recipients\`
  `);
  console.log('  Copied existing data');

  // Turso/LibSQL handles FK renames natively — no PRAGMA legacy_alter_table needed
  await client.execute('ALTER TABLE `campaign_recipients` RENAME TO `__old_campaign_recipients`');
  await client.execute('ALTER TABLE `__new_campaign_recipients` RENAME TO `campaign_recipients`');
  await client.execute('DROP TABLE `__old_campaign_recipients`');
  console.log('  Table recreated (customer_id now nullable)');

  for (const sql of [
    'CREATE INDEX IF NOT EXISTS `recipients_campaign_idx` ON `campaign_recipients` (`campaign_id`)',
    'CREATE INDEX IF NOT EXISTS `idx_recipients_campaign_status` ON `campaign_recipients` (`campaign_id`,`status`)',
    'CREATE INDEX IF NOT EXISTS `idx_recipients_status_retry` ON `campaign_recipients` (`status`,`next_retry_at`)',
    'CREATE INDEX IF NOT EXISTS `idx_recipients_source` ON `campaign_recipients` (`recipient_source`)',
  ]) {
    await client.execute(sql);
  }
  console.log('  Recreated indexes');

  await client.execute(`
    CREATE TABLE IF NOT EXISTS \`segment_customers\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`segment_id\` text NOT NULL,
      \`customer_id\` text NOT NULL,
      \`created_at\` integer NOT NULL,
      FOREIGN KEY (\`segment_id\`) REFERENCES \`segments\`(\`id\`) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\`(\`id\`) ON UPDATE no action ON DELETE cascade
    )
  `);
  for (const sql of [
    'CREATE UNIQUE INDEX IF NOT EXISTS `segment_customers_segment_customer_uidx` ON `segment_customers` (`segment_id`, `customer_id`)',
    'CREATE INDEX IF NOT EXISTS `segment_customers_segment_idx` ON `segment_customers` (`segment_id`)',
    'CREATE INDEX IF NOT EXISTS `segment_customers_customer_idx` ON `segment_customers` (`customer_id`)',
  ]) {
    await client.execute(sql);
  }
  console.log('  Created segment_customers table + indexes');

  await client.execute('PRAGMA foreign_keys=ON');
  await recordMigration('0009_manual_recipients_and_segment_members');
  console.log('  Recorded in __drizzle_migrations');
  console.log('Migration 0009 DONE.');
}

async function verify() {
  const cols = await client.execute('PRAGMA table_info(campaign_recipients)');
  const cust = cols.rows.find(r => r[1] === 'customer_id');
  const src = cols.rows.find(r => r[1] === 'recipient_source');
  const disp = cols.rows.find(r => r[1] === 'display_name');
  console.log('\nVERIFICATION:');
  console.log('  customer_id nullable:', cust[3] === 0 ? 'YES (correct)' : 'NO (broken)');
  console.log('  recipient_source exists:', !!src);
  console.log('  display_name exists:', !!disp);
  const seg = await client.execute('SELECT name FROM sqlite_master WHERE type="table" AND name="segment_customers"');
  console.log('  segment_customers exists:', seg.rows.length > 0);
  const applied = await getAppliedMigrations();
  console.log('  0009 recorded:', applied.has('0009_manual_recipients_and_segment_members'));
}

async function main() {
  const applied = await getAppliedMigrations();
  console.log('Applied migrations:', [...applied].join(', '));

  if (!applied.has('0009_manual_recipients_and_segment_members')) {
    await run0009();
  } else {
    console.log('Migration 0009 already applied, skipping.');
  }

  await verify();
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
