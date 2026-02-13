import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalTursoDatabaseUrl = process.env.TURSO_DATABASE_URL;
const originalDatabaseAuthToken = process.env.DATABASE_AUTH_TOKEN;
const originalTursoAuthToken = process.env.TURSO_AUTH_TOKEN;

function clearDatabaseEnv() {
  delete process.env.DATABASE_URL;
  delete process.env.TURSO_DATABASE_URL;
  delete process.env.DATABASE_AUTH_TOKEN;
  delete process.env.TURSO_AUTH_TOKEN;
}

function restoreDatabaseEnv() {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;

  if (originalTursoDatabaseUrl === undefined) delete process.env.TURSO_DATABASE_URL;
  else process.env.TURSO_DATABASE_URL = originalTursoDatabaseUrl;

  if (originalDatabaseAuthToken === undefined) delete process.env.DATABASE_AUTH_TOKEN;
  else process.env.DATABASE_AUTH_TOKEN = originalDatabaseAuthToken;

  if (originalTursoAuthToken === undefined) delete process.env.TURSO_AUTH_TOKEN;
  else process.env.TURSO_AUTH_TOKEN = originalTursoAuthToken;
}

describe('runtime configuration guards', () => {
  beforeEach(() => {
    clearDatabaseEnv();
    vi.resetModules();
  });

  afterEach(() => {
    restoreDatabaseEnv();
    vi.resetModules();
  });

  it('imports db module without DATABASE_URL', async () => {
    const { db, isDatabaseConfigured } = await import('@/lib/db');
    expect(isDatabaseConfigured).toBe(false);
    const select = (db as unknown as { select: () => unknown }).select;
    expect(() => select()).toThrow('DATABASE_URL environment variable is required');
  });
});
