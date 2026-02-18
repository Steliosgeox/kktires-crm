import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray, or, type SQL } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { customers, db } from '@/lib/db';
import {
  DEFAULT_CUSTOMER_CATEGORY,
  normalizeCustomerCategory,
} from '@/lib/customers/category';
import { createRequestId, handleApiError, withValidatedBody } from '@/server/api/http';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

const ImportCustomerSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().max(120).nullable().optional(),
  company: z.string().trim().max(160).nullable().optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  phone: z.string().trim().max(64).nullable().optional(),
  mobile: z.string().trim().max(64).nullable().optional(),
  street: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  postalCode: z.string().trim().max(32).nullable().optional(),
  country: z.string().trim().max(80).nullable().optional(),
  afm: z.string().trim().max(64).nullable().optional(),
  doy: z.string().trim().max(120).nullable().optional(),
  category: z.string().trim().max(64).optional(),
  notes: z.string().max(10_000).nullable().optional(),
});

const ImportRequestSchema = z.object({
  customers: z.array(ImportCustomerSchema).min(1).max(5_000),
});

// POST /api/customers/import - Bulk import customers
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

    const body = await withValidatedBody(request, ImportRequestSchema, {
      maxBytes: 8_000_000,
    });
    const customerData = body.customers;

    const incomingEmails = customerData
      .map((c) => c.email?.trim().toLowerCase() || '')
      .filter(Boolean);
    const incomingAfms = customerData.map((c) => c.afm?.trim() || '').filter(Boolean);

    const existingEmailSet = new Set<string>();
    const existingAfmSet = new Set<string>();

    if (incomingEmails.length > 0 || incomingAfms.length > 0) {
      const existingWhere: SQL[] = [eq(customers.orgId, orgId)];
      const ors: SQL[] = [];
      if (incomingEmails.length > 0) ors.push(inArray(customers.email, incomingEmails));
      if (incomingAfms.length > 0) ors.push(inArray(customers.afm, incomingAfms));
      if (ors.length > 0) existingWhere.push(or(...ors) as SQL);

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
        const email = customer.email?.trim().toLowerCase() || null;
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
          category:
            normalizeCustomerCategory(customer.category ?? '') ?? DEFAULT_CUSTOMER_CATEGORY,
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
          errors.push(`Import error for ${customer.firstName || 'unknown'}: ${errorMessage}`);
        }
      }
    }

    return NextResponse.json({
      requestId,
      success,
      failed,
      skipped,
      errors,
    });
  } catch (error) {
    return handleApiError('customers:import', error, requestId, {
      message: 'Import failed',
    });
  }
}
