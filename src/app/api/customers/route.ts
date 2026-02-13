import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, inArray, like, or, sql, type SQL } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { db } from '@/lib/db';
import { customers, customerTags, tags } from '@/lib/db/schema';
import {
  createRequestId,
  handleApiError,
  parsePagination,
  withValidatedBody,
} from '@/server/api/http';
import { customerCreateRequestSchema } from '@/server/api/drizzle-schemas';
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

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim().slice(0, 120);
    const category = (searchParams.get('category') || '').trim();
    const city = (searchParams.get('city') || '').trim().slice(0, 120);
    const { page, limit, offset } = parsePagination(searchParams, {
      defaultPage: 1,
      defaultLimit: 50,
      maxLimit: 100,
    });

    const whereParts: SQL[] = [eq(customers.orgId, orgId)];

    if (search) {
      const s = `%${search}%`;
      whereParts.push(
        or(
          like(customers.firstName, s),
          like(customers.lastName, s),
          like(customers.company, s),
          like(customers.email, s),
          like(customers.phone, s),
          like(customers.mobile, s),
          like(customers.afm, s)
        ) as SQL
      );
    }

    if (category && CustomerCategorySchema.safeParse(category).success) {
      whereParts.push(eq(customers.category, category));
    }

    if (city) {
      whereParts.push(like(customers.city, `%${city}%`));
    }

    const query = db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        company: customers.company,
        email: customers.email,
        phone: customers.phone,
        mobile: customers.mobile,
        city: customers.city,
        category: customers.category,
        revenue: customers.revenue,
        isVip: customers.isVip,
        afm: customers.afm,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      })
      .from(customers)
      .where(and(...whereParts))
      .orderBy(desc(customers.createdAt))
      .limit(limit)
      .offset(offset);

    const allCustomers = await query;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(and(...whereParts));

    const total = countResult[0]?.count || 0;

    const customerIds = allCustomers.map((c) => c.id);
    const customerTagsData =
      customerIds.length > 0
        ? await db
            .select({
              customerId: customerTags.customerId,
              tagId: tags.id,
              tagName: tags.name,
              tagColor: tags.color,
            })
            .from(customerTags)
            .innerJoin(tags, eq(customerTags.tagId, tags.id))
            .where(and(eq(tags.orgId, orgId), inArray(customerTags.customerId, customerIds)))
        : [];

    const customersWithTags = allCustomers.map((customer) => ({
      ...customer,
      tags: customerTagsData
        .filter((ct) => ct.customerId === customer.id)
        .map((ct) => ({ id: ct.tagId, name: ct.tagName, color: ct.tagColor })),
    }));

    return NextResponse.json({
      requestId,
      customers: customersWithTags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError('customers:get', error, requestId, {
      message: 'Failed to fetch customers',
    });
  }
}

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

    const body = await withValidatedBody(request, customerCreateRequestSchema, {
      maxBytes: 200_000,
    });

    const newCustomer = await db
      .insert(customers)
      .values({
        id: `cust_${nanoid()}`,
        orgId,
        firstName: body.firstName,
        lastName: body.lastName || null,
        company: body.company || null,
        email: body.email || null,
        phone: body.phone || null,
        mobile: body.mobile || null,
        street: body.street || null,
        city: body.city || null,
        postalCode: body.postalCode || null,
        country: body.country || 'Ελλάδα',
        afm: body.afm || null,
        doy: body.doy || null,
        category: body.category || 'retail',
        revenue: body.revenue || 0,
        isVip: body.isVip || false,
        notes: body.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: session.user.id,
      })
      .returning();

    return NextResponse.json({ ...newCustomer[0], requestId }, { status: 201 });
  } catch (error) {
    return handleApiError('customers:post', error, requestId, {
      message: 'Failed to create customer',
    });
  }
}
