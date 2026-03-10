/**
 * Production migration runner for Turso/LibSQL.
 *
 * Goals:
 * 1. Apply any pending Drizzle SQL files from ./drizzle based on drizzle/meta/_journal.json
 * 2. Preserve the older broken-FK repair for environments that still need it
 * 3. Verify there are no dangling __old/__new foreign-key targets after migrations
 *
 * Usage:
 *   node scripts/migrate-production.mjs
 *   node scripts/migrate-production.mjs --dry-run
 */

import { createClient } from '@libsql/client';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dir, '..');
const journalPath = join(rootDir, 'drizzle', 'meta', '_journal.json');
const defaultEnvPath = join(rootDir, '.env.production.crm');
const dryRun = process.argv.includes('--dry-run');

function loadEnvFile(path) {
  const env = {};
  if (!existsSync(path)) return env;

  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([^=]+)=(.*)$/);
    if (!match) continue;

    const key = match[1].trim();
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

function getLocalJournalEntries() {
  const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
  if (!Array.isArray(journal?.entries)) {
    throw new Error('Invalid drizzle journal: entries array missing');
  }

  return journal.entries.map((entry) => ({
    tag: String(entry.tag),
    sqlPath: join(rootDir, 'drizzle', `${String(entry.tag)}.sql`),
  }));
}

