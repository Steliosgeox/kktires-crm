require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const ORG = 'org_kktires';
const USER = 'user_admin';
let id = 0;
const gid = () => `cust_${Date.now().toString(36)}${(++id).toString(36)}`;

async function run() {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'migration-data.json'), 'utf8'));
  console.log(`Migrating ${data.customers.length} customers...`);

  // Setup
  await client.execute(`INSERT OR IGNORE INTO organizations (id, name, slug, created_at, updated_at, settings) VALUES ('${ORG}', 'KK Tires', 'kktires', ${Date.now()}, ${Date.now()}, '{}')`);
  await client.execute(`INSERT OR IGNORE INTO users (id, email, name, created_at, updated_at) VALUES ('${USER}', 'admin@kktires.gr', 'Admin', ${Date.now()}, ${Date.now()})`);
  
  // Clear
  await client.execute(`DELETE FROM customers WHERE org_id = '${ORG}'`);
  
  // Build batch SQL
  const now = Date.now();
  const values = data.customers.map(c => {
    const fn = (c.firstName || 'Unknown').replace(/'/g, "''");
    const ln = (c.lastName || '').replace(/'/g, "''");
    const co = (c.company || '').replace(/'/g, "''");
    const em = (c.email || '').replace(/'/g, "''");
    const ph = (c.phone || '').replace(/'/g, "''");
    const st = (c.address || '').replace(/'/g, "''");
    const ct = (c.city || '').replace(/'/g, "''");
    const pc = (c.postalCode || '').replace(/'/g, "''");
    const af = (c.afm || '').replace(/'/g, "''");
    const cat = c.category || 'retail';
    const vip = c.isVip ? 1 : 0;
    
    return `('${gid()}', '${ORG}', '${fn}', '${ln}', '${co}', '${em}', '${ph}', '${st}', '${ct}', '${pc}', '${af}', '${cat}', 0, ${vip}, ${now}, ${now}, '${USER}')`;
  });

  // Insert in chunks of 50
  for (let i = 0; i < values.length; i += 50) {
    const chunk = values.slice(i, i + 50);
    const sql = `INSERT INTO customers (id, org_id, first_name, last_name, company, email, phone, street, city, postal_code, afm, category, revenue, is_vip, created_at, updated_at, created_by) VALUES ${chunk.join(',')}`;
    await client.execute(sql);
    console.log(`✅ ${Math.min(i + 50, values.length)}/${values.length}`);
  }

  const count = await client.execute(`SELECT COUNT(*) as c FROM customers WHERE org_id = '${ORG}'`);
  console.log(`\n🎉 Done! ${count.rows[0].c} customers in Turso!`);
}

run().catch(console.error);

