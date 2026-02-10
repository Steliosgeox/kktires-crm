const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the Excel file
const excelPath = path.join(__dirname, '..', 'kktires-pelates.xlsx');
console.log('Reading Excel file:', excelPath);

if (!fs.existsSync(excelPath)) {
  console.error('Excel file not found at:', excelPath);
  process.exit(1);
}

const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
console.log('Sheet name:', sheetName);
console.log('All sheets:', workbook.SheetNames);

const worksheet = workbook.Sheets[sheetName];
const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

console.log('Total rows:', rawData.length);
if (rawData.length > 0) {
  console.log('Column headers:', Object.keys(rawData[0]));
  console.log('First row sample:', JSON.stringify(rawData[0], null, 2));
}

// Map column names
const columnMap = {
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
  'Revenue': 'revenue',
  'Notes': 'notes',
  'Tags': 'tags',
};

const categoryMap = {
  'Λιανική': 'retail',
  'Χονδρική': 'wholesale',
  'Στόλος': 'fleet',
  'VIP': 'vip',
  'Premium': 'premium',
  'Συνεργείο': 'garage',
  'Taxi': 'fleet',
  'Ιδιώτης': 'retail',
  'Επαγγελματίας': 'wholesale',
};

function parseCustomer(row) {
  // Direct mapping from your Excel columns
  const firstName = String(row.firstname || row.FirstName || '').trim();
  const lastName = String(row.lastname || row.LastName || '').trim();
  const company = String(row.eponumia || row.company || row.Company || '').trim() || null;
  const email = String(row.email || row.Email || '').trim() || null;
  const phone = String(row.telephone || row.phone || row.Phone || '').trim() || null;
  const address = String(row.address || row.Address || '').trim() || null;
  const city = String(row.city || row.City || '').trim() || null;
  const state = String(row.state || '').trim() || null;
  const postalCode = row.postal_code || row.postalCode || null;
  const afm = row.afm || row.AFM || null;
  
  // Role-based category mapping
  const role = String(row.role || '').toLowerCase();
  let category = 'retail';
  if (role === 'admin' || role === 'vip') category = 'vip';
  else if (role === 'wholesale' || role === 'χονδρική') category = 'wholesale';
  else if (role === 'fleet' || role === 'στόλος') category = 'fleet';
  else if (role === 'garage' || role === 'συνεργείο') category = 'garage';
  
  // VIP based on role
  const isVip = role === 'admin' || role === 'vip';
  
  // Skip inactive customers
  const active = row.active === 1 || row.active === '1' || row.active === true;
  
  return {
    firstName: firstName || 'Άγνωστο',
    lastName: lastName || null,
    company,
    email,
    phone: phone ? String(phone) : null,
    mobile: null,
    address,
    city,
    state,
    postalCode: postalCode ? String(postalCode) : null,
    afm: afm ? String(afm) : null,
    doy: null,
    category,
    revenue: 0, // No revenue in the Excel
    isVip,
    notes: null,
    tags: [],
    active,
    zoneId: row.zone_id || null,
  };
}

const customers = rawData.map(parseCustomer).filter(c => c.firstName && c.firstName !== 'Άγνωστο');

console.log('\nParsed', customers.length, 'customers');
if (customers.length > 0) {
  console.log('Sample customer:', JSON.stringify(customers[0], null, 2));
}

// Stats
const cities = {};
customers.forEach(c => {
  if (c.city) cities[c.city] = (cities[c.city] || 0) + 1;
});
console.log('\nTop cities:', Object.entries(cities).sort((a,b) => b[1]-a[1]).slice(0,5));

const cats = {};
customers.forEach(c => cats[c.category] = (cats[c.category] || 0) + 1);
console.log('Categories:', cats);

const totalRevenue = customers.reduce((sum, c) => sum + (c.revenue || 0), 0);
console.log('Total revenue:', totalRevenue.toLocaleString('el-GR'), '€');

const vipCount = customers.filter(c => c.isVip).length;
console.log('VIP count:', vipCount);

// Save output
const output = { customers };
const outputPath = path.join(__dirname, '..', 'migration-data.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
console.log('\nSaved to:', outputPath);

