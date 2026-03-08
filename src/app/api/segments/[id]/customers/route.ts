import { NextRequest, NextResponse } from 'next/server';
import {
  and,
  asc,
  count,
  eq,
  gt,
  gte,
  inArray,
  like,
  lt,
  lte,
  ne,
  or,
  type SQL,
} from 'drizzle-orm';
import { z } from 'zod';

import { customers, db, segmentCustomers, segments } from '@/lib/db';
import {
  createRequestId,
  handleApiError,
  jsonError,
  parsePagination,
} from '@/server/api/http';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

const SEGMENTABLE_COLUMNS = {
  firstName: customers.firstName,
  lastName: customers.lastName,
  company: customers.company,
  email: customers.email,
  city: customers.city,
  country: customers.country,
  category: customers.category,
  lifecycleStage: customers.lifecycleStage,
  revenue: customers.revenue,
  isVip: customers.isVip,
  leadScore: customers.leadScore,
} as const;

const SegmentFieldSchema = z.enum(
  Object.keys(SEGMENTABLE_COLUMNS) as [keyof typeof SEGMENTABLE_COLUMNS, ...(keyof typeof SEGMENTABLE_COLUMNS)[]]
);

const SegmentOperatorSchema = z.enum([
  'equals',
  'contains',
  'startsWith',
  'greaterThan',
  'lessThan',
  'greaterOrEqual',
  'lessOrEqual',
  'notEquals',
]);

const SegmentConditionSchema = z.object({
  field: SegmentFieldSchema,
  operator: SegmentOperatorSchema,
  value: z.union([z.string().max(250), z.number(), z.boolean(), z.null()]),
});

const SegmentFiltersSchema = z.object({
  logic: z.enum(['and', 'or']).default('and'),
  conditions: z.array(SegmentConditionSchema).max(30),
});

function buildCondition(condition: z.infer<typeof SegmentConditionSchema>): SQL | null {
  const column = SEGMENTABLE_COLUMNS[condition.field];
  const value = condition.value;

  switch (condition.operator) {
    case 'equals':
      return eq(column, value as never);
    case 'contains':
      return typeof value === 'string' ? like(column, `%${value}%`) : null;
    case 'startsWith':
      return typeof value === 'string' ? like(column, `${value}%`) : null;
    case 'greaterThan':
      return typeof value === 'number' ? gt(column as never, value) : null;
    case 'lessThan':
      return typeof value === 'number' ? lt(column as never, value) : null;
    case 'greaterOrEqual':
      return typeof value === 'number' ? gte(column as never, value) : null;
    case 'lessOrEqual':
      return typeof value === 'number' ? lte(column as never, value) : null;
    case 'notEquals':
      return ne(column, value as never);
    default:
      return null;
  }
}

function buildWhereForFilters(
  orgId: string,
  filters: z.infer<typeof SegmentFiltersSchema> | null | undefined
): SQL {
  if (!filters || filters.conditions.length === 0) {
    return and(eq(customers.orgId, orgId)) as SQL;
  }

  const built = filters.conditions.map(buildCondition).filter(Boolean) as SQL[];
  if (built.length === 0) {
    return and(eq(customers.orgId, orgId)) as SQL;
  }

  return filters.logic === 'or'
    ? (and(eq(customers.orgId, orgId), or(...built)) as SQL)
    : (and(eq(customers.orgId, orgId), ...built) as SQL);
}

async function getDynamicCustomerIds(
  orgId: string,
  filters: z.infer<typeof SegmentFiltersSchema> | null | undefined
): Promise<string[]> {
  if (!filters || filters.conditions.length === 0) return [];
  const where = buildWhereForFilters(orgId, filters);
  const rows = await db.select({ id: customers.id }).from(customers).where(where);
  return rows.map((row) => row.id);
}

async function getStaticCustomerIds(orgId: string, segmentId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ customerId: segmentCustomers.customerId })
    .from(segmentCustomers)
    .innerJoin(customers, eq(customers.id, segmentCustomers.customerId))
    .where(and(eq(segmentCustomers.segmentId, segmentId), eq(customers.orgId, orgId)));
  return rows.map((row) => row.customerId);
}

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

    const segment = await db.query.segments.findFirst({
      where: and(eq(segments.id, id), eq(segments.orgId, orgId)),
    });
    if (!segment) return jsonError('Segment not found', 404, 'NOT_FOUND', requestId);

    const parsedFilters = SegmentFiltersSchema.nullish().parse(segment.filters);
    const [dynamicIds, staticIds] = await Promise.all([
      getDynamicCustomerIds(orgId, parsedFilters),
      getStaticCustomerIds(orgId, id),
    ]);
    const resolvedIds = Array.from(new Set([...dynamicIds, ...staticIds]));

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim().slice(0, 120);
    const { page, limit, offset } = parsePagination(searchParams, {
      defaultPage: 1,
      defaultLimit: 50,
      maxLimit: 200,
    });

    if (resolvedIds.length === 0) {
      return NextResponse.json({
        requestId,
        segment: { id: segment.id, name: segment.name },
        summary: {
          dynamicCount: dynamicIds.length,
          staticCount: staticIds.length,
          totalResolved: 0,
        },
        customers: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    const whereParts = [eq(customers.orgId, orgId), inArray(customers.id, resolvedIds)];
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
        .from(customers)
        .where(and(...whereParts))
        .orderBy(asc(customers.firstName), asc(customers.lastName))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(customers)
        .where(and(...whereParts)),
    ]);

    const total = totalRows[0]?.count || 0;

    return NextResponse.json({
      requestId,
      segment: {
        id: segment.id,
        name: segment.name,
      },
      summary: {
        dynamicCount: dynamicIds.length,
        staticCount: staticIds.length,
        totalResolved: resolvedIds.length,
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
    return handleApiError('segments:id:customers:get', error, requestId, {
      message: 'Failed to fetch segment customers',
    });
  }
}
