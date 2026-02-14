/**
 * Auto-heal: detect and fix schema drift at runtime.
 *
 * When Drizzle ORM generates SQL referencing columns the production DB doesn't
 * have yet (because migrations haven't been run), this module inspects the live
 * table via PRAGMA table_info and issues ALTER TABLE statements to add the
 * missing columns on the fly.
 *
 * This is a safety-net — the canonical fix is to run `npm run db:migrate` so the
 * DB matches the Drizzle schema. But this prevents hard failures in production
 * while the operator catches up.
 */

import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

// ── Error helpers (shared across campaign routes) ────────────────────────────

/** Extract the full error text including DrizzleQueryError's `.cause`. */
export function getErrorMessages(error: unknown): string {
  const parts: string[] = [];
  if (error instanceof Error) {
    parts.push(error.message);
    if (error.cause instanceof Error) parts.push(error.cause.message);
    else if (error.cause) parts.push(String(error.cause));
  } else {
    parts.push(String(error ?? ''));
  }
  return parts.join(' | ');
}

export function isMissingColumnError(error: unknown, columnName: string): boolean {
  const message = getErrorMessages(error);
  return (
    (/no such column/i.test(message) || /has no column named/i.test(message)) &&
    message.toLowerCase().includes(columnName.toLowerCase())
  );
}

export function isMissingColumnErrorAny(error: unknown): boolean {
  const message = getErrorMessages(error);
  return /no such column/i.test(message) || /has no column named/i.test(message);
}

export function isForeignKeyError(error: unknown): boolean {
  const message = getErrorMessages(error);
  return /foreign key/i.test(message);
}

export function isMissingTableError(error: unknown): boolean {
  const message = getErrorMessages(error);
  return /no such table/i.test(message);
}

export function isSchemaError(error: unknown): boolean {
  return isMissingColumnErrorAny(error) || isMissingTableError(error) || isForeignKeyError(error);
}

// ── Column definitions expected by the Drizzle schema ────────────────────────

interface ColumnDef {
  name: string;
  type: string;
  defaultValue?: string; // SQL literal, e.g. "'draft'", "0"
}

/** All columns the Drizzle schema defines for email_campaigns. */
const EMAIL_CAMPAIGNS_COLUMNS: ColumnDef[] = [
  { name: 'id', type: 'text' },
  { name: 'org_id', type: 'text' },
  { name: 'name', type: 'text' },
  { name: 'subject', type: 'text' },
  { name: 'content', type: 'text' },
  { name: 'template_id', type: 'text' },
  { name: 'signature_id', type: 'text' },
  { name: 'status', type: 'text', defaultValue: "'draft'" },
  { name: 'from_email', type: 'text' },
  { name: 'gmail_credential_id', type: 'text' },
  { name: 'recipient_filters', type: 'text' },
  { name: 'scheduled_at', type: 'integer' },
  { name: 'sent_at', type: 'integer' },
  { name: 'total_recipients', type: 'integer', defaultValue: '0' },
  { name: 'sent_count', type: 'integer', defaultValue: '0' },
  { name: 'open_count', type: 'integer', defaultValue: '0' },
  { name: 'click_count', type: 'integer', defaultValue: '0' },
  { name: 'bounce_count', type: 'integer', defaultValue: '0' },
  { name: 'unsubscribe_count', type: 'integer', defaultValue: '0' },
  { name: 'created_by', type: 'text' },
  { name: 'created_at', type: 'integer' },
  { name: 'updated_at', type: 'integer' },
];

const EMAIL_SIGNATURES_COLUMNS: ColumnDef[] = [
  { name: 'id', type: 'text' },
  { name: 'org_id', type: 'text' },
  { name: 'name', type: 'text' },
  { name: 'content', type: 'text' },
  { name: 'is_default', type: 'integer', defaultValue: '0' },
  { name: 'created_by', type: 'text' },
  { name: 'created_at', type: 'integer' },
  { name: 'updated_at', type: 'integer' },
];

const EMAIL_ASSETS_COLUMNS: ColumnDef[] = [
  { name: 'id', type: 'text' },
  { name: 'org_id', type: 'text' },
  { name: 'uploader_user_id', type: 'text' },
  { name: 'blob_url', type: 'text' },
  { name: 'blob_path', type: 'text' },
  { name: 'file_name', type: 'text' },
  { name: 'mime_type', type: 'text' },
  { name: 'size_bytes', type: 'integer' },
  { name: 'kind', type: 'text' },
  { name: 'width', type: 'integer' },
  { name: 'height', type: 'integer' },
  { name: 'sha256', type: 'text' },
  { name: 'created_at', type: 'integer' },
  { name: 'updated_at', type: 'integer' },
  { name: 'deleted_at', type: 'integer' },
];