function splitSqlStatements(sqlText) {
  return sqlText
    .split(/-->\s*statement-breakpoint/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function readRowValue(row, key, index = 0) {
  if (row && typeof row === 'object') {
    if (key in row) return row[key];
    if (index in row) return row[index];
  }
  return undefined;
}

function isIndexAlreadyExistsError(error, statement) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /^CREATE\s+(UNIQUE\s+)?INDEX/i.test(statement) && /already exists/i.test(message);
}

const fileEnv = loadEnvFile(defaultEnvPath);
const url =
  process.env.DATABASE_URL ||
  process.env.TURSO_DATABASE_URL ||
  fileEnv.DATABASE_URL ||
  fileEnv.TURSO_DATABASE_URL;
const authToken =
  process.env.DATABASE_AUTH_TOKEN ||
  process.env.TURSO_AUTH_TOKEN ||
  fileEnv.DATABASE_AUTH_TOKEN ||
  fileEnv.TURSO_AUTH_TOKEN;

if (!url) {
  throw new Error('DATABASE_URL or TURSO_DATABASE_URL is required');
}

const client = createClient({ url, authToken });
const isRemoteLibsql = !String(url).startsWith('file:');

async function ensureMigrationsTable() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      "id" integer PRIMARY KEY AUTOINCREMENT,
      "hash" text NOT NULL,
      "created_at" numeric
    )
  `);
}

async function getAppliedMigrationHashes() {
  await ensureMigrationsTable();
  const result = await client.execute('SELECT hash FROM "__drizzle_migrations"');
  return new Set(result.rows.map((row) => String(readRowValue(row, 'hash') ?? '')));
}

async function recordMigration(name) {
  if (dryRun) return;
  await client.execute({
    sql: 'INSERT INTO "__drizzle_migrations" ("hash", "created_at") VALUES (?, ?)',
    args: [name, Date.now()],
  });
}

async function executeStatements(statements, tag) {
  if (statements.length === 0) {
    throw new Error(`Migration ${tag} has no executable SQL statements`);
  }

  for (let index = 0; index < statements.length; index += 1) {
    const statement = statements[index];
    if (isRemoteLibsql && /^PRAGMA\s+legacy_alter_table\s*=/i.test(statement)) {
      console.log(`  Skipping unsupported LibSQL statement in ${tag}: ${statement}`);
      continue;
    }
    if (dryRun) {
      console.log(`  [dry-run] ${tag} statement ${index + 1}/${statements.length}`);
      continue;
    }
    try {
      await client.execute(statement);
    } catch (error) {
      if (isIndexAlreadyExistsError(error, statement)) {
        console.log(`  Skipping existing index during ${tag}: ${statement}`);
        continue;
      }
      throw error;
    }
  }
}

async function getBrokenFkReferences() {
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle_%'"
  );

  const broken = [];
  for (const row of tables.rows) {
    const tableName = String(readRowValue(row, 'name') ?? '');
    const fks = await client.execute(`PRAGMA foreign_key_list("${tableName}")`);
    for (const fk of fks.rows) {
      const referencedTable = String(readRowValue(fk, 'table', 2) ?? '');
      if (referencedTable.includes('__old') || referencedTable.includes('__new')) {
        broken.push(`${tableName} -> ${referencedTable}`);
      }
    }
  }

  return broken;
}

async function getTableCreateSql(tableName) {
  const result = await client.execute({
    sql: "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
    args: [tableName],
  });
  const row = result.rows[0];
  const sqlText = readRowValue(row, 'sql');
  if (!sqlText) {
    throw new Error(`Could not find CREATE TABLE SQL for ${tableName}`);
  }
  return String(sqlText);
}

async function getIndexCreateSqls(tableName) {
  const result = await client.execute({
    sql: "SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND sql IS NOT NULL",
    args: [tableName],
  });
  return result.rows
    .map((row) => readRowValue(row, 'sql'))
    .filter(Boolean)
    .map((sqlText) => String(sqlText));
}

function rewriteCreateTableSql(createSql, repairedTableName) {
  const rewrittenTable = createSql.replace(
    /(CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?)(["`]?)([^"`\s(]+)\2/i,
    `$1"${repairedTableName}"`
  );

  return rewrittenTable.replace(/(["`])__(old|new)_([^"`]+)\1/g, (_match, quote, _kind, table) => {
    return `${quote}${table}${quote}`;
  });
}

function extractBrokenTables(brokenRefs) {
  return Array.from(new Set(brokenRefs.map((entry) => entry.split(' -> ')[0]).filter(Boolean)));
}

async function repairBrokenForeignKeyTables() {
  const brokenRefs = await getBrokenFkReferences();
  const brokenTables = extractBrokenTables(brokenRefs);
  if (brokenTables.length === 0) return [];

  console.log(`Repairing broken FK tables: ${brokenTables.join(', ')}`);
  if (!dryRun) {
    await client.execute('PRAGMA foreign_keys=OFF');
  }

  const repaired = [];
  for (const tableName of brokenTables) {
    const tempTableName = `__repair_${tableName}`;
    const createSql = await getTableCreateSql(tableName);
    const indexSqls = await getIndexCreateSqls(tableName);
    const repairedCreateSql = rewriteCreateTableSql(createSql, tempTableName);

    if (dryRun) {
      console.log(`  [dry-run] would rebuild ${tableName}`);
      repaired.push(tableName);
      continue;
    }

    await client.execute(`DROP TABLE IF EXISTS "${tempTableName}"`);
    await client.execute(repairedCreateSql);
    await client.execute(`INSERT INTO "${tempTableName}" SELECT * FROM "${tableName}"`);
    await client.execute(`DROP TABLE "${tableName}"`);
    await client.execute(`ALTER TABLE "${tempTableName}" RENAME TO "${tableName}"`);
    for (const indexSql of indexSqls) {
      try {
        await client.execute(indexSql);
      } catch (error) {
        if (isIndexAlreadyExistsError(error, indexSql)) continue;
        throw error;
      }
    }
    repaired.push(tableName);
  }

  if (!dryRun) {
    await client.execute('PRAGMA foreign_keys=ON');
  }

  return repaired;
}

async function runLegacyBrokenFkRepair(applied) {
  const legacyTag = '0010_fix_broken_fk_references';
  const broken = await getBrokenFkReferences();
  if (applied.has(legacyTag) && broken.length === 0) {
    return false;
  }

  if (broken.length === 0 && !applied.has(legacyTag)) {
    console.log(`Legacy migration ${legacyTag} is not recorded, but FK metadata is clean. Skipping repair.`);
    return false;
  }

  console.log(`Running legacy FK repair ${legacyTag}...`);
  if (broken.length > 0) {
    console.log(`  Broken FK refs detected: ${broken.join(', ')}`);
  }

  const statements = [
    'PRAGMA foreign_keys=OFF',
    'DROP TABLE IF EXISTS email_job_items',
    `
      CREATE TABLE "email_job_items" (
        "id" text PRIMARY KEY NOT NULL,
        "job_id" text NOT NULL,
        "campaign_id" text NOT NULL,
        "recipient_id" text NOT NULL,
        "status" text DEFAULT 'pending' NOT NULL,
        "sent_at" integer,
        "error_message" text,
        "created_at" integer NOT NULL,
        "updated_at" integer NOT NULL,
        "customer_id" text,
        "email" text,
        FOREIGN KEY ("job_id") REFERENCES "email_jobs"("id") ON UPDATE no action ON DELETE cascade,
        FOREIGN KEY ("campaign_id") REFERENCES "email_campaigns"("id") ON UPDATE no action ON DELETE cascade,
        FOREIGN KEY ("recipient_id") REFERENCES "campaign_recipients"("id") ON UPDATE no action ON DELETE cascade
      )
    `,
    'CREATE INDEX IF NOT EXISTS "email_job_items_job_idx" ON "email_job_items" ("job_id")',
    'CREATE INDEX IF NOT EXISTS "email_job_items_campaign_idx" ON "email_job_items" ("campaign_id")',
    'DROP TABLE IF EXISTS email_delivery_events',
    `
      CREATE TABLE "email_delivery_events" (
        "id" text PRIMARY KEY NOT NULL,
        "org_id" text NOT NULL,
        "campaign_id" text NOT NULL,
        "recipient_id" text NOT NULL,
        "event_type" text NOT NULL,
        "event_category" text NOT NULL,
        "failure_reason" text,
        "smtp_code" integer,
        "smtp_message" text,
        "diagnostic_code" text,
        "bounce_type" text,
        "bounce_subtype" text,
        "attempt_number" integer DEFAULT 1,
        "next_retry_at" integer,
        "retry_eligible" integer DEFAULT 0,
        "email_address" text NOT NULL,
        "domain" text,
        "mx_valid" integer,
        "dns_checked_at" integer,
        "occurred_at" integer NOT NULL,
        "created_at" integer NOT NULL,
        FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
        FOREIGN KEY ("campaign_id") REFERENCES "email_campaigns"("id") ON DELETE CASCADE,
        FOREIGN KEY ("recipient_id") REFERENCES "campaign_recipients"("id") ON DELETE CASCADE
      )
    `,
    'DROP TABLE IF EXISTS "__new_email_tracking"',
    `
      CREATE TABLE "__new_email_tracking" (
        "id" text PRIMARY KEY NOT NULL,
        "campaign_id" text NOT NULL,
        "recipient_id" text NOT NULL,
        "type" text NOT NULL,
        "link_url" text,
        "ip_address" text,
        "user_agent" text,
        "created_at" integer NOT NULL,
        FOREIGN KEY ("campaign_id") REFERENCES "email_campaigns"("id") ON UPDATE no action ON DELETE cascade,
        FOREIGN KEY ("recipient_id") REFERENCES "campaign_recipients"("id") ON UPDATE no action ON DELETE cascade
      )
    `,
    `
      INSERT INTO "__new_email_tracking"
      SELECT "id", "campaign_id", "recipient_id", "type", "link_url", "ip_address", "user_agent", "created_at"
      FROM "email_tracking"
    `,
    'DROP TABLE "email_tracking"',
    'ALTER TABLE "__new_email_tracking" RENAME TO "email_tracking"',
    'CREATE INDEX IF NOT EXISTS "tracking_campaign_type_idx" ON "email_tracking" ("campaign_id", "type")',
    'PRAGMA foreign_keys=ON',
  ];

  await executeStatements(statements, legacyTag);
  if (!applied.has(legacyTag)) {
    await recordMigration(legacyTag);
    applied.add(legacyTag);
  }
  console.log(`  Legacy FK repair ${legacyTag} completed.`);
  return true;
}

async function applyPendingDrizzleMigrations(applied) {
  const entries = getLocalJournalEntries();
  const pending = entries.filter((entry) => !applied.has(entry.tag));

  console.log(`Local journal migrations: ${entries.length}`);
  console.log(`Pending migrations: ${pending.length ? pending.map((entry) => entry.tag).join(', ') : 'none'}`);

  for (const entry of pending) {
    if (!existsSync(entry.sqlPath)) {
      throw new Error(`Missing SQL file for ${entry.tag}: ${entry.sqlPath}`);
    }

    console.log(`Applying ${entry.tag}...`);
    const statements = splitSqlStatements(readFileSync(entry.sqlPath, 'utf8'));
    await executeStatements(statements, entry.tag);
    await recordMigration(entry.tag);
    applied.add(entry.tag);
    console.log(dryRun ? `  [dry-run] ${entry.tag} would be recorded.` : `  ${entry.tag} recorded.`);
  }
}

async function verifyRequiredTags(applied) {
  const requiredTags = getLocalJournalEntries().map((entry) => entry.tag);
  const missing = requiredTags.filter((tag) => !applied.has(tag));
  if (missing.length > 0) {
    throw new Error(`Missing recorded migrations after apply: ${missing.join(', ')}`);
  }
}

async function verifySchemaHardening() {
  const result = await client.execute(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'index'
      AND name IN (
        'customers_org_email_uidx',
        'leads_org_email_uidx',
        'tags_org_name_uidx',
        'customer_tag_uidx',
        'custom_values_customer_field_uidx',
        'segments_org_name_uidx',
        'templates_org_name_uidx',
        'signatures_org_name_uidx',
        'gmail_credentials_org_email_uidx'
      )
  `);

  const names = new Set(result.rows.map((row) => String(readRowValue(row, 'name') ?? '')));
  const requiredIndexes = [
    'customers_org_email_uidx',
    'leads_org_email_uidx',
    'tags_org_name_uidx',
    'customer_tag_uidx',
    'custom_values_customer_field_uidx',
    'segments_org_name_uidx',
    'templates_org_name_uidx',
    'signatures_org_name_uidx',
    'gmail_credentials_org_email_uidx',
  ];

  const missing = requiredIndexes.filter((name) => !names.has(name));
  if (missing.length > 0) {
    throw new Error(`Schema hardening verification failed. Missing indexes: ${missing.join(', ')}`);
  }
}

async function main() {
  console.log(`Connecting to ${url}`);
  console.log(dryRun ? 'Mode: dry-run' : 'Mode: apply');

  const applied = await getAppliedMigrationHashes();
  console.log(`Already recorded migrations: ${applied.size}`);

  await runLegacyBrokenFkRepair(applied);
  await applyPendingDrizzleMigrations(applied);
  const repairedTables = await repairBrokenForeignKeyTables();

  if (dryRun) {
    if (repairedTables.length > 0) {
      console.log(`Dry-run FK repair targets: ${repairedTables.join(', ')}`);
    }
    console.log('Dry-run complete. No SQL statements were executed.');
    return;
  }

  const broken = await getBrokenFkReferences();
  if (broken.length > 0) {
    throw new Error(`Broken FK references remain:\n  ${broken.join('\n  ')}`);
  }

  await verifyRequiredTags(applied);
  await verifySchemaHardening();

  console.log('Verification complete: no broken FK references, all journal migrations recorded, hardening indexes present.');
}

main().catch((error) => {
  console.error('FATAL:', error instanceof Error ? error.message : error);
  process.exit(1);
});
