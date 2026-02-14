import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { createRequestId, jsonError } from '@/server/api/http';
import { hasRole, requireSession } from '@/server/authz';

// ---------------------------------------------------------------------------
// Runtime schema-repair endpoint.
//
// Compares the live Turso/SQLite database against the columns and tables the
// Drizzle schema expects, and issues non-destructive ALTER TABLE / CREATE TABLE
// statements to bring the DB up-to-date.
//
// Auth: HEALTHCHECK_SECRET bearer token  **or**  owner/admin session.
// ---------------------------------------------------------------------------

function isAuthorizedBySecret(request: Request): boolean {
  const secret = process.env.HEALTHCHECK_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

/** Describe a column we expect to exist. */
interface ExpectedColumn {
  name: string; // SQL column name (snake_case)
  type: string; // e.g. "text", "integer"
  notNull?: boolean;
  defaultValue?: string; // literal SQL default (e.g. "'draft'", "0")
  /** FK clause – only used in CREATE TABLE, not ALTER TABLE ADD COLUMN (SQLite limitation). */
  references?: string;
}

/** Describe a table we expect to exist. */
interface ExpectedTable {
  table: string;
  columns: ExpectedColumn[];
  /** Extra clauses like FOREIGN KEYs for CREATE TABLE. */
  extra?: string[];
}

// ------------------------------------------------------------------
// Expected schema (only the pieces that have been problematic).
// ------------------------------------------------------------------

const EMAIL_CAMPAIGNS_COLUMNS: ExpectedColumn[] = [
  { name: 'id', type: 'text', notNull: true },
  { name: 'org_id', type: 'text', notNull: true },
  { name: 'name', type: 'text', notNull: true },
  { name: 'subject', type: 'text', notNull: true },
  { name: 'content', type: 'text', notNull: true },
  { name: 'template_id', type: 'text' },
  { name: 'signature_id', type: 'text' },
  { name: 'status', type: 'text', notNull: true, defaultValue: "'draft'" },
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
  { name: 'created_at', type: 'integer', notNull: true },
  { name: 'updated_at', type: 'integer', notNull: true },
];

const CUSTOMERS_COLUMNS: ExpectedColumn[] = [
  { name: 'unsubscribed', type: 'integer', defaultValue: '0' },
];

const EXPECTED_TABLES: ExpectedTable[] = [
  {
    table: 'email_signatures',
    columns: [
      { name: 'id', type: 'text', notNull: true },
      { name: 'org_id', type: 'text', notNull: true },
      { name: 'name', type: 'text', notNull: true },
      { name: 'content', type: 'text', notNull: true },
      { name: 'is_default', type: 'integer', defaultValue: '0' },
      { name: 'created_by', type: 'text' },
      { name: 'created_at', type: 'integer', notNull: true },
      { name: 'updated_at', type: 'integer', notNull: true },
    ],
    extra: [
      'PRIMARY KEY (`id`)',
    ],
  },
  {
    table: 'email_assets',
    columns: [
      { name: 'id', type: 'text', notNull: true },
      { name: 'org_id', type: 'text', notNull: true },
      { name: 'uploader_user_id', type: 'text', notNull: true },
      { name: 'blob_url', type: 'text', notNull: true },
      { name: 'blob_path', type: 'text', notNull: true },
      { name: 'file_name', type: 'text', notNull: true },
      { name: 'mime_type', type: 'text', notNull: true },
      { name: 'size_bytes', type: 'integer', notNull: true },
      { name: 'kind', type: 'text', notNull: true },
      { name: 'width', type: 'integer' },
      { name: 'height', type: 'integer' },
      { name: 'sha256', type: 'text', notNull: true },
      { name: 'created_at', type: 'integer', notNull: true },
      { name: 'updated_at', type: 'integer', notNull: true },
      { name: 'deleted_at', type: 'integer' },
    ],
    extra: [
      'PRIMARY KEY (`id`)',
    ],
  },
  {
    table: 'campaign_assets',
    columns: [
      { name: 'id', type: 'text', notNull: true },
      { name: 'campaign_id', type: 'text', notNull: true },
      { name: 'asset_id', type: 'text', notNull: true },
      { name: 'role', type: 'text', notNull: true },
      { name: 'embed_inline', type: 'integer', notNull: true, defaultValue: '0' },
      { name: 'display_width_px', type: 'integer' },
      { name: 'align', type: 'text' },
      { name: 'alt_text', type: 'text' },
      { name: 'sort_order', type: 'integer', notNull: true, defaultValue: '0' },
      { name: 'created_at', type: 'integer', notNull: true },
      { name: 'updated_at', type: 'integer', notNull: true },
    ],
    extra: [
      'PRIMARY KEY (`id`)',
    ],
  },
  {
    table: 'email_jobs',
    columns: [
      { name: 'id', type: 'text', notNull: true },
      { name: 'org_id', type: 'text', notNull: true },
      { name: 'campaign_id', type: 'text', notNull: true },
      { name: 'sender_user_id', type: 'text', notNull: true },
      { name: 'status', type: 'text', notNull: true, defaultValue: "'queued'" },
      { name: 'run_at', type: 'integer', notNull: true },
      { name: 'attempts', type: 'integer', notNull: true, defaultValue: '0' },
      { name: 'max_attempts', type: 'integer', notNull: true, defaultValue: '3' },
      { name: 'last_error', type: 'text' },
      { name: 'processed_count', type: 'integer', notNull: true, defaultValue: '0' },
      { name: 'total_count', type: 'integer', notNull: true, defaultValue: '0' },
      { name: 'created_at', type: 'integer', notNull: true },
      { name: 'updated_at', type: 'integer', notNull: true },
    ],
    extra: [
      'PRIMARY KEY (`id`)',
    ],
  },
  {
    table: 'email_job_items',
    columns: [
      { name: 'id', type: 'text', notNull: true },
      { name: 'job_id', type: 'text', notNull: true },
      { name: 'customer_id', type: 'text', notNull: true },
      { name: 'email', type: 'text', notNull: true },
      { name: 'status', type: 'text', notNull: true, defaultValue: "'pending'" },
      { name: 'sent_at', type: 'integer' },
      { name: 'error_message', type: 'text' },
    ],
    extra: [
      'PRIMARY KEY (`id`)',
    ],
  },
];

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

interface PragmaRow {
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

async function getTableColumns(tableName: string): Promise<PragmaRow[]> {
  try {
    const rows = await db.all<PragmaRow>(sql.raw(`PRAGMA table_info('${tableName}')`));
    return rows;
  } catch {
    return [];
  }
}

async function tableExists(tableName: string): Promise<boolean> {
  const cols = await getTableColumns(tableName);
  return cols.length > 0;
}

function buildAlterAdd(tableName: string, col: ExpectedColumn): string {
  let stmt = `ALTER TABLE \`${tableName}\` ADD COLUMN \`${col.name}\` ${col.type}`;
  if (col.defaultValue !== undefined) {
    stmt += ` DEFAULT ${col.defaultValue}`;
  }
  return stmt;
}

function buildCreateTable(def: ExpectedTable): string {
  const colDefs = def.columns.map((col) => {
    let d = `\`${col.name}\` ${col.type}`;
    if (col.notNull) d += ' NOT NULL';
    if (col.defaultValue !== undefined) d += ` DEFAULT ${col.defaultValue}`;
    return d;
  });
  const allDefs = [...colDefs, ...(def.extra ?? [])];
  return `CREATE TABLE IF NOT EXISTS \`${def.table}\` (\n  ${allDefs.join(',\n  ')}\n)`;
}

// ------------------------------------------------------------------
// Handler
// ------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  // Auth check
  const secretAuthorized = isAuthorizedBySecret(request);
  let roleAuthorized = false;
  if (!secretAuthorized) {
    try {
      const session = await requireSession();
      roleAuthorized = !!session && hasRole(session, ['owner', 'admin']);
    } catch {
      roleAuthorized = false;
    }
  }
  if (!secretAuthorized && !roleAuthorized) {
    return jsonError('Unauthorized', 401, 'UNAUTHORIZED', requestId);
  }

  const applied: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  try {
    // 1. Ensure missing tables exist
    for (const def of EXPECTED_TABLES) {
      const exists = await tableExists(def.table);
      if (!exists) {
        const stmt = buildCreateTable(def);
        try {
          await db.run(sql.raw(stmt));
          applied.push(`CREATE TABLE ${def.table}`);
        } catch (e) {
          errors.push(`CREATE TABLE ${def.table}: ${e instanceof Error ? e.message : String(e)}`);
        }
      } else {
        // Check for missing columns in existing table
        const existing = await getTableColumns(def.table);
        const existingNames = new Set(existing.map((r) => r.name));
        for (const col of def.columns) {
          if (!existingNames.has(col.name)) {
            const stmt = buildAlterAdd(def.table, col);
            try {
              await db.run(sql.raw(stmt));
              applied.push(`ALTER TABLE ${def.table} ADD COLUMN ${col.name}`);
            } catch (e) {
              errors.push(
                `ALTER TABLE ${def.table} ADD COLUMN ${col.name}: ${e instanceof Error ? e.message : String(e)}`
              );
            }
          } else {
            skipped.push(`${def.table}.${col.name} (exists)`);
          }
        }
      }
    }

    // 2. Ensure email_campaigns has all expected columns
    {
      const existing = await getTableColumns('email_campaigns');
      const existingNames = new Set(existing.map((r) => r.name));

      for (const col of EMAIL_CAMPAIGNS_COLUMNS) {
        if (!existingNames.has(col.name)) {
          const stmt = buildAlterAdd('email_campaigns', col);
          try {
            await db.run(sql.raw(stmt));
            applied.push(`ALTER TABLE email_campaigns ADD COLUMN ${col.name}`);
          } catch (e) {
            errors.push(
              `ALTER TABLE email_campaigns ADD COLUMN ${col.name}: ${e instanceof Error ? e.message : String(e)}`
            );
          }
        } else {
          skipped.push(`email_campaigns.${col.name} (exists)`);
        }
      }
    }

    // 3. Ensure customers.unsubscribed exists
    {
      const existing = await getTableColumns('customers');
      const existingNames = new Set(existing.map((r) => r.name));

      for (const col of CUSTOMERS_COLUMNS) {
        if (!existingNames.has(col.name)) {
          const stmt = buildAlterAdd('customers', col);
          try {
            await db.run(sql.raw(stmt));
            applied.push(`ALTER TABLE customers ADD COLUMN ${col.name}`);
          } catch (e) {
            errors.push(
              `ALTER TABLE customers ADD COLUMN ${col.name}: ${e instanceof Error ? e.message : String(e)}`
            );
          }
        } else {
          skipped.push(`customers.${col.name} (exists)`);
        }
      }
    }

    return NextResponse.json({
      requestId,
      success: errors.length === 0,
      applied,
      skipped: skipped.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error(`[db:migrate] requestId=${requestId} FATAL:`, error);
    return NextResponse.json(
      {
        requestId,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        applied,
        errors,
      },
      { status: 500 }
    );
  }
}
