import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull, ne, or, sql } from 'drizzle-orm';
import { z } from 'zod';

import { customers, db } from '@/lib/db';
import { CUSTOMER_CATEGORIES, type CustomerCategory } from '@/lib/customers/category';
import {
  createRequestId,
  handleApiError,
  jsonError,
  withValidatedBody,
} from '@/server/api/http';
import { getOrgIdFromSession, hasRole, requireSession } from '@/server/authz';

const TargetCategorySchema = z.enum(CUSTOMER_CATEGORIES);

const StandardizeBodySchema = z.object({
  target: TargetCategorySchema,
  confirm: z.literal(true),
});

async function ensureAuthorized(requestId: string) {
  const session = await requireSession();
  if (!session) {
    return { error: jsonError('Unauthorized', 401, 'UNAUTHORIZED', requestId) as Response };
  }
  if (!hasRole(session, ['owner', 'admin'])) {
    return { error: jsonError('Forbidden', 403, 'FORBIDDEN', requestId) as Response };
  }
  return { session };
}

async function getPreview(orgId: string, target: CustomerCategory) {
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(customers)
    .where(eq(customers.orgId, orgId));

  const alreadyTargetResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(customers)
    .where(and(eq(customers.orgId, orgId), eq(customers.category, target)));

  const byCategoryRows = await db
    .select({
      category: customers.category,
      count: sql<number>`count(*)`,
    })
    .from(customers)
    .where(eq(customers.orgId, orgId))
    .groupBy(customers.category);

  const total = totalResult[0]?.count ?? 0;
  const alreadyTarget = alreadyTargetResult[0]?.count ?? 0;
  const willChange = Math.max(0, total - alreadyTarget);

  const byCategory = byCategoryRows.reduce<Record<string, number>>((acc, row) => {
    const key = row.category ?? 'uncategorized';
    acc[key] = row.count;
    return acc;
  }, {});

  return {
    total,
    alreadyTarget,
    willChange,
    byCategory,
  };
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const authResult = await ensureAuthorized(requestId);
    if (authResult.error) return authResult.error;

    const targetParam = new URL(request.url).searchParams.get('target');
    const targetParsed = TargetCategorySchema.safeParse(targetParam);
    if (!targetParsed.success) {
      return jsonError('Invalid target category', 400, 'BAD_REQUEST', requestId);
    }

    const orgId = getOrgIdFromSession(authResult.session);
    const preview = await getPreview(orgId, targetParsed.data);

    return NextResponse.json({
      requestId,
      target: targetParsed.data,
      ...preview,
    });
  } catch (error) {
    return handleApiError('customers:categories:standardize:get', error, requestId, {
      message: 'Failed to preview category standardization',
    });
  }
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const authResult = await ensureAuthorized(requestId);
    if (authResult.error) return authResult.error;

    const body = await withValidatedBody(request, StandardizeBodySchema, {
      maxBytes: 32_000,
    });

    const orgId = getOrgIdFromSession(authResult.session);

    const preview = await getPreview(orgId, body.target);

    const updated = await db
      .update(customers)
      .set({
        category: body.target,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customers.orgId, orgId),
          or(ne(customers.category, body.target), isNull(customers.category))
        )
      )
      .returning({ id: customers.id });

    return NextResponse.json({
      requestId,
      target: body.target,
      updatedCount: updated.length,
      alreadyTargetCount: preview.alreadyTarget,
      total: preview.total,
    });
  } catch (error) {
    return handleApiError('customers:categories:standardize:post', error, requestId, {
      message: 'Failed to standardize customer categories',
    });
  }
}
