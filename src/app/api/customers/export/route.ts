import { NextRequest, NextResponse } from 'next/server';
import { db, customers } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

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
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const body = await request.json();
    const { fields, format, filter } = body;

    // Build query conditions
    const conditions = [eq(customers.orgId, orgId)];
    
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

    const headers = fields.map((f: string) => FIELD_LABELS[f] || f);

    const rows = allCustomers.map((customer) =>
      fields.map((field: string) => {
        const value = (customer as any)[field];
        if (value === null || value === undefined) return '';
        if (value instanceof Date) return value.toISOString().split('T')[0];
        if (typeof value === 'boolean') return value ? 'Ναι' : 'Όχι';
        return String(value);
      })
    );

    const dateSuffix = new Date().toISOString().split('T')[0];

    if (format === 'excel') {
      const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, 'Πελάτες');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
      const body = new Uint8Array(buffer);

      return new NextResponse(body, {
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename=\"pelates_${dateSuffix}.xlsx\"`,
          'X-Export-Count': String(allCustomers.length),
        },
      });
    }

    // Add BOM for proper Greek encoding
    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((cell: unknown) => {
            const stringValue = String(cell ?? '');
            if (
              stringValue.includes(',') ||
              stringValue.includes('\"') ||
              stringValue.includes('\n')
            ) {
              return `\"${stringValue.replace(/\"/g, '\"\"')}\"`;
            }
            return stringValue;
          })
          .join(',')
      ),
    ].join('\n');

    const response = new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=\"pelates_${dateSuffix}.csv\"`,
        'X-Export-Count': String(allCustomers.length),
      },
    });

    return response;
  } catch (error) {
    console.error('Export failed:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

