import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// #region agent log
const debugLog = (location: string, message: string, data: Record<string, unknown>, hypothesisId: string) => {
  fetch('http://127.0.0.1:7242/ingest/2e146d35-fb58-447a-b3a0-2eabdca19cf2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location,message,data,timestamp:Date.now(),sessionId:'debug-session',hypothesisId})}).catch(()=>{});
};
// #endregion

// #region agent log
debugLog('lib/db/index.ts:init', 'Initializing database client', {
  hasUrl: !!process.env.TURSO_DATABASE_URL,
  hasToken: !!process.env.TURSO_AUTH_TOKEN,
  urlPrefix: process.env.TURSO_DATABASE_URL?.substring(0, 30),
}, 'H1');
// #endregion

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const db = drizzle(client, { schema });

export type Database = typeof db;

// Re-export schema for convenience
export * from './schema';