const CAMPAIGN_ASSETS_COLUMNS: ColumnDef[] = [
  { name: 'id', type: 'text' },
  { name: 'campaign_id', type: 'text' },
  { name: 'asset_id', type: 'text' },
  { name: 'role', type: 'text' },
  { name: 'embed_inline', type: 'integer', defaultValue: '0' },
  { name: 'display_width_px', type: 'integer' },
  { name: 'align', type: 'text' },
  { name: 'alt_text', type: 'text' },
  { name: 'sort_order', type: 'integer', defaultValue: '0' },
  { name: 'created_at', type: 'integer' },
  { name: 'updated_at', type: 'integer' },
];

// ── Runtime heal logic ───────────────────────────────────────────────────────

interface PragmaRow {
  name: string;
}

async function getExistingColumns(tableName: string): Promise<Set<string>> {
  try {
    const rows = await db.all<PragmaRow>(sql.raw(`PRAGMA table_info('${tableName}')`));
    return new Set(rows.map((r) => r.name));
  } catch {
    return new Set();
  }
}

async function tableExists(tableName: string): Promise<boolean> {
  const cols = await getExistingColumns(tableName);
  return cols.size > 0;
}

async function addMissingColumns(tableName: string, expected: ColumnDef[]): Promise<string[]> {
  const existing = await getExistingColumns(tableName);
  const added: string[] = [];
  for (const col of expected) {
    if (existing.has(col.name)) continue;
    let stmt = `ALTER TABLE \`${tableName}\` ADD COLUMN \`${col.name}\` ${col.type}`;
    if (col.defaultValue !== undefined) stmt += ` DEFAULT ${col.defaultValue}`;
    try {
      await db.run(sql.raw(stmt));
      added.push(col.name);
    } catch (e) {
      // Column might have been added by a concurrent request — that's fine.
      console.warn(`[auto-heal] Failed to add ${tableName}.${col.name}:`, e);
    }
  }
  return added;
}

function buildCreateTable(tableName: string, columns: ColumnDef[]): string {
  const colDefs = columns.map((col) => {
    let d = `\`${col.name}\` ${col.type}`;
    if (col.defaultValue !== undefined) d += ` DEFAULT ${col.defaultValue}`;
    return d;
  });
  colDefs.push('PRIMARY KEY (`id`)');
  return `CREATE TABLE IF NOT EXISTS \`${tableName}\` (\n  ${colDefs.join(',\n  ')}\n)`;
}

async function ensureTable(tableName: string, columns: ColumnDef[]): Promise<string[]> {
  const exists = await tableExists(tableName);
  if (!exists) {
    try {
      await db.run(sql.raw(buildCreateTable(tableName, columns)));
      return [`CREATED TABLE ${tableName}`];
    } catch (e) {
      console.warn(`[auto-heal] Failed to create ${tableName}:`, e);
      return [];
    }
  }
  const added = await addMissingColumns(tableName, columns);
  return added.map((c) => `${tableName}.${c}`);
}

/**
 * Heal schema drift for email-campaign-related tables.
 * Returns a list of human-readable actions taken (empty if nothing was needed).
 *
 * Safe to call repeatedly — all operations are idempotent.
 */
export async function healEmailCampaignSchema(): Promise<string[]> {
  const actions: string[] = [];

  // email_signatures must exist before email_campaigns can FK to it
  actions.push(...await ensureTable('email_signatures', EMAIL_SIGNATURES_COLUMNS));

  // email_campaigns — add any missing columns
  actions.push(...await addMissingColumns('email_campaigns', EMAIL_CAMPAIGNS_COLUMNS));

  // email_assets + campaign_assets
  actions.push(...await ensureTable('email_assets', EMAIL_ASSETS_COLUMNS));
  actions.push(...await ensureTable('campaign_assets', CAMPAIGN_ASSETS_COLUMNS));

  if (actions.length > 0) {
    console.log('[auto-heal] Schema repaired:', actions);
  }

  return actions;
}

// ── camelCase → snake_case key map ───────────────────────────────────────────

