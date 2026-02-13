import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db';
import { emailTemplates } from '@/lib/db/schema';
import {
  createRequestId,
  handleApiError,
  jsonError,
  withValidatedBody,
} from '@/server/api/http';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

const TemplateUpdateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  subject: z.string().trim().max(300).optional(),
  content: z.string().max(500_000).optional(),
  category: z.string().trim().max(80).nullable().optional(),
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

    const template = await db.query.emailTemplates.findFirst({
      where: (t, { eq: whereEq, and: whereAnd }) => whereAnd(whereEq(t.id, id), whereEq(t.orgId, orgId)),
    });

    if (!template) return jsonError('Template not found', 404, 'NOT_FOUND', requestId);
    return NextResponse.json({ ...template, requestId });
  } catch (error) {
    return handleApiError('templates:id:get', error, requestId, {
      message: 'Failed to fetch template',
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
    const body = await withValidatedBody(request, TemplateUpdateSchema, { maxBytes: 1_000_000 });

    const updated = await db
      .update(emailTemplates)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.subject !== undefined ? { subject: body.subject } : {}),
        ...(body.content !== undefined ? { content: body.content } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.orgId, orgId)))
      .returning();

    if (updated.length === 0) return jsonError('Template not found', 404, 'NOT_FOUND', requestId);
    return NextResponse.json({ ...updated[0], requestId });
  } catch (error) {
    return handleApiError('templates:id:put', error, requestId, {
      message: 'Failed to update template',
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
      .delete(emailTemplates)
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.orgId, orgId)))
      .returning();

    if (deleted.length === 0) return jsonError('Template not found', 404, 'NOT_FOUND', requestId);
    return NextResponse.json({ success: true, requestId });
  } catch (error) {
    return handleApiError('templates:id:delete', error, requestId, {
      message: 'Failed to delete template',
    });
  }
}
