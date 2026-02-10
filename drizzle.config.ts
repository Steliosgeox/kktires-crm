import 'dotenv/config';
import type { Config } from 'drizzle-kit';

const DATABASE_URL = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const dialect = DATABASE_URL.startsWith('file:') ? 'sqlite' : 'turso';

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect,
  dbCredentials: {
    url: DATABASE_URL,
    authToken: DATABASE_AUTH_TOKEN,
  },
} satisfies Config;