const INSERT_KEY_MAP: Record<string, string> = {
  id: 'id',
  orgId: 'org_id',
  name: 'name',
  subject: 'subject',
  content: 'content',
  templateId: 'template_id',
  signatureId: 'signature_id',
  status: 'status',
  fromEmail: 'from_email',
  gmailCredentialId: 'gmail_credential_id',
  recipientFilters: 'recipient_filters',
  scheduledAt: 'scheduled_at',
  sentAt: 'sent_at',
  totalRecipients: 'total_recipients',
  sentCount: 'sent_count',
  openCount: 'open_count',
  clickCount: 'click_count',
  bounceCount: 'bounce_count',
  unsubscribeCount: 'unsubscribe_count',
  createdBy: 'created_by',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

const UPDATE_KEY_MAP: Record<string, string> = {
  name: 'name',
  subject: 'subject',
  content: 'content',
  templateId: 'template_id',
  signatureId: 'signature_id',
  status: 'status',
  fromEmail: 'from_email',
  gmailCredentialId: 'gmail_credential_id',
  recipientFilters: 'recipient_filters',
  scheduledAt: 'scheduled_at',
  sentAt: 'sent_at',
  totalRecipients: 'total_recipients',
  sentCount: 'sent_count',
  openCount: 'open_count',
  clickCount: 'click_count',
  bounceCount: 'bounce_count',
  unsubscribeCount: 'unsubscribe_count',
  createdBy: 'created_by',
  updatedAt: 'updated_at',
};

/** Serialize a JS value for SQLite binding. */
function serializeValue(val: unknown): unknown {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return Math.floor(val.getTime() / 1000);
  if (typeof val === 'object') return JSON.stringify(val);
  return val;
}

/**
 * Build a raw-SQL INSERT for email_campaigns using only columns that actually
 * exist in the live database. This bypasses Drizzle's schema-based column
 * generation and is used as a last-resort fallback.
 *
 * Uses Drizzle's `sql` tagged template for proper parameterized queries.
 */
export async function rawInsertCampaign(
  values: Record<string, unknown>
): Promise<void> {
  const existing = await getExistingColumns('email_campaigns');
  if (existing.size === 0) throw new Error('email_campaigns table does not exist');

  const cols: string[] = [];
  const boundValues: unknown[] = [];

  for (const [jsKey, sqlCol] of Object.entries(INSERT_KEY_MAP)) {
    if (!existing.has(sqlCol)) continue; // skip columns missing from DB
    if (!(jsKey in values)) continue; // skip keys not provided

    cols.push(`\`${sqlCol}\``);
    boundValues.push(serializeValue(values[jsKey]));
  }

  if (cols.length === 0) throw new Error('No valid columns to insert');

  // Build a parameterized query using Drizzle's sql tagged template.
  // We dynamically construct: INSERT INTO `email_campaigns` (col1, col2, ...) VALUES (?, ?, ...)
  // by joining raw SQL fragments with parameter bindings.
  const columnList = sql.raw(cols.join(', '));
  const placeholders = sql.join(
    boundValues.map((v) => sql`${v}`),
    sql.raw(', ')
  );

  await db.run(sql`INSERT INTO \`email_campaigns\` (${columnList}) VALUES (${placeholders})`);
}

/**
 * Build a raw-SQL UPDATE for email_campaigns using only columns that actually
 * exist in the live database. Used as a last-resort fallback.
 *
 * Uses Drizzle's `sql` tagged template for proper parameterized queries.
 */
export async function rawUpdateCampaign(
  campaignId: string,
  orgId: string,
  values: Record<string, unknown>
): Promise<void> {
  const existing = await getExistingColumns('email_campaigns');
  if (existing.size === 0) throw new Error('email_campaigns table does not exist');

  const setClauses: ReturnType<typeof sql>[] = [];

  for (const [jsKey, sqlCol] of Object.entries(UPDATE_KEY_MAP)) {
    if (!existing.has(sqlCol)) continue;
    if (!(jsKey in values)) continue;

    const v = serializeValue(values[jsKey]);
    setClauses.push(sql`${sql.raw(`\`${sqlCol}\``)} = ${v}`);
  }

  if (setClauses.length === 0) return; // nothing to update

  const setClause = sql.join(setClauses, sql.raw(', '));
  await db.run(
    sql`UPDATE \`email_campaigns\` SET ${setClause} WHERE \`id\` = ${campaignId} AND \`org_id\` = ${orgId}`
  );
}
