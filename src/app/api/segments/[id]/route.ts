import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gt, gte, inArray, like, lt, lte, ne, or, type SQL } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { customers, db, segmentCustomers, segments } from '@/lib/db';
import {
  createRequestId,
  handleApiError,
  jsonError,
  withValidatedBody,
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

const SegmentUpdateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
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

// GET /api/segments/:id - Get single segment with static members
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

    const segment = await db.query.segments.findFirst({
      where: and(eq(segments.id, id), eq(segments.orgId, orgId)),
    });

    if (!segment) return jsonError('Segment not found', 404, 'NOT_FOUND', requestId);

    const parsedFilters = SegmentFiltersSchema.nullish().parse(segment.filters);
    const [dynamicCustomerIds, staticCustomerIds] = await Promise.all([
      getDynamicCustomerIds(orgId, parsedFilters),
      getStaticCustomerIds(orgId, id),
    ]);
    const customerCount = new Set([...dynamicCustomerIds, ...staticCustomerIds]).size;

    return NextResponse.json({
      segment: {
        ...segment,
        dynamicCount: dynamicCustomerIds.length,
        staticCount: staticCustomerIds.length,
        customerCount,
        staticCustomerIds,
      },
      requestId,
    });
  } catch (error) {
    return handleApiError('segments:id:get', error, requestId, {
      message: 'Failed to fetch segment',
    });
  }
}

// PUT /api/segments/:id - Update segment and static members
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

    const body = await withValidatedBody(request, SegmentUpdateSchema, {
      maxBytes: 300_000,
    });

    const existing = await db.query.segments.findFirst({
      where: and(eq(segments.id, id), eq(segments.orgId, orgId)),
    });
    if (!existing) return jsonError('Segment not found', 404, 'NOT_FOUND', requestId);

    const currentStaticIds = await getStaticCustomerIds(orgId, id);
    const nextStaticCustomerIds = body.staticCustomerIds
      ? Array.from(new Set(body.staticCustomerIds))
      : currentStaticIds;

    if (nextStaticCustomerIds.length > 0) {
      const validCustomers = await db
        .select({ id: customers.id })
        .from(customers)
        .where(and(eq(customers.orgId, orgId), inArray(customers.id, nextStaticCustomerIds)));
      if (validCustomers.length !== nextStaticCustomerIds.length) {
        return jsonError(
          'Some selected customers do not belong to this organization',
          400,
          'BAD_REQUEST',
          requestId
        );
      }
    }

    const nextFilters =
      body.filters !== undefined
        ? body.filters
        : SegmentFiltersSchema.nullish().parse(existing.filters);

    const dynamicCustomerIds = await getDynamicCustomerIds(orgId, nextFilters);
    const customerCount = new Set([...dynamicCustomerIds, ...nextStaticCustomerIds]).size;

    const [updatedSegment] = await db
      .update(segments)
      .set({
        name: body.name || existing.name,
        description: body.description !== undefined ? body.description : existing.description,
        filters: body.filters !== undefined ? body.filters : existing.filters,
        customerCount,
        updatedAt: new Date(),
      })
      .where(and(eq(segments.id, id), eq(segments.orgId, orgId)))
      .returning();

    if (body.staticCustomerIds !== undefined) {
      await db.transaction(async (tx) => {
        const existingRows = await tx
          .select({ id: segmentCustomers.id })
          .from(segmentCustomers)
          .innerJoin(customers, eq(customers.id, segmentCustomers.customerId))
          .where(and(eq(segmentCustomers.segmentId, id), eq(customers.orgId, orgId)));

        if (existingRows.length > 0) {
          await tx
            .delete(segmentCustomers)
            .where(inArray(segmentCustomers.id, existingRows.map((row) => row.id)));
        }

        if (nextStaticCustomerIds.length > 0) {
          await tx.insert(segmentCustomers).values(
            nextStaticCustomerIds.map((customerId) => ({
              id: `scm_${nanoid()}`,
              segmentId: id,
              customerId,
              createdAt: new Date(),
            }))
          );
        }
      });
    }

    return NextResponse.json({
      segment: {
        ...updatedSegment,
        dynamicCount: dynamicCustomerIds.length,
        staticCount: nextStaticCustomerIds.length,
        customerCount,
        staticCustomerIds: nextStaticCustomerIds,
      },
      requestId,
    });
  } catch (error) {
    return handleApiError('segments:id:put', error, requestId, {
      message: 'Failed to update segment',
    });
  }
}

// DELETE /api/segments/:id - Delete segment
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

    await db.delete(segments).where(and(eq(segments.id, id), eq(segments.orgId, orgId)));
    return NextResponse.json({ success: true, requestId });
  } catch (error) {
    return handleApiError('segments:id:delete', error, requestId, {
      message: 'Failed to delete segment',
    });
  }
}
