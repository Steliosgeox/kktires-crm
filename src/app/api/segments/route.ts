import { NextRequest, NextResponse } from 'next/server';
import {
  and,
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
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { customers, db, segmentCustomers, segments } from '@/lib/db';
import { createRequestId, handleApiError, withValidatedBody } from '@/server/api/http';
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

const SegmentCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1_000).nullable().optional(),
  filters: SegmentFiltersSchema.nullable().optional(),
  staticCustomerIds: z.array(z.string().trim().min(1).max(80)).max(10_000).optional(),
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

// GET /api/segments - Get all segments with resolved customer counts
export async function GET() {
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

    const allSegments = await db.query.segments.findMany({
      where: eq(segments.orgId, orgId),
      orderBy: (segmentTable, { desc }) => [desc(segmentTable.createdAt)],
    });

    const segmentsWithCounts = await Promise.all(
      allSegments.map(async (segment) => {
        try {
          const parsedFilters = SegmentFiltersSchema.nullish().parse(segment.filters);
          const [dynamicIds, staticIds] = await Promise.all([
            getDynamicCustomerIds(orgId, parsedFilters),
            getStaticCustomerIds(orgId, segment.id),
          ]);
          const resolved = new Set([...dynamicIds, ...staticIds]);
          return {
            ...segment,
            dynamicCount: dynamicIds.length,
            staticCount: staticIds.length,
            customerCount: resolved.size,
            staticCustomerIds: staticIds,
          };
        } catch {
          return {
            ...segment,
            dynamicCount: 0,
            staticCount: 0,
            customerCount: 0,
            staticCustomerIds: [] as string[],
          };
        }
      })
    );

    return NextResponse.json({ segments: segmentsWithCounts, requestId });
  } catch (error) {
    return handleApiError('segments:get', error, requestId, {
      message: 'Failed to fetch segments',
    });
  }
}

// POST /api/segments - Create new segment
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
    const body = await withValidatedBody(request, SegmentCreateSchema, { maxBytes: 300_000 });

    const staticCustomerIds = Array.from(new Set(body.staticCustomerIds || []));
    if (staticCustomerIds.length > 0) {
      const validCustomers = await db
        .select({ id: customers.id })
        .from(customers)
        .where(and(eq(customers.orgId, orgId), inArray(customers.id, staticCustomerIds)));
      if (validCustomers.length !== staticCustomerIds.length) {
        return NextResponse.json(
          { error: 'Some selected customers do not belong to this organization', code: 'BAD_REQUEST', requestId },
          { status: 400 }
        );
      }
    }

    const parsedFilters = body.filters || null;
    const dynamicIds = await getDynamicCustomerIds(orgId, parsedFilters);
    const resolvedCount = new Set([...dynamicIds, ...staticCustomerIds]).size;

    const segmentId = nanoid();
    const now = new Date();

    const [newSegment] = await db
      .insert(segments)
      .values({
        id: segmentId,
        orgId,
        name: body.name,
        description: body.description || null,
        filters: parsedFilters,
        customerCount: resolvedCount,
        createdBy: session.user.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (staticCustomerIds.length > 0) {
      await db.insert(segmentCustomers).values(
        staticCustomerIds.map((customerId) => ({
          id: `scm_${nanoid()}`,
          segmentId,
          customerId,
          createdAt: now,
        }))
      );
    }

    return NextResponse.json({
      segment: {
        ...newSegment,
        staticCustomerIds,
        customerCount: resolvedCount,
      },
      requestId,
    });
  } catch (error) {
    return handleApiError('segments:post', error, requestId, {
      message: 'Failed to create segment',
    });
  }
}
