import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import { z } from 'zod';

import { customers, db } from '@/lib/db';
import { createRequestId, handleApiError, withValidatedBody } from '@/server/api/http';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

const FIELD_LABELS = {
  firstName: 'First Name',
  lastName: 'Last Name',
  company: 'Company',
  email: 'Email',
  phone: 'Phone',
  mobile: 'Mobile',
  street: 'Address',
  city: 'City',
  postalCode: 'Postal Code',
  country: 'Country',
  afm: 'AFM',
  doy: 'DOY',
  category: 'Category',
  lifecycleStage: 'Lifecycle Stage',
  revenue: 'Revenue',
  notes: 'Notes',
  createdAt: 'Created At',
} as const;

type ExportField = keyof typeof FIELD_LABELS;

const ExportFieldSchema = z.enum(Object.keys(FIELD_LABELS) as [ExportField, ...ExportField[]]);

const ExportRequestSchema = z.object({
  fields: z.array(ExportFieldSchema).min(1).max(32),
  format: z.enum(['csv', 'excel']).default('csv'),
  filter: z.enum(['all', 'active', 'vip']).default('all'),
});

function sanitizeSpreadsheetCell(value: string): string {
  const trimmed = value.trimStart();
  if (!trimmed) return value;
  const first = trimmed[0];
  if (first === '=' || first === '+' || first === '-' || first === '@') {
    return `'${value}`;
  }
  return value;
}

function serializeCustomerValue(
  customer: typeof customers.$inferSelect,
  field: ExportField
): string {
  const value = customer[field];
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return sanitizeSpreadsheetCell(String(value));
}

function encodeCsvRow(values: string[]): string {
  return values
    .map((value) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    })
    .join(',');
}

function toArrayBuffer(buffer: Buffer | Uint8Array | ArrayBuffer): ArrayBuffer {
  if (buffer instanceof ArrayBuffer) {
    return buffer;
  }

  const view = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy.buffer;
}

// POST /api/customers/export - Export customers to CSV/Excel
export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', requestId },
        { status: 401 }
      );
    }
    const orgId = getOrgIdFromSession(session);

    const body = await withValidatedBody(request, ExportRequestSchema, {
      maxBytes: 50_000,
    });
    const { fields, format, filter } = body;

    const conditions = [eq(customers.orgId, orgId)];
    if (filter === 'active') {
      conditions.push(eq(customers.isActive, true));
    } else if (filter === 'vip') {
      conditions.push(eq(customers.isVip, true));
    }

    const allCustomers = await db.select().from(customers).where(and(...conditions));

    const headers = fields.map((f) => FIELD_LABELS[f]);
    const rows = allCustomers.map((customer) => fields.map((field) => serializeCustomerValue(customer, field)));
    const dateSuffix = new Date().toISOString().split('T')[0];

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Customers');
      worksheet.addRow(headers);
      for (const row of rows) worksheet.addRow(row);
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      worksheet.columns = headers.map(() => ({ width: 20 }));

      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(toArrayBuffer(buffer), {
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="customers_${dateSuffix}.xlsx"`,
          'X-Export-Count': String(allCustomers.length),
          'X-Request-Id': requestId,
        },
      });
    }

    const BOM = '\uFEFF';
    const csvContent = BOM + [encodeCsvRow(headers), ...rows.map(encodeCsvRow)].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="customers_${dateSuffix}.csv"`,
        'X-Export-Count': String(allCustomers.length),
        'X-Request-Id': requestId,
      },
    });
  } catch (error) {
    return handleApiError('customers:export', error, requestId, { message: 'Export failed' });
  }
}
