import { NextRequest, NextResponse } from 'next/server';
import { db, customers } from '@/lib/db';
import { nanoid } from 'nanoid';
import { and, eq, inArray, or } from 'drizzle-orm';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

// POST /api/customers/import - Bulk import customers
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const body = await request.json();
    const { customers: customerData } = body;

    if (!customerData || !Array.isArray(customerData)) {
      return NextResponse.json({ 
        error: 'Invalid data format',
        success: 0,
        failed: 0,
        skipped: 0,
        errors: ['Μη έγκυρη μορφή δεδομένων'],
      }, { status: 400 });
    }

    const incomingEmails = customerData
      .map((c: any) => (typeof c.email === 'string' ? c.email.trim().toLowerCase() : ''))
      .filter(Boolean);

    const incomingAfms = customerData
      .map((c: any) => (typeof c.afm === 'string' ? c.afm.trim() : ''))
      .filter(Boolean);

    const existingEmailSet = new Set<string>();
    const existingAfmSet = new Set<string>();

    if (incomingEmails.length > 0 || incomingAfms.length > 0) {
      const existingWhere: any[] = [eq(customers.orgId, orgId)];
      const ors: any[] = [];
      if (incomingEmails.length > 0) ors.push(inArray(customers.email, incomingEmails));
      if (incomingAfms.length > 0) ors.push(inArray(customers.afm, incomingAfms));
      if (ors.length > 0) existingWhere.push(or(...ors));

      const existing = await db
        .select({ email: customers.email, afm: customers.afm })
        .from(customers)
        .where(and(...existingWhere));

      existing.forEach((row) => {
        if (row.email) existingEmailSet.add(row.email.trim().toLowerCase());
        if (row.afm) existingAfmSet.add(row.afm.trim());
      });
    }

    const now = new Date();
    let success = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const customer of customerData) {
      try {
        // Validate required fields
        if (!customer.firstName || !customer.firstName.trim()) {
          failed++;
          errors.push(`Λείπει το όνομα για την εγγραφή`);
          continue;
        }

        const email = customer.email?.trim()?.toLowerCase() || null;
        const afm = customer.afm?.trim() || null;

        if ((email && existingEmailSet.has(email)) || (afm && existingAfmSet.has(afm))) {
          skipped++;
          continue;
        }

        await db.insert(customers).values({
          id: nanoid(),
          orgId,
          firstName: customer.firstName.trim(),
          lastName: customer.lastName?.trim() || null,
          company: customer.company?.trim() || null,
          email,
          phone: customer.phone?.trim() || null,
          mobile: customer.mobile?.trim() || null,
          street: customer.street?.trim() || null,
          city: customer.city?.trim() || null,
          postalCode: customer.postalCode?.trim() || null,
          country: customer.country?.trim() || 'Ελλάδα',
          afm,
          doy: customer.doy?.trim() || null,
          category: customer.category?.trim() || 'retail',
          notes: customer.notes?.trim() || null,
          lifecycleStage: 'customer',
          leadSource: 'import',
          isActive: true,
          createdAt: now,
          updatedAt: now,
          createdBy: session.user.id,
        });

        if (email) existingEmailSet.add(email);
        if (afm) existingAfmSet.add(afm);
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
      skipped,
      errors,
    });
  } catch (error) {
    console.error('Import failed:', error);
    return NextResponse.json({ 
      error: 'Import failed',
      success: 0,
      failed: 0,
      skipped: 0,
      errors: ['Σφάλμα κατά την εισαγωγή'],
    }, { status: 500 });
  }
}

