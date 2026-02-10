import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const DEFAULT_ORG_ID = 'org_kktires';

async function testStatistics() {
  console.log('Testing statistics queries...\n');
  console.log('Using org_id:', DEFAULT_ORG_ID);

  // Test customer count
  const customerCount = await client.execute({
    sql: 'SELECT COUNT(*) as count FROM customers WHERE org_id = ?',
    args: [DEFAULT_ORG_ID]
  });
  console.log('\n1. Customer count:', customerCount.rows[0]);

  // Test revenue
  const revenue = await client.execute({
    sql: 'SELECT COALESCE(SUM(revenue), 0) as total FROM customers WHERE org_id = ?',
    args: [DEFAULT_ORG_ID]
  });
  console.log('2. Total revenue:', revenue.rows[0]);

  // Test lead count
  const leadCount = await client.execute({
    sql: 'SELECT COUNT(*) as count FROM leads WHERE org_id = ?',
    args: [DEFAULT_ORG_ID]
  });
  console.log('3. Lead count:', leadCount.rows[0]);

  // Test VIP count
  const vipCount = await client.execute({
    sql: 'SELECT COUNT(*) as count FROM customers WHERE org_id = ? AND is_vip = 1',
    args: [DEFAULT_ORG_ID]
  });
  console.log('4. VIP count:', vipCount.rows[0]);

  // Test top customers
  const topCustomers = await client.execute({
    sql: 'SELECT id, first_name, last_name, company, revenue FROM customers WHERE org_id = ? ORDER BY revenue DESC LIMIT 5',
    args: [DEFAULT_ORG_ID]
  });
  console.log('5. Top customers:', topCustomers.rows.length, 'found');
  if (topCustomers.rows.length > 0) {
    console.log('   First:', topCustomers.rows[0]);
  }

  // Test customers by category
  const byCategory = await client.execute({
    sql: 'SELECT category, COUNT(*) as count FROM customers WHERE org_id = ? GROUP BY category',
    args: [DEFAULT_ORG_ID]
  });
  console.log('6. By category:', byCategory.rows);

  console.log('\n✅ Statistics test complete!');
}

testStatistics().catch(console.error);

