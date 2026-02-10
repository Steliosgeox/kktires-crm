import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Read the Excel file
const excelPath = path.join(process.cwd(), 'kktires-pelates.xlsx');
console.log('📂 Reading Excel file:', excelPath);

if (!fs.existsSync(excelPath)) {
  console.error('❌ Excel file not found at:', excelPath);
  process.exit(1);
}

const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
console.log('📊 Sheet name:', sheetName);
console.log('📊 All sheets:', workbook.SheetNames);

const worksheet = workbook.Sheets[sheetName];
const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

console.log('📊 Total rows:', rawData.length);
console.log('📊 First row sample:', JSON.stringify(rawData[0], null, 2));
console.log('📊 Column headers:', Object.keys(rawData[0] || {}));

// Map Greek column names to our schema
const columnMap: Record<string, string> = {
  // Greek names
  'Όνομα': 'firstName',
  'Επώνυμο': 'lastName',
  'Εταιρεία': 'company',
  'Email': 'email',
  'Τηλέφωνο': 'phone',
  'Κινητό': 'mobile',
  'Διεύθυνση': 'address',
  'Πόλη': 'city',
  'ΤΚ': 'postalCode',
  'Τ.Κ.': 'postalCode',
  'ΑΦΜ': 'afm',
  'ΔΟΥ': 'doy',
  'Κατηγορία': 'category',
  'Τζίρος': 'revenue',
  'VIP': 'isVip',
  'Σημειώσεις': 'notes',
  'Ετικέτες': 'tags',
  // English names (in case they're used)
  'FirstName': 'firstName',
  'First Name': 'firstName',
  'LastName': 'lastName',
  'Last Name': 'lastName',
  'Company': 'company',
  'Phone': 'phone',
  'Mobile': 'mobile',
  'Address': 'address',
  'City': 'city',
  'PostalCode': 'postalCode',
  'Postal Code': 'postalCode',
  'AFM': 'afm',
  'DOY': 'doy',
  'Category': 'category',
  'Revenue': 'revenue',
  'Notes': 'notes',
  'Tags': 'tags',
};

// Category mapping
const categoryMap: Record<string, string> = {
  'Λιανική': 'retail',
  'Χονδρική': 'wholesale',
  'Στόλος': 'fleet',
  'VIP': 'vip',
  'Premium': 'premium',
  'Συνεργείο': 'garage',
  'Taxi': 'fleet',
  'Ιδιώτης': 'retail',
  'Επαγγελματίας': 'wholesale',
  'retail': 'retail',
  'wholesale': 'wholesale',
  'fleet': 'fleet',
  'vip': 'vip',
  'premium': 'premium',
  'garage': 'garage',
};

function normalizeRow(row: any): any {
  const normalized: any = {};
  
  for (const [key, value] of Object.entries(row)) {
    const mappedKey = columnMap[key] || key.toLowerCase().replace(/\s+/g, '');
    normalized[mappedKey] = value;
  }
  
  return normalized;
}

function parseCustomer(row: any): any {
  const n = normalizeRow(row);
  
  // Handle name - might be in single field or split
  let firstName = n.firstName || n.firstname || n.name || n.όνομα || '';
  let lastName = n.lastName || n.lastname || n.επώνυμο || '';
  
  // If name is a single field, try to split it
  if (!lastName && firstName && firstName.includes(' ')) {
    const parts = firstName.split(' ');
    firstName = parts[0];
    lastName = parts.slice(1).join(' ');
  }
  
  // Parse revenue - handle Greek number format (1.234,56 -> 1234.56)
  let revenue = n.revenue || n.τζίρος || 0;
  if (typeof revenue === 'string') {
    revenue = revenue.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
    revenue = parseFloat(revenue) || 0;
  }
  
  // Parse VIP
  let isVip = n.isVip || n.vip || false;
  if (typeof isVip === 'string') {
    isVip = isVip.toLowerCase() === 'ναι' || isVip.toLowerCase() === 'yes' || isVip === '1' || isVip === 'true';
  }
  
  // Parse category
  const rawCategory = n.category || n.κατηγορία || 'retail';
  const category = categoryMap[rawCategory] || categoryMap[rawCategory.toLowerCase()] || 'retail';
  
  // Parse tags
  let tags: string[] = [];
  const tagsRaw = n.tags || n.ετικέτες || '';
  if (typeof tagsRaw === 'string' && tagsRaw) {
    tags = tagsRaw.split(/[,;]/).map((t: string) => t.trim()).filter(Boolean);
  }
  
  return {
    firstName: String(firstName).trim() || 'Άγνωστο',
    lastName: String(lastName).trim() || null,
    company: n.company || n.εταιρεία || null,
    email: n.email || null,
    phone: n.phone || n.τηλέφωνο || null,
    mobile: n.mobile || n.κινητό || null,
    address: n.address || n.διεύθυνση || null,
    city: n.city || n.πόλη || null,
    postalCode: n.postalCode || n.postalcode || n.τκ || null,
    afm: n.afm || n.αφμ || null,
    doy: n.doy || n.δου || null,
    category,
    revenue,
    isVip,
    notes: n.notes || n.σημειώσεις || null,
    tags,
  };
}

// Parse all customers
const customers = rawData.map(parseCustomer).filter(c => c.firstName && c.firstName !== 'Άγνωστο');

console.log('\n✅ Parsed', customers.length, 'customers');
console.log('📊 Sample parsed customer:', JSON.stringify(customers[0], null, 2));

// Collect all unique tags
const allTags = new Set<string>();
customers.forEach(c => c.tags.forEach((t: string) => allTags.add(t)));
console.log('🏷️  Unique tags found:', Array.from(allTags));

// Collect cities
const cities = new Map<string, number>();
customers.forEach(c => {
  if (c.city) {
    cities.set(c.city, (cities.get(c.city) || 0) + 1);
  }
});
console.log('🏙️  Cities:', Array.from(cities.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10));

// Collect categories
const categories = new Map<string, number>();
customers.forEach(c => {
  categories.set(c.category, (categories.get(c.category) || 0) + 1);
});
console.log('📁 Categories:', Array.from(categories.entries()));

// Calculate total revenue
const totalRevenue = customers.reduce((sum, c) => sum + (c.revenue || 0), 0);
console.log('💰 Total revenue:', totalRevenue.toLocaleString('el-GR'), '€');

// Count VIPs
const vipCount = customers.filter(c => c.isVip).length;
console.log('⭐ VIP customers:', vipCount);

// Save to JSON for the migration API
const output = { customers };
const outputPath = path.join(process.cwd(), 'migration-data.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log('\n💾 Saved migration data to:', outputPath);

console.log('\n🚀 Ready to migrate! Run:');
console.log('   curl -X POST http://localhost:3000/api/migrate -H "Content-Type: application/json" -d @migration-data.json');

