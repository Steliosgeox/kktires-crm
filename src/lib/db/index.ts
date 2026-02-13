import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const DATABASE_URL = (process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || '').trim();
const DATABASE_AUTH_TOKEN = (process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || '').trim();

export const isDatabaseConfigured = DATABASE_URL.length > 0;

const configuredDb = isDatabaseConfigured
  ? drizzle(
      createClient({
        url: DATABASE_URL,
        authToken: DATABASE_AUTH_TOKEN || undefined,
      }),
      { schema }
    )
  : null;

export type Database = NonNullable<typeof configuredDb>;

function throwMissingDatabaseUrl(): never {
  throw new Error('DATABASE_URL environment variable is required');
}

const unavailableQueryProxy = new Proxy(
  {},
  {
    get() {
      return () => throwMissingDatabaseUrl();
    },
  }
);

const unavailableDb = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === 'query') return unavailableQueryProxy;
      return () => throwMissingDatabaseUrl();
    },
  }
);

export const db = (configuredDb ?? unavailableDb) as Database;

// Re-export schema for convenience
export * from './schema';
