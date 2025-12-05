import { NextRequest, NextResponse } from 'next/server';
import { db, customers } from '@/lib/db';
import { nanoid } from 'nanoid';

const DEFAULT_ORG_ID = 'org_kktires';

// POST /api/customers/import - Bulk import customers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customers: customerData } = body;

    if (!customerData || !Array.isArray(customerData)) {
      return NextResponse.json({ 
        error: 'Invalid data format',
        success: 0,
        failed: 0,
        errors: ['Μη έγκυρη μορφή δεδομένων'],
      }, { status: 400 });
    }

    const now = new Date();
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const customer of customerData) {
      try {
        // Validate required fields
        if (!customer.firstName || !customer.firstName.trim()) {
          failed++;
          errors.push(`Λείπει το όνομα για την εγγραφή`);
          continue;
        }

        await db.insert(customers).values({
          id: nanoid(),
          orgId: DEFAULT_ORG_ID,
          firstName: customer.firstName.trim(),
          lastName: customer.lastName?.trim() || null,
          company: customer.company?.trim() || null,
          email: customer.email?.trim() || null,
          phone: customer.phone?.trim() || null,
          mobile: customer.mobile?.trim() || null,
          street: customer.street?.trim() || null,
          city: customer.city?.trim() || null,
          postalCode: customer.postalCode?.trim() || null,
          country: customer.country?.trim() || 'Ελλάδα',
          afm: customer.afm?.trim() || null,
          doy: customer.doy?.trim() || null,
          category: customer.category?.trim() || 'retail',
          notes: customer.notes?.trim() || null,
          lifecycleStage: 'customer',
          leadSource: 'import',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });

        success++;
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errors.length < 10) {
          errors.push(`Σφάλμα για ${customer.firstName || 'άγνωστο'}: ${errorMessage}`);
        }
      }
    }

    return NextResponse.json({
      success,
      failed,
      errors,
    });
  } catch (error) {
    console.error('Import failed:', error);
    return NextResponse.json({ 
      error: 'Import failed',
      success: 0,
      failed: 0,
      errors: ['Σφάλμα κατά την εισαγωγή'],
    }, { status: 500 });
  }
}

