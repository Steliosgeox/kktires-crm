import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = createClient({
  url: DATABASE_URL,
  authToken: DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

export type Database = typeof db;

// Re-export schema for convenience
export * from './schema';
