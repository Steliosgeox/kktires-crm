import { NextRequest, NextResponse } from 'next/server';
import {
  and,
  count,
  eq,
  gt,
  gte,
  like,
  lt,
  lte,
  ne,
  or,
  type SQL,
} from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { customers, db, segments } from '@/lib/db';
import { createRequestId, handleApiError, withValidatedBody } from '@/server/api/http';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

const SEGMENTABLE_COLUMNS = {
  firstName: customers.firstName,
  lastName: customers.lastName,
  company: customers.company,
  email: customers.email,
  city: customers.city,
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

// GET /api/segments - Get all segments with customer counts
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
          const where = buildWhereForFilters(orgId, SegmentFiltersSchema.nullish().parse(segment.filters));
          const [result] = await db.select({ count: count() }).from(customers).where(where);
          return { ...segment, customerCount: result?.count || 0 };
        } catch {
          return { ...segment, customerCount: 0 };
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
    const body = await withValidatedBody(request, SegmentCreateSchema, { maxBytes: 120_000 });
    const now = new Date();

    const [newSegment] = await db
      .insert(segments)
      .values({
        id: nanoid(),
        orgId,
        name: body.name,
        description: body.description || null,
        filters: body.filters || null,
        customerCount: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json({ segment: newSegment, requestId });
  } catch (error) {
    return handleApiError('segments:post', error, requestId, {
      message: 'Failed to create segment',
    });
  }
}
