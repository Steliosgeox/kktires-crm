require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

// Turso connection
const TURSO_URL = process.env.TURSO_DATABASE_URL || 'libsql://kktires-db-steliosgeox.aws-eu-west-1.turso.io';
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

console.log('🔌 Connecting to Turso...');

const client = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
});

const DEFAULT_ORG_ID = 'org_kktires';
const DEFAULT_USER_ID = 'user_admin';

let idCounter = 0;
function generateId(prefix = '') {
  idCounter++;
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}${random}${idCounter}`;
}

async function migrate() {
  try {
    // Load migration data
    const dataPath = path.join(__dirname, '..', 'migration-data.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const customers = data.customers;
    
    console.log(`📊 Migrating ${customers.length} customers...`);

    // Setup org
    await client.execute({
      sql: `INSERT OR IGNORE INTO organizations (id, name, slug, created_at, updated_at, settings) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [DEFAULT_ORG_ID, 'KK Tires', 'kktires', Date.now(), Date.now(), '{"currency":"EUR","language":"el"}'],
    });

    // Setup user
    await client.execute({
      sql: `INSERT OR IGNORE INTO users (id, email, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      args: [DEFAULT_USER_ID, 'admin@kktires.gr', 'Admin', Date.now(), Date.now()],
    });

    // Clear existing
    console.log('🗑️  Clearing old data...');
    try {
      await client.execute('DELETE FROM customer_tags');
    } catch (e) {
      console.log('   Note: customer_tags table may be empty');
    }
    await client.execute({
      sql: 'DELETE FROM customers WHERE org_id = ?',
      args: [DEFAULT_ORG_ID],
    });

    // Insert customers one by one (slower but reliable)
    let inserted = 0;
    for (const c of customers) {
      try {
        await client.execute({
          sql: `INSERT INTO customers (
            id, org_id, first_name, last_name, company, email, phone, mobile,
            street, city, state, postal_code, afm, category, revenue, is_vip,
            created_at, updated_at, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            generateId('cust'),
            DEFAULT_ORG_ID,
            String(c.firstName || 'Unknown').substring(0, 100),
            c.lastName ? String(c.lastName).substring(0, 100) : null,
            c.company ? String(c.company).substring(0, 200) : null,
            c.email ? String(c.email).substring(0, 200) : null,
            c.phone ? String(c.phone).substring(0, 50) : null,
            c.mobile ? String(c.mobile).substring(0, 50) : null,
            c.address ? String(c.address).substring(0, 300) : null,
            c.city ? String(c.city).substring(0, 100) : null,
            c.state ? String(c.state).substring(0, 100) : null,
            c.postalCode ? String(c.postalCode).substring(0, 20) : null,
            c.afm ? String(c.afm).substring(0, 20) : null,
            c.category || 'retail',
            c.revenue || 0,
            c.isVip ? 1 : 0,
            Date.now(),
            Date.now(),
            DEFAULT_USER_ID,
          ],
        });
        inserted++;
        if (inserted % 50 === 0) {
          console.log(`   ✅ ${inserted}/${customers.length}`);
        }
      } catch (err) {
        console.error(`   ⚠️  Failed to insert ${c.firstName}: ${err.message}`);
      }
    }

    console.log(`\n🎉 Done! Inserted ${inserted}/${customers.length} customers`);

    // Verify
    const result = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM customers WHERE org_id = ?',
      args: [DEFAULT_ORG_ID],
    });
    console.log(`📊 Total in database: ${result.rows[0].count}`);

    // Top cities
    const cities = await client.execute({
      sql: `SELECT city, COUNT(*) as c FROM customers WHERE org_id = ? AND city IS NOT NULL GROUP BY city ORDER BY c DESC LIMIT 5`,
      args: [DEFAULT_ORG_ID],
    });
    console.log('📍 Top cities:', cities.rows.map(r => `${r.city}(${r.c})`).join(', '));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

migrate();
