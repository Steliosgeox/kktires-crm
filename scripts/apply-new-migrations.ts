#!/usr/bin/env npx tsx
/**
 * Apply the new migration SQL files directly to the database.
 */

import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const client = createClient({
    url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN,
});

const MIGRATIONS_DIR = join(process.cwd(), 'drizzle');

const migrationsToApply = [
    '0006_data_integrity_constraints.sql',
    '0007_email_deliverability_tracking.sql',
    '0008_performance_optimization.sql',
];

function parseSqlStatements(content: string): string[] {
    // Split by statement breakpoint
    const parts = content.split('--> statement-breakpoint');
    const statements: string[] = [];

    for (let part of parts) {
        let stmt = part.trim();
        if (!stmt) continue;

        // Skip pure comment blocks
        const lines = stmt.split('\n');
        const nonCommentLines = lines.filter(l => !l.trim().startsWith('--'));
        if (nonCommentLines.length === 0) continue;

        statements.push(stmt);
    }

    return statements;
}

async function applyMigration(filename: string): Promise<void> {
    console.log(`\n📄 Applying ${filename}...`);

    const filepath = join(MIGRATIONS_DIR, filename);
    const content = readFileSync(filepath, 'utf-8');
    const statements = parseSqlStatements(content);

    console.log(`   Found ${statements.length} statements`);

    let applied = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
            await client.execute(stmt);
            applied++;
            console.log(`   ✓ [${i + 1}/${statements.length}] Success`);
        } catch (error: any) {
            const msg = error.message || '';
            if (msg.includes('already exists') || msg.includes('duplicate column')) {
                skipped++;
                console.log(`   ⚠ [${i + 1}/${statements.length}] Skipped (already exists)`);
            } else {
                failed++;
                console.error(`   ✗ [${i + 1}/${statements.length}] Failed:`, msg.substring(0, 100));
            }
        }
    }

    console.log(`   Summary: ${applied} applied, ${skipped} skipped, ${failed} failed`);
}

async function main() {
    console.log('🚀 Applying new migrations to production database...');
    console.log('📍 Database:', (process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || '').replace(/:[^:@]+@/, ':****@'));

    for (const migration of migrationsToApply) {
        await applyMigration(migration);
    }

    console.log('\n✅ Done!');
}

main().catch(console.error);
