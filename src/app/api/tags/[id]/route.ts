import { NextRequest, NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import { customerTags, customers, db, tags } from '@/lib/db';
import {
  createRequestId,
  handleApiError,
  jsonError,
  withValidatedBody,
} from '@/server/api/http';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

const TagUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  description: z.string().trim().max(400).nullable().optional(),
});

// GET /api/tags/:id - Get single tag with customer count
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

    const tag = await db.query.tags.findFirst({
      where: and(eq(tags.id, id), eq(tags.orgId, orgId)),
    });
    if (!tag) return jsonError('Tag not found', 404, 'NOT_FOUND', requestId);

    const [customerCountResult] = await db
      .select({ count: sql<number>`count(DISTINCT ${customers.id})` })
      .from(customerTags)
      .innerJoin(customers, eq(customerTags.customerId, customers.id))
      .where(and(eq(customerTags.tagId, id), eq(customers.orgId, orgId)));

    return NextResponse.json({
      requestId,
      tag: {
        ...tag,
        customerCount: customerCountResult?.count || 0,
      },
    });
  } catch (error) {
    return handleApiError('tags:id:get', error, requestId, { message: 'Failed to fetch tag' });
  }
}

// PUT /api/tags/:id - Update tag
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
    const body = await withValidatedBody(request, TagUpdateSchema, { maxBytes: 50_000 });

    const existing = await db.query.tags.findFirst({
      where: and(eq(tags.id, id), eq(tags.orgId, orgId)),
    });
    if (!existing) return jsonError('Tag not found', 404, 'NOT_FOUND', requestId);

    const [updatedTag] = await db
      .update(tags)
      .set({
        name: body.name || existing.name,
        color: body.color || existing.color,
        description: body.description !== undefined ? body.description : existing.description,
      })
      .where(and(eq(tags.id, id), eq(tags.orgId, orgId)))
      .returning();

    return NextResponse.json({ requestId, tag: updatedTag });
  } catch (error) {
    return handleApiError('tags:id:put', error, requestId, { message: 'Failed to update tag' });
  }
}

// DELETE /api/tags/:id - Delete tag
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

    await db.delete(tags).where(and(eq(tags.id, id), eq(tags.orgId, orgId)));
    return NextResponse.json({ success: true, requestId });
  } catch (error) {
    return handleApiError('tags:id:delete', error, requestId, {
      message: 'Failed to delete tag',
    });
  }
}
