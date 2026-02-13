import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db, segments } from '@/lib/db';
import {
  createRequestId,
  handleApiError,
  jsonError,
  withValidatedBody,
} from '@/server/api/http';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

const SegmentConditionSchema = z.object({
  field: z.string().trim().min(1).max(64),
  operator: z.string().trim().min(1).max(32),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
});

const SegmentFiltersSchema = z.object({
  logic: z.enum(['and', 'or']).default('and'),
  conditions: z.array(SegmentConditionSchema).max(30),
});

const SegmentUpdateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(1_000).nullable().optional(),
  filters: SegmentFiltersSchema.nullable().optional(),
});

// GET /api/segments/:id - Get single segment
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
    return NextResponse.json({ segment, requestId });
  } catch (error) {
    return handleApiError('segments:id:get', error, requestId, {
      message: 'Failed to fetch segment',
    });
  }
}

// PUT /api/segments/:id - Update segment
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
      maxBytes: 120_000,
    });

    const existing = await db.query.segments.findFirst({
      where: and(eq(segments.id, id), eq(segments.orgId, orgId)),
    });
    if (!existing) return jsonError('Segment not found', 404, 'NOT_FOUND', requestId);

    const [updatedSegment] = await db
      .update(segments)
      .set({
        name: body.name || existing.name,
        description: body.description !== undefined ? body.description : existing.description,
        filters: body.filters !== undefined ? body.filters : existing.filters,
        updatedAt: new Date(),
      })
      .where(and(eq(segments.id, id), eq(segments.orgId, orgId)))
      .returning();

    return NextResponse.json({ segment: updatedSegment, requestId });
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
