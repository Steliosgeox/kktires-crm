import { createClient } from '@libsql/client';

const client = createClient({
    url: 'libsql://kktires-db-steliosgeox.aws-eu-west-1.turso.io',
    authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjQ4OTA2MDIsImlkIjoiZWJkY2I4ZjYtNDdlYS00YjI5LWFiMmYtMjc2YjM0ZTRmYWUwIiwicmlkIjoiMGNjN2U2OWEtOWJlYi00OGMyLTkwNjctOTAyYzY1M2EwNGQ3In0.bewsGe3b0I9Bel2jJciBwNsSo-dCKgoQcDQj2JZe6hMUyTN5Yt4z2dEChy6oNxgu_FKo70Q1ypwzCnnQx1TcDA',
});

async function main() {
    // 1) Get all campaigns
    console.log('=== ALL CAMPAIGNS ===');
    const campaigns = await client.execute('SELECT id, name, subject, status, total_recipients, sent_count, open_count, click_count FROM email_campaigns ORDER BY created_at DESC LIMIT 10');
    for (const r of campaigns.rows) {
        console.log(`  [${r.status}] "${r.name}" | subject: "${r.subject}" | recipients: ${r.total_recipients} | sent: ${r.sent_count} | opens: ${r.open_count} | clicks: ${r.click_count} | id: ${r.id}`);
    }

    // 2) For the failed campaigns, get recipient breakdown
    const failedCampaigns = campaigns.rows.filter(r => r.status === 'failed');
    for (const campaign of failedCampaigns) {
        console.log(`\n=== CAMPAIGN "${campaign.name}" (${campaign.id}) — RECIPIENT BREAKDOWN ===`);
        const breakdown = await client.execute({ sql: 'SELECT status, count(*) as cnt FROM campaign_recipients WHERE campaign_id = ? GROUP BY status', args: [campaign.id] });
        for (const r of breakdown.rows) {
            console.log(`  ${r.status}: ${r.cnt}`);
        }

        console.log(`\n--- FAILED RECIPIENTS (${campaign.name}) ---`);
        const failedRecipients = await client.execute({ sql: "SELECT cr.email, cr.status, cr.error_message, c.first_name, c.last_name, c.company FROM campaign_recipients cr LEFT JOIN customers c ON c.id = cr.customer_id WHERE cr.campaign_id = ? AND cr.status = 'failed' LIMIT 100", args: [campaign.id] });
        if (failedRecipients.rows.length === 0) {
            console.log('  (none)');
        }
        for (const r of failedRecipients.rows) {
            console.log(`  ❌ ${r.email} | ${r.first_name || ''} ${r.last_name || ''} | ${r.company || ''} | ERROR: ${r.error_message || 'no error message'}`);
        }

        console.log(`\n--- PENDING (UNSENT) RECIPIENTS (${campaign.name}) ---`);
        const pendingRecipients = await client.execute({ sql: "SELECT cr.email, cr.status, c.first_name, c.last_name, c.company FROM campaign_recipients cr LEFT JOIN customers c ON c.id = cr.customer_id WHERE cr.campaign_id = ? AND cr.status = 'pending' LIMIT 100", args: [campaign.id] });
        if (pendingRecipients.rows.length === 0) {
            console.log('  (none — all recipients were processed)');
        }
        for (const r of pendingRecipients.rows) {
            console.log(`  ⏳ ${r.email} | ${r.first_name || ''} ${r.last_name || ''} | ${r.company || ''}`);
        }

        console.log(`\n--- SENT RECIPIENTS COUNT (${campaign.name}) ---`);
        const sentCount = await client.execute({ sql: "SELECT count(*) as cnt FROM campaign_recipients WHERE campaign_id = ? AND status = 'sent'", args: [campaign.id] });
        console.log(`  ✅ ${sentCount.rows[0]?.cnt || 0} recipients successfully sent`);
    }

    // 3) Check email jobs
    console.log('\n=== EMAIL JOBS ===');
    const jobs = await client.execute('SELECT id, campaign_id, status, attempts, last_error, created_at, completed_at FROM email_jobs ORDER BY created_at DESC LIMIT 10');
    for (const r of jobs.rows) {
        console.log(`  [${r.status}] job=${r.id} | campaign=${r.campaign_id} | attempts=${r.attempts} | error: ${r.last_error || 'none'}`);
    }

    // 4) Check for test/fake customers
    console.log('\n=== POTENTIAL TEST/FAKE CUSTOMERS (emails with test, fake, example, etc.) ===');
    const testCustomers = await client.execute("SELECT id, email, first_name, last_name, company FROM customers WHERE email LIKE '%test%' OR email LIKE '%fake%' OR email LIKE '%example%' OR email LIKE '%sample%' OR email LIKE '%demo%' OR email LIKE '%placeholder%' OR email LIKE '%@test.%' OR email LIKE '%@example.%' OR email IS NULL OR email = '' ORDER BY email LIMIT 50");
    if (testCustomers.rows.length === 0) {
        console.log('  (none found)');
    }
    for (const r of testCustomers.rows) {
        console.log(`  🧪 ${r.email || '(no email)'} | ${r.first_name || ''} ${r.last_name || ''} | ${r.company || ''} | id: ${r.id}`);
    }

    // 5) Check customers with invalid-looking emails
    console.log('\n=== CUSTOMERS WITHOUT VALID EMAIL (null or empty) ===');
    const noEmail = await client.execute("SELECT id, first_name, last_name, company, email FROM customers WHERE email IS NULL OR trim(email) = '' LIMIT 20");
    for (const r of noEmail.rows) {
        console.log(`  ⚠️ ${r.first_name || ''} ${r.last_name || ''} | ${r.company || ''} | email: '${r.email || ''}' | id: ${r.id}`);
    }
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
