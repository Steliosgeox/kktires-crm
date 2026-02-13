import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db';
import { customers } from '@/lib/db/schema';
import {
  createRequestId,
  handleApiError,
  jsonError,
  withValidatedBody,
} from '@/server/api/http';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

const CustomerCategorySchema = z.enum([
  'retail',
  'wholesale',
  'fleet',
  'garage',
  'vip',
  'premium',
  'standard',
  'basic',
]);

const CustomerUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(120).optional(),
  lastName: z.string().trim().max(120).nullable().optional(),
  company: z.string().trim().max(160).nullable().optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  phone: z.string().trim().max(64).nullable().optional(),
  mobile: z.string().trim().max(64).nullable().optional(),
  street: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  postalCode: z.string().trim().max(32).nullable().optional(),
  afm: z.string().trim().max(64).nullable().optional(),
  doy: z.string().trim().max(120).nullable().optional(),
  category: CustomerCategorySchema.optional(),
  revenue: z.number().finite().nonnegative().max(1_000_000_000).optional(),
  isVip: z.boolean().optional(),
  notes: z.string().max(10_000).nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();
  try {
    const session = await requireSession();
    if (!session) return jsonError('Unauthorized', 401, 'UNAUTHORIZED', requestId);
    const orgId = getOrgIdFromSession(session);

    const { id } = await params;
    const customer = await db.query.customers.findFirst({
      where: (c, { eq: whereEq, and: whereAnd }) => whereAnd(whereEq(c.id, id), whereEq(c.orgId, orgId)),
    });

    if (!customer) return jsonError('Customer not found', 404, 'NOT_FOUND', requestId);

    return NextResponse.json({ ...customer, requestId });
  } catch (error) {
    return handleApiError('customers:id:get', error, requestId, {
      message: 'Failed to fetch customer',
    });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();
  try {
    const session = await requireSession();
    if (!session) return jsonError('Unauthorized', 401, 'UNAUTHORIZED', requestId);
    const orgId = getOrgIdFromSession(session);

    const { id } = await params;
    const body = await withValidatedBody(request, CustomerUpdateSchema, {
      maxBytes: 200_000,
    });

    const updated = await db
      .update(customers)
      .set({
        ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
        ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
        ...(body.company !== undefined ? { company: body.company } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.mobile !== undefined ? { mobile: body.mobile } : {}),
        ...(body.street !== undefined ? { street: body.street } : {}),
        ...(body.city !== undefined ? { city: body.city } : {}),
        ...(body.postalCode !== undefined ? { postalCode: body.postalCode } : {}),
        ...(body.afm !== undefined ? { afm: body.afm } : {}),
        ...(body.doy !== undefined ? { doy: body.doy } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        ...(body.revenue !== undefined ? { revenue: body.revenue } : {}),
        ...(body.isVip !== undefined ? { isVip: body.isVip } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(customers.id, id), eq(customers.orgId, orgId)))
      .returning();

    if (updated.length === 0) {
      return jsonError('Customer not found', 404, 'NOT_FOUND', requestId);
    }

    return NextResponse.json({ ...updated[0], requestId });
  } catch (error) {
    return handleApiError('customers:id:put', error, requestId, {
      message: 'Failed to update customer',
    });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();
  try {
    const session = await requireSession();
    if (!session) return jsonError('Unauthorized', 401, 'UNAUTHORIZED', requestId);
    const orgId = getOrgIdFromSession(session);

    const { id } = await params;

    const deleted = await db
      .delete(customers)
      .where(and(eq(customers.id, id), eq(customers.orgId, orgId)))
      .returning();

    if (deleted.length === 0) {
      return jsonError('Customer not found', 404, 'NOT_FOUND', requestId);
    }

    return NextResponse.json({ success: true, requestId, deleted: deleted[0] });
  } catch (error) {
    return handleApiError('customers:id:delete', error, requestId, {
      message: 'Failed to delete customer',
    });
  }
}
