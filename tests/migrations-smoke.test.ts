import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import * as schema from '../src/lib/db/schema';

let client: Client;
let db: LibSQLDatabase<typeof schema>;

async function getObjectNamesByType(
  type: 'table' | 'view' | 'index'
): Promise<Set<string>> {
  const result = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type = ?",
    args: [type],
  });
  return new Set(result.rows.map((row) => String(row.name)));
}

async function getTableColumns(tableName: string): Promise<Set<string>> {
  const result = await client.execute(`PRAGMA table_info('${tableName}')`);
  return new Set(result.rows.map((row) => String(row.name)));
}

describe('migrations smoke test', () => {
  beforeAll(async () => {
    const dbDir = path.join('tests', '.tmp');
    const dbFile = path.join(dbDir, 'migrations-smoke.db');
    const url = 'file:./tests/.tmp/migrations-smoke.db';

    await mkdir(dbDir, { recursive: true });
    await rm(dbFile, { force: true });

    client = createClient({ url });
    db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  });

  afterAll(async () => {
    try {
      await client?.close?.();
    } catch {
      // ignore
    }
  });

  it('applies deliverability and performance migrations fully', async () => {
    const campaignRecipientColumns = await getTableColumns('campaign_recipients');
    for (const column of [
      'failure_category',
      'failure_reason_detailed',
      'bounce_type',
      'attempt_count',
      'last_attempt_at',
      'next_retry_at',
      'mx_valid',
      'dns_checked_at',
      'email_normalized',
      'domain',
    ]) {
      expect(campaignRecipientColumns.has(column)).toBe(true);
    }

    const tableNames = await getObjectNamesByType('table');
    for (const tableName of [
      'email_delivery_events',
      'email_suppressions',
      'email_validation_cache',
      'email_retry_config',
    ]) {
      expect(tableNames.has(tableName)).toBe(true);
    }

    const viewNames = await getObjectNamesByType('view');
    for (const viewName of [
      'v_recipients_retry_eligible',
      'v_campaign_delivery_stats',
      'v_domain_health',
      'v_org_health',
      'v_recent_activity',
    ]) {
      expect(viewNames.has(viewName)).toBe(true);
    }

    const indexNames = await getObjectNamesByType('index');
    for (const indexName of [
      'idx_customers_name_search',
      'idx_recipients_campaign_status',
      'idx_delivery_events_campaign',
    ]) {
      expect(indexNames.has(indexName)).toBe(true);
    }
  });
});
