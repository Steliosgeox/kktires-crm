import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function setupAuthTables() {
  console.log('Setting up NextAuth tables...');

  // Drop and recreate users table to fix NOT NULL constraint issue
  console.log('Recreating users table without NOT NULL on created_at...');
  
  // First backup any existing users
  try {
    await client.execute(`CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users`);
    console.log('✓ Backed up existing users');
  } catch (e) {
    console.log('⚠ No users to backup or backup already exists');
  }

  // Drop existing tables in correct order (due to foreign keys)
  const dropStatements = [
    'DROP TABLE IF EXISTS accounts',
    'DROP TABLE IF EXISTS sessions', 
    'DROP TABLE IF EXISTS verification_tokens',
    'DROP TABLE IF EXISTS organization_members',
    'DROP TABLE IF EXISTS users',
  ];

  for (const sql of dropStatements) {
    try {
      await client.execute(sql);
      console.log(`✓ ${sql}`);
    } catch (e) {
      console.log(`⚠ ${sql} - ${e}`);
    }
  }

  // Create users table WITHOUT NOT NULL on created_at/updated_at
  await client.execute(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT NOT NULL UNIQUE,
      emailVerified INTEGER,
      image TEXT,
      avatar TEXT,
      password_hash TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
  console.log('✓ Created users table');

  // Create accounts table with NextAuth-compatible schema
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

  // Create sessions table
  await client.execute(`
    CREATE TABLE sessions (
      sessionToken TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires INTEGER NOT NULL
    )
  `);
  console.log('✓ Created sessions table');

  // Create verification_tokens table
  await client.execute(`
    CREATE TABLE verification_tokens (
      identifier TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires INTEGER NOT NULL
    )
  `);
  console.log('✓ Created verification_tokens table');

  // Recreate organization_members table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS organization_members (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member',
      invited_at INTEGER,
      joined_at INTEGER NOT NULL
    )
  `);
  console.log('✓ Created organization_members table');

  console.log('\n✅ Auth tables setup complete!');
}

setupAuthTables().catch(console.error);

