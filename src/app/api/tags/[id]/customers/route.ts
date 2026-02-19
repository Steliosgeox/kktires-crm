import { NextRequest, NextResponse } from 'next/server';
import { and, asc, count, eq, inArray, like, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { customerTags, customers, db, tags } from '@/lib/db';
import {
  createRequestId,
  handleApiError,
  jsonError,
  parsePagination,
  withValidatedBody,
} from '@/server/api/http';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

const TagMembersUpdateSchema = z.object({
  customerIds: z.array(z.string().trim().min(1).max(80)).max(10_000),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();
  try {
    const session = await requireSession();
    if (!session) return jsonError('Unauthorized', 401, 'UNAUTHORIZED', requestId);
    const orgId = getOrgIdFromSession(session);
    const { id } = await params;

    const tag = await db.query.tags.findFirst({
      where: and(eq(tags.id, id), eq(tags.orgId, orgId)),
    });
    if (!tag) return jsonError('Tag not found', 404, 'NOT_FOUND', requestId);

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim().slice(0, 120);
    const { page, limit, offset } = parsePagination(searchParams, {
      defaultPage: 1,
      defaultLimit: 50,
      maxLimit: 200,
    });

    const whereParts = [eq(customerTags.tagId, id), eq(customers.orgId, orgId)];
    if (search) {
      const s = `%${search}%`;
      whereParts.push(
        or(
          like(customers.firstName, s),
          like(customers.lastName, s),
          like(customers.company, s),
          like(customers.email, s)
        ) as never
      );
    }

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: customers.id,
          firstName: customers.firstName,
          lastName: customers.lastName,
          company: customers.company,
          email: customers.email,
          city: customers.city,
          category: customers.category,
          isVip: customers.isVip,
        })
        .from(customerTags)
        .innerJoin(customers, eq(customers.id, customerTags.customerId))
        .where(and(...whereParts))
        .orderBy(asc(customers.firstName), asc(customers.lastName))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(customerTags)
        .innerJoin(customers, eq(customers.id, customerTags.customerId))
        .where(and(...whereParts)),
    ]);

    const total = totalRows[0]?.count || 0;

    return NextResponse.json({
      requestId,
      tag: {
        id: tag.id,
        name: tag.name,
      },
      customers: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError('tags:id:customers:get', error, requestId, {
      message: 'Failed to fetch tag members',
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
    const body = await withValidatedBody(request, TagMembersUpdateSchema, { maxBytes: 300_000 });

    const tag = await db.query.tags.findFirst({
      where: and(eq(tags.id, id), eq(tags.orgId, orgId)),
    });
    if (!tag) return jsonError('Tag not found', 404, 'NOT_FOUND', requestId);

    const customerIds = Array.from(new Set(body.customerIds));
    const validCustomers = customerIds.length
      ? await db
          .select({ id: customers.id })
          .from(customers)
          .where(and(eq(customers.orgId, orgId), inArray(customers.id, customerIds)))
      : [];

    const validCustomerIds = new Set(validCustomers.map((c) => c.id));
    const missingIds = customerIds.filter((customerId) => !validCustomerIds.has(customerId));
    if (missingIds.length > 0) {
      return jsonError('Some customers do not belong to this organization', 400, 'BAD_REQUEST', requestId);
    }

    await db.transaction(async (tx) => {
      const existingRows = await tx
        .select({ id: customerTags.id })
        .from(customerTags)
        .innerJoin(customers, eq(customers.id, customerTags.customerId))
        .where(and(eq(customerTags.tagId, id), eq(customers.orgId, orgId)));

      if (existingRows.length > 0) {
        await tx.delete(customerTags).where(inArray(customerTags.id, existingRows.map((row) => row.id)));
      }

      if (customerIds.length > 0) {
        await tx.insert(customerTags).values(
          customerIds.map((customerId) => ({
            id: `ctag_${nanoid()}`,
            tagId: id,
            customerId,
            createdAt: new Date(),
          }))
        );
      }
    });

    return NextResponse.json({
      requestId,
      success: true,
      tagId: id,
      customerCount: customerIds.length,
    });
  } catch (error) {
    return handleApiError('tags:id:customers:put', error, requestId, {
      message: 'Failed to update tag members',
    });
  }
}
