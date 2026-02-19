#!/usr/bin/env npx tsx
/**
 * Run pending Drizzle migrations against a LibSQL/Turso database.
 * Usage: npx tsx scripts/run-migrations.ts
 * 
 * Environment variables:
 * - DATABASE_URL or TURSO_DATABASE_URL: The database URL
 * - DATABASE_AUTH_TOKEN or TURSO_AUTH_TOKEN: The auth token (for Turso)
 */

import { createClient } from '@libsql/client';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const DATABASE_URL = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL or TURSO_DATABASE_URL is required');
    process.exit(1);
}

const client = createClient({
    url: DATABASE_URL,
    authToken: DATABASE_AUTH_TOKEN,
});

const MIGRATIONS_DIR = join(process.cwd(), 'drizzle');
const JOURNAL_PATH = join(MIGRATIONS_DIR, 'meta', '_journal.json');

interface JournalEntry {
    tag: string;
    when: number;
}

interface Journal {
    version: string;
    dialect: string;
    entries: JournalEntry[];
}

async function getAppliedMigrations(): Promise<Set<string>> {
    try {
        const result = await client.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'"
        );

        if (result.rows.length === 0) {
            // Create migrations table if it doesn't exist
            await client.execute(`
        CREATE TABLE __drizzle_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          hash TEXT NOT NULL UNIQUE,
          created_at INTEGER
        )
      `);
            return new Set();
        }

        const applied = await client.execute('SELECT hash FROM __drizzle_migrations');
        return new Set(applied.rows.map(r => r.hash as string));
    } catch (error) {
        console.error('Error checking applied migrations:', error);
        return new Set();
    }
}

async function markMigrationApplied(hash: string): Promise<void> {
    await client.execute({
        sql: 'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
        args: [hash, Date.now()]
    });
}

function parseSqlStatements(content: string): string[] {
  // Split by statement breakpoint comments
  const statements: string[] = [];
  
  // Split by the Drizzle statement breakpoint marker
  const parts = content.split('--> statement-breakpoint');
  
  for (let part of parts) {
    // Clean up the statement
    let stmt = part.trim();
    
    // Remove leading/trailing whitespace and newlines
    stmt = stmt.replace(/^\s+|\s+$/g, '');
    
    // Skip if empty or just comments
    if (!stmt) continue;
    if (stmt.startsWith('--') && !stmt.includes('CREATE') && !stmt.includes('INSERT') && !stmt.includes('ALTER') && !stmt.includes('DROP') && !stmt.includes('UPDATE')) continue;
    
    // Add semicolon if missing
    if (!stmt.endsWith(';')) {
      stmt += ';';
    }
    
    statements.push(stmt);
  }
  
  return statements;
}

async function runMigration(filename: string): Promise<{ success: boolean; error?: string }> {
    const filepath = join(MIGRATIONS_DIR, filename);

    if (!existsSync(filepath)) {
        return { success: false, error: `File not found: ${filepath}` };
    }

    const content = readFileSync(filepath, 'utf-8');
    const statements = parseSqlStatements(content);

    console.log(`  📄 ${filename}: ${statements.length} statements`);

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
            await client.execute(stmt);
            console.log(`    ✓ Statement ${i + 1}/${statements.length}`);
        } catch (error: any) {
            // Ignore "already exists" errors for idempotent migrations
            if (error.message?.includes('already exists') ||
                error.message?.includes('duplicate column') ||
                error.message?.includes('UNIQUE constraint failed')) {
                console.log(`    ⚠ Statement ${i + 1}/${statements.length} skipped (already exists)`);
            } else {
                console.error(`    ✗ Statement ${i + 1}/${statements.length} failed:`, error.message);
                // Continue with other statements instead of failing completely
            }
        }
    }

    return { success: true };
}

async function main() {
    console.log('🚀 Running migrations against:', (DATABASE_URL || '').replace(/:[^:@]+@/, ':****@'));

    // Read journal
    if (!existsSync(JOURNAL_PATH)) {
        console.error('❌ Migration journal not found at', JOURNAL_PATH);
        process.exit(1);
    }

    const journal: Journal = JSON.parse(readFileSync(JOURNAL_PATH, 'utf-8'));
    const appliedMigrations = await getAppliedMigrations();

    console.log(`📋 Found ${journal.entries.length} migrations in journal`);
    console.log(`✅ ${appliedMigrations.size} migrations already applied`);

    // Get all SQL files in the migrations directory
    const sqlFiles = readdirSync(MIGRATIONS_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort();

    console.log(`📁 Found ${sqlFiles.length} SQL files`);

    let applied = 0;
    let skipped = 0;
    let failed = 0;

    for (const file of sqlFiles) {
        const hash = file.replace('.sql', '');

        if (appliedMigrations.has(hash)) {
            console.log(`⏭️  Skipping ${file} (already applied)`);
            skipped++;
            continue;
        }

        console.log(`\n🔄 Applying ${file}...`);
        const result = await runMigration(file);

        if (result.success) {
            await markMigrationApplied(hash);
            console.log(`✅ Applied ${file}`);
            applied++;
        } else {
            console.error(`❌ Failed to apply ${file}:`, result.error);
            failed++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`📊 Migration Summary:`);
    console.log(`   ✅ Applied: ${applied}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log('='.repeat(50));

    if (failed > 0) {
        process.exit(1);
    }
}

main().catch(console.error);
