#!/usr/bin/env npx tsx
/**
 * Apply migration SQL files to Turso database using batch execution.
 */

import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const client = createClient({
    url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN,
});

const MIGRATIONS_DIR = join(process.cwd(), 'drizzle');

async function applyMigration(filename: string): Promise<void> {
    console.log(`\n📄 Applying ${filename}...`);

    const filepath = join(MIGRATIONS_DIR, filename);
    const content = readFileSync(filepath, 'utf-8');

    // Use batch execution for multiple statements
    try {
        const result = await client.batch([content], 'deferred');
        console.log(`   ✅ Successfully applied ${filename}`);
        console.log(`   Results: ${result.length} statement(s) executed`);
    } catch (error: any) {
        const msg = error.message || '';
        if (msg.includes('already exists')) {
            console.log(`   ⚠ Skipped (already exists)`);
        } else {
            console.error(`   ✗ Failed:`, msg.substring(0, 300));

            // Try executing statement by statement as fallback
            console.log(`   Trying statement-by-statement execution...`);
            await applyStatementByStatement(content);
        }
    }
}

async function applyStatementByStatement(content: string): Promise<void> {
    // Split by semicolons but be careful with triggers
    const lines = content.split('\n');
    let currentStmt = '';
    let inTrigger = false;
    let stmtCount = 0;

    for (const line of lines) {
        // Detect trigger/function blocks
        if (line.includes('CREATE TRIGGER') || line.includes('CREATE VIEW')) {
            inTrigger = true;
        }

        currentStmt += line + '\n';

        // Check for end of trigger (END;)
        if (inTrigger && line.trim() === 'END;') {
            inTrigger = false;
            // Execute the trigger
            try {
                await client.execute(currentStmt);
                stmtCount++;
                console.log(`   ✓ Statement ${stmtCount}: Trigger/View created`);
            } catch (error: any) {
                const msg = error.message || '';
                if (!msg.includes('already exists')) {
                    console.error(`   ✗ Statement ${stmtCount} failed:`, msg.substring(0, 100));
                } else {
                    console.log(`   ⚠ Statement ${stmtCount}: Already exists`);
                }
            }
            currentStmt = '';
        }
        // Regular statement ending with semicolon
        else if (!inTrigger && line.trim().endsWith(';') && currentStmt.trim()) {
            // Skip pure comments
            const trimmed = currentStmt.trim();
            if (trimmed.startsWith('--') && !trimmed.includes('CREATE') && !trimmed.includes('INSERT') && !trimmed.includes('ALTER')) {
                currentStmt = '';
                continue;
            }

            try {
                await client.execute(currentStmt);
                stmtCount++;
                const preview = currentStmt.split('\n')[0]?.substring(0, 50) || 'Statement';
                console.log(`   ✓ Statement ${stmtCount}: ${preview}...`);
            } catch (error: any) {
                const msg = error.message || '';
                if (!msg.includes('already exists')) {
                    console.error(`   ✗ Statement ${stmtCount} failed:`, msg.substring(0, 100));
                } else {
                    console.log(`   ⚠ Statement ${stmtCount}: Already exists`);
                }
            }
            currentStmt = '';
        }
    }

    // Handle any remaining statement
    if (currentStmt.trim()) {
        try {
            await client.execute(currentStmt);
            stmtCount++;
            console.log(`   ✓ Statement ${stmtCount}: Final statement`);
        } catch (error: any) {
            const msg = error.message || '';
            if (!msg.includes('already exists')) {
                console.error(`   ✗ Final statement failed:`, msg.substring(0, 100));
            }
        }
    }
}

async function main() {
    console.log('🚀 Applying migrations to production database...');
    console.log('📍 Database:', (process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || '').replace(/:[^:@]+@/, ':****@'));

    // Apply migrations in order
    const migrations = [
        '0006_data_integrity_constraints.sql',
        '0007_email_deliverability_tracking.sql',
        '0008_performance_optimization.sql',
    ];

    for (const migration of migrations) {
        await applyMigration(migration);
    }

    console.log('\n✅ Migration process complete!');
}

main().catch(console.error);
