import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/lib/db';
import { leads } from '@/lib/db/schema';
import { createRequestId, handleApiError, jsonError, withValidatedBody } from '@/server/api/http';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

const LeadPatchSchema = z.object({
  firstName: z.string().trim().min(1).max(120).optional(),
  lastName: z.string().trim().max(120).nullable().optional(),
  company: z.string().trim().max(200).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  phone: z.string().trim().max(64).nullable().optional(),
  source: z.enum(['website', 'referral', 'import', 'manual']).optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']).optional(),
  score: z.number().int().min(0).max(100).nullable().optional(),
  notes: z.string().trim().max(8000).nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();

  try {
    const session = await requireSession();
    if (!session) return jsonError('Unauthorized', 401, 'UNAUTHORIZED', requestId);
    const orgId = getOrgIdFromSession(session);
    const { id } = await params;
    const body = await withValidatedBody(request, LeadPatchSchema, { maxBytes: 120_000 });

    const [updated] = await db
      .update(leads)
      .set({
        ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
        ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
        ...(body.company !== undefined ? { company: body.company } : {}),
        ...(body.email !== undefined ? { email: body.email ? body.email.toLowerCase() : null } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.source !== undefined ? { source: body.source } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.score !== undefined ? { score: body.score } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(leads.id, id), eq(leads.orgId, orgId)))
      .returning();

    if (!updated) return jsonError('Lead not found', 404, 'NOT_FOUND', requestId);
    return NextResponse.json({ ...updated, requestId });
  } catch (error) {
    return handleApiError('leads:id:patch', error, requestId, {
      message: 'Failed to update lead',
    });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return PATCH(request, { params });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();

  try {
    const session = await requireSession();
    if (!session) return jsonError('Unauthorized', 401, 'UNAUTHORIZED', requestId);
    const orgId = getOrgIdFromSession(session);
    const { id } = await params;
    const [deleted] = await db
      .delete(leads)
      .where(and(eq(leads.id, id), eq(leads.orgId, orgId)))
      .returning({ id: leads.id });

    if (!deleted) return jsonError('Lead not found', 404, 'NOT_FOUND', requestId);
    return NextResponse.json({ ok: true, requestId });
  } catch (error) {
    return handleApiError('leads:id:delete', error, requestId, {
      message: 'Failed to delete lead',
    });
  }
}
