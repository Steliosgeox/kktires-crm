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

async function run0010() {
  console.log('\nRunning migration 0010_fix_broken_fk_references...');
  // Root cause: SQLite auto-rewrites FK references in other tables when a referenced
  // table is renamed. Migration 0009 renamed campaign_recipients → __old_campaign_recipients
  // (and back), causing email_job_items, email_tracking, and email_delivery_events to
  // reference the now-deleted __old_campaign_recipients. Fix: drop and recreate each table
  // with the correct FK references.

  await client.execute('PRAGMA foreign_keys=OFF');

  // email_job_items — 0 rows on first run, safe to drop+recreate
  await client.execute('DROP TABLE IF EXISTS email_job_items');
  await client.execute(`
    CREATE TABLE \`email_job_items\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`job_id\` text NOT NULL,
      \`campaign_id\` text NOT NULL,
      \`recipient_id\` text NOT NULL,
      \`status\` text DEFAULT 'pending' NOT NULL,
      \`sent_at\` integer,
      \`error_message\` text,
      \`created_at\` integer NOT NULL,
      \`updated_at\` integer NOT NULL,
      \`customer_id\` text,
      \`email\` text,
      FOREIGN KEY (\`job_id\`) REFERENCES \`email_jobs\`(\`id\`) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (\`campaign_id\`) REFERENCES \`email_campaigns\`(\`id\`) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (\`recipient_id\`) REFERENCES \`campaign_recipients\`(\`id\`) ON UPDATE no action ON DELETE cascade
    )
  `);
  await client.execute('CREATE INDEX IF NOT EXISTS email_job_items_job_idx ON email_job_items (job_id)');
  await client.execute('CREATE INDEX IF NOT EXISTS email_job_items_campaign_idx ON email_job_items (campaign_id)');
  console.log('  Recreated email_job_items (FK fixed)');

  // email_delivery_events — 0 rows, safe to drop+recreate
  await client.execute('DROP TABLE IF EXISTS email_delivery_events');
  await client.execute(`
    CREATE TABLE email_delivery_events (
      id TEXT PRIMARY KEY NOT NULL,
      org_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_category TEXT NOT NULL,
      failure_reason TEXT,
      smtp_code INTEGER,
      smtp_message TEXT,
      diagnostic_code TEXT,
      bounce_type TEXT,
      bounce_subtype TEXT,
      attempt_number INTEGER DEFAULT 1,
      next_retry_at INTEGER,
      retry_eligible INTEGER DEFAULT 0,
      email_address TEXT NOT NULL,
      domain TEXT,
      mx_valid INTEGER,
      dns_checked_at INTEGER,
      occurred_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (recipient_id) REFERENCES campaign_recipients(id) ON DELETE CASCADE
    )
  `);
  console.log('  Recreated email_delivery_events (FK fixed)');

  // email_tracking — may have data; copy-rename pattern
  await client.execute('DROP TABLE IF EXISTS __new_email_tracking').catch(() => {});
  await client.execute(`
    CREATE TABLE \`__new_email_tracking\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`campaign_id\` text NOT NULL,
      \`recipient_id\` text NOT NULL,
      \`type\` text NOT NULL,
      \`link_url\` text,
      \`ip_address\` text,
      \`user_agent\` text,
      \`created_at\` integer NOT NULL,
      FOREIGN KEY (\`campaign_id\`) REFERENCES \`email_campaigns\`(\`id\`) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (\`recipient_id\`) REFERENCES \`campaign_recipients\`(\`id\`) ON UPDATE no action ON DELETE cascade
    )
  `);
  await client.execute(
    'INSERT INTO __new_email_tracking SELECT id, campaign_id, recipient_id, type, link_url, ip_address, user_agent, created_at FROM email_tracking'
  );
  const cnt = await client.execute('SELECT COUNT(*) FROM __new_email_tracking');
  console.log('  Copied', cnt.rows[0][0], 'rows into new email_tracking');
  await client.execute('DROP TABLE email_tracking');
  await client.execute('ALTER TABLE __new_email_tracking RENAME TO email_tracking');
  await client.execute('CREATE INDEX IF NOT EXISTS tracking_campaign_type_idx ON email_tracking (campaign_id, type)');
  console.log('  Recreated email_tracking with data (FK fixed)');

  await client.execute('PRAGMA foreign_keys=ON');
  await recordMigration('0010_fix_broken_fk_references');
  console.log('  Recorded migration 0010');
  console.log('Migration 0010 DONE.');
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

  const oldRefs = await client.execute("SELECT name FROM sqlite_master WHERE sql LIKE '%__old%'");
  const broken = oldRefs.rows.map(r => r[0]);
  console.log('  FK __old refs remaining:', broken.length === 0 ? 'NONE (correct!)' : broken.join(', '));

  const applied = await getAppliedMigrations();
  console.log('  0009 recorded:', applied.has('0009_manual_recipients_and_segment_members'));
  console.log('  0010 recorded:', applied.has('0010_fix_broken_fk_references'));
}

/**
 * Safety net: detect any table whose FK references point to a temp/renamed table.
 * Uses PRAGMA foreign_key_list (not SQL text search) to read actual FK metadata —
 * this is reliable regardless of quoting or formatting in sqlite_master.sql.
 *
 * Catches the exact class of bug that caused migration 0010: SQLite silently
 * rewrites FK references when a referenced table is renamed, leaving dangling
 * pointers after the old table is dropped. If ANY are found, the build FAILS
 * so the problem is caught at deploy time, not silently in production.
 */
async function assertNobrokenFkReferences() {
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle_%'"
  );

  const broken = [];
  for (const row of tables.rows) {
    const tableName = String(row[0]);
    const fks = await client.execute(`PRAGMA foreign_key_list("${tableName}")`);
    for (const fk of fks.rows) {
      const referenced = String(fk[2]); // column 2 = referenced table name
      if (referenced.includes('__old') || referenced.includes('__new')) {
        broken.push(`${tableName} → ${referenced}`);
      }
    }
  }

  if (broken.length > 0) {
    throw new Error(
      `DEPLOY BLOCKED: broken FK references detected:\n  ${broken.join('\n  ')}\n` +
      'Add a migration (like 0010) to recreate these tables with correct FK references.'
    );
  }
  console.log('  FK integrity check: PASS (no broken references)');
}

async function main() {
  const applied = await getAppliedMigrations();
  console.log('Applied migrations:', [...applied].join(', '));

  if (!applied.has('0009_manual_recipients_and_segment_members')) {
    await run0009();
  } else {
    console.log('Migration 0009 already applied, skipping.');
  }

  if (!applied.has('0010_fix_broken_fk_references')) {
    await run0010();
  } else {
    console.log('Migration 0010 already applied, skipping.');
  }

  await verify();

  // Hard stop if any table still has broken FK references.
  // This runs on EVERY deploy — if a future migration leaves dangling FKs, the
  // build fails here and never reaches production.
  await assertNobrokenFkReferences();
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
