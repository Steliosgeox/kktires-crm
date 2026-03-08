/**
 * Migration 0010: Fix broken FK references caused by SQLite auto-updating
 * FK reference names when campaign_recipients was renamed during migration 0009.
 *
 * Root cause: SQLite automatically rewrites FK references in other tables when
 * a referenced table is renamed. After migration 0009 renamed campaign_recipients
 * → __old_campaign_recipients (and back), email_job_items, email_tracking, and
 * email_delivery_events all ended up referencing the now-deleted __old_campaign_recipients.
 */

import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

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

async function run0010() {
  console.log('\nRunning migration 0010_fix_broken_fk_references...');
  await client.execute('PRAGMA foreign_keys=OFF');

  // 1. email_job_items — 0 rows, safe to drop and recreate
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

  // 2. email_delivery_events — 0 rows, safe to drop and recreate
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

  // 3. email_tracking — has data, copy-rename pattern
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
  console.log('\nVERIFICATION:');

  // Check no tables still reference __old_campaign_recipients
  const oldRefs = await client.execute("SELECT name FROM sqlite_master WHERE sql LIKE '%__old%'");
  const broken = oldRefs.rows.map(r => r[0]);
  console.log('  Tables with __old refs:', broken.length === 0 ? 'NONE (correct!)' : broken.join(', '));

  // Try a real insert into email_job_items
  try {
    const rcpt = await client.execute(
      "SELECT id FROM campaign_recipients WHERE campaign_id='camp_TDL2-Sc1z6bMKI9p5CCFx' LIMIT 1"
    );
    const rcptId = rcpt.rows[0]?.[0];
    if (rcptId) {
      await client.execute({
        sql: 'INSERT INTO email_job_items (id, job_id, campaign_id, recipient_id, status, sent_at, error_message, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: ['jit_verify001', 'job_sTxi6s0W5f6JMGdwbvl_0', 'camp_TDL2-Sc1z6bMKI9p5CCFx', rcptId, 'pending', null, null, Date.now(), Date.now()]
      });
      await client.execute("DELETE FROM email_job_items WHERE id = 'jit_verify001'");
      console.log('  email_job_items insert test: PASS');
    }
  } catch (e) {
    console.log('  email_job_items insert test: FAIL -', e.message);
  }

  // Also reset the failing campaign job so it can be retried
  const now = Date.now();
  await client.execute({
    sql: "UPDATE email_jobs SET status='queued', run_at=?, locked_at=NULL, locked_by=NULL, attempts=0, last_error=NULL, updated_at=? WHERE campaign_id='camp_TDL2-Sc1z6bMKI9p5CCFx' AND status='failed'",
    args: [Math.floor(now / 1000), Math.floor(now / 1000)]
  });
  console.log('  Reset failed email_jobs for camp_TDL2 to queued');

  // Campaign should stay in sending status since recipients are pending
  const camp = await client.execute("SELECT status, total_recipients FROM email_campaigns WHERE id='camp_TDL2-Sc1z6bMKI9p5CCFx'");
  console.log('  Campaign status:', JSON.stringify(camp.rows[0]));
}

async function main() {
  const applied = await getAppliedMigrations();
  console.log('Applied migrations:', [...applied].join(', '));

  if (!applied.has('0010_fix_broken_fk_references')) {
    await run0010();
  } else {
    console.log('Migration 0010 already applied, skipping.');
  }

  await verify();
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
