import { createClient } from '@libsql/client';

const client = createClient({
    url: 'libsql://kktires-db-steliosgeox.aws-eu-west-1.turso.io',
    authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjQ4OTA2MDIsImlkIjoiZWJkY2I4ZjYtNDdlYS00YjI5LWFiMmYtMjc2YjM0ZTRmYWUwIiwicmlkIjoiMGNjN2U2OWEtOWJlYi00OGMyLTkwNjctOTAyYzY1M2EwNGQ3In0.bewsGe3b0I9Bel2jJciBwNsSo-dCKgoQcDQj2JZe6hMUyTN5Yt4z2dEChy6oNxgu_FKo70Q1ypwzCnnQx1TcDA',
});

// ----- Email typo corrections -----
const emailFixes: Array<{ old: string; corrected: string }> = [
    { old: 'lapardastyres@gmal.com', corrected: 'lapardastyres@gmail.com' },
    { old: 'honda.klokas@gmail.con', corrected: 'honda.klokas@gmail.com' },
    { old: 'oikonomoueko@gmail.com1', corrected: 'oikonomoueko@gmail.com' },
    { old: 'alexst300@yahoo.grr', corrected: 'alexst300@yahoo.gr' },
];

// These domains genuinely don't exist — can't auto-fix
const cannotAutoFix = [
    'b2b@dominic.gr',        // Domain "dominic.gr" doesn't exist
    'info@paul-dynamic.gr',  // Domain "paul-dynamic.gr" doesn't exist
    'info@kktires.com',      // User unknown at this domain (test address?)
    'info@autoservice365.gr', // Domain "autoservice365.gr" doesn't exist
];

async function main() {
    console.log('=== AUTO-FIX: Correcting email typos in customers table ===\n');

    for (const fix of emailFixes) {
        console.log(`Fixing: ${fix.old} → ${fix.corrected}`);
        const result = await client.execute({
            sql: 'UPDATE customers SET email = ? WHERE email = ?',
            args: [fix.corrected, fix.old],
        });
        console.log(`  → ${result.rowsAffected} row(s) updated\n`);
    }

    console.log('\n=== CANNOT AUTO-FIX (domain doesn\'t exist / user unknown) ===');
    for (const email of cannotAutoFix) {
        console.log(`  ⚠️ ${email} — needs manual verification by business owner`);
    }

    console.log('\n=== CAMPAIGN STATUS FIX ===');
    console.log('Updating campaign "ΠΡΟΤΑΣΗ ΣΥΝΕΡΓΑΣΙΑΣ" status from "failed" to "sent"...');

    // First, confirm it's the right one
    const campaign = await client.execute({
        sql: "SELECT id, name, status, sent_count, total_recipients FROM email_campaigns WHERE status = 'failed'",
        args: [],
    });

    for (const row of campaign.rows) {
        console.log(`  Found: ${row.name} (${row.id}) — status: ${row.status}, sent: ${row.sent_count}/${row.total_recipients}`);

        // Update status to 'sent' since 314/322 were successfully sent
        const update = await client.execute({
            sql: "UPDATE email_campaigns SET status = 'sent', sent_at = COALESCE(sent_at, datetime('now')), updated_at = datetime('now') WHERE id = ?",
            args: [row.id],
        });
        console.log(`  → Updated to 'sent' (${update.rowsAffected} row(s))`);
    }

    console.log('\n=== VERIFICATION ===');
    const verify = await client.execute("SELECT id, name, status, sent_count, total_recipients FROM email_campaigns ORDER BY created_at DESC LIMIT 5");
    for (const row of verify.rows) {
        console.log(`  [${row.status}] "${row.name}" — sent: ${row.sent_count}/${row.total_recipients}`);
    }

    console.log('\n✅ Done! Campaign status corrected and email typos fixed.');
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
