import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function checkData() {
  console.log('Checking database data...\n');

  // Check organizations
  const orgs = await client.execute('SELECT * FROM organizations LIMIT 5');
  console.log('Organizations:', orgs.rows.length, 'found');
  if (orgs.rows.length > 0) console.log('  Sample:', orgs.rows[0]);

  // Check customers  
  const customers = await client.execute('SELECT COUNT(*) as count FROM customers');
  console.log('\nCustomers:', customers.rows[0]);

  // Check customers for org_kktires
  const customersOrg = await client.execute("SELECT COUNT(*) as count FROM customers WHERE org_id = 'org_kktires'");
  console.log('Customers (org_kktires):', customersOrg.rows[0]);

  // Check users
  const users = await client.execute('SELECT * FROM users LIMIT 5');
  console.log('\nUsers:', users.rows.length, 'found');
  if (users.rows.length > 0) console.log('  Sample:', users.rows[0]);

  // Check tasks
  const tasks = await client.execute('SELECT COUNT(*) as count FROM tasks');
  console.log('\nTasks:', tasks.rows[0]);

  // List all tables
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log('\nAll tables:', tables.rows.map(r => r.name).join(', '));
}

checkData().catch(console.error);

