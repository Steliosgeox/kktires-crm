import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function fixUsersTable() {
  console.log('Fixing users table for NextAuth compatibility...');

  // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
  // First, disable foreign keys temporarily
  await client.execute('PRAGMA foreign_keys = OFF');
  console.log('✓ Disabled foreign keys');

  // Create new users table with correct schema
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users_new (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT NOT NULL UNIQUE,
      emailVerified INTEGER,
      image TEXT,
      avatar TEXT,
      password_hash TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `);
  console.log('✓ Created new users table');

  // Copy data from old table if it exists
  try {
    await client.execute(`
      INSERT INTO users_new (id, name, email, emailVerified, image, avatar, password_hash, created_at, updated_at)
      SELECT id, name, email, emailVerified, image, avatar, password_hash, created_at, updated_at
      FROM users
    `);
    console.log('✓ Copied data from old users table');
  } catch (e) {
    console.log('⚠ No data to copy or columns mismatch');
  }

  // Drop old table and rename new one
  try {
    await client.execute('DROP TABLE users');
    console.log('✓ Dropped old users table');
  } catch (e) {
    console.log('⚠ Could not drop old users table:', e);
  }

  await client.execute('ALTER TABLE users_new RENAME TO users');
  console.log('✓ Renamed new table to users');

  // Re-enable foreign keys
  await client.execute('PRAGMA foreign_keys = ON');
  console.log('✓ Re-enabled foreign keys');

  // Recreate accounts table
  await client.execute('DROP TABLE IF EXISTS accounts');
  await client.execute(`
    CREATE TABLE accounts (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      providerAccountId TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT
    )
  `);
  console.log('✓ Created accounts table');

  // Recreate sessions table
  await client.execute('DROP TABLE IF EXISTS sessions');
  await client.execute(`
    CREATE TABLE sessions (
      sessionToken TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires INTEGER NOT NULL
    )
  `);
  console.log('✓ Created sessions table');

  // Recreate verification_tokens table
  await client.execute('DROP TABLE IF EXISTS verification_tokens');
  await client.execute(`
    CREATE TABLE verification_tokens (
      identifier TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires INTEGER NOT NULL
    )
  `);
  console.log('✓ Created verification_tokens table');

  console.log('\n✅ Users table fixed! NextAuth should now work.');
}

fixUsersTable().catch(console.error);

