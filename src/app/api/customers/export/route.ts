import { NextRequest, NextResponse } from 'next/server';
import { db, customers } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

const DEFAULT_ORG_ID = 'org_kktires';

const FIELD_LABELS: Record<string, string> = {
  firstName: 'Όνομα',
  lastName: 'Επώνυμο',
  company: 'Εταιρεία',
  email: 'Email',
  phone: 'Τηλέφωνο',
  mobile: 'Κινητό',
  street: 'Διεύθυνση',
  city: 'Πόλη',
  postalCode: 'Τ.Κ.',
  country: 'Χώρα',
  afm: 'ΑΦΜ',
  doy: 'ΔΟΥ',
  category: 'Κατηγορία',
  lifecycleStage: 'Στάδιο',
  revenue: 'Τζίρος',
  notes: 'Σημειώσεις',
  createdAt: 'Ημ/νία Δημιουργίας',
};

// POST /api/customers/export - Export customers to CSV/Excel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fields, format, filter } = body;

    // Build query conditions
    const conditions = [eq(customers.orgId, DEFAULT_ORG_ID)];
    
    if (filter === 'active') {
      conditions.push(eq(customers.isActive, true));
    } else if (filter === 'vip') {
      conditions.push(eq(customers.isVip, true));
    }

    // Fetch customers
    const allCustomers = await db
      .select()
      .from(customers)
      .where(and(...conditions));

    // Generate CSV
    const headers = fields.map((f: string) => FIELD_LABELS[f] || f);
    
    const rows = allCustomers.map((customer) => {
      return fields.map((field: string) => {
        const value = customer[field as keyof typeof customer];
        if (value === null || value === undefined) return '';
        if (value instanceof Date) return value.toISOString().split('T')[0];
        if (typeof value === 'boolean') return value ? 'Ναι' : 'Όχι';
        // Escape CSV special characters
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
    });

    // Add BOM for proper Greek encoding
    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const response = new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="pelates_${new Date().toISOString().split('T')[0]}.csv"`,
        'X-Export-Count': String(allCustomers.length),
      },
    });

    return response;
  } catch (error) {
    console.error('Export failed:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

