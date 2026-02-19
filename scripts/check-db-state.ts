#!/usr/bin/env npx tsx
import { createClient } from '@libsql/client';

const client = createClient({
    url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN,
});

async function main() {
    console.log('Checking database state...\n');

    // Check tables
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    console.log('📋 Tables:', tables.rows.map(r => r.name).join(', '));

    // Check triggers
    const triggers = await client.execute("SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name");
    console.log('\n⚡ Triggers:', triggers.rows.length > 0 ? triggers.rows.map(r => r.name).join(', ') : 'None');

    // Check views
    const views = await client.execute("SELECT name FROM sqlite_master WHERE type='view' ORDER BY name");
    console.log('\n👁️ Views:', views.rows.length > 0 ? views.rows.map(r => r.name).join(', ') : 'None');

    // Check indexes
    const indexes = await client.execute("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name");
    console.log('\n🔍 Indexes:', indexes.rows.length > 0 ? indexes.rows.map(r => r.name).join(', ') : 'None');

    // Check for new tables from migrations 0006, 0007, 0008
    const newTables = ['email_delivery_events', 'email_suppressions', 'email_validation_cache', 'email_retry_config'];
    console.log('\n📊 New tables status:');
    for (const table of newTables) {
        const exists = await client.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
        console.log(`   ${table}: ${exists.rows.length > 0 ? '✅ EXISTS' : '❌ MISSING'}`);
    }
}

main().catch(console.error);
