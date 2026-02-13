import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db';
import { emailCampaigns } from '@/lib/db/schema';
import {
  createRequestId,
  handleApiError,
  jsonError,
  withValidatedBody,
} from '@/server/api/http';
import { countRecipients, normalizeRecipientFilters } from '@/server/email/recipients';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

const campaignStatusSchema = z.enum([
  'draft',
  'scheduled',
  'sending',
  'sent',
  'paused',
  'cancelled',
  'failed',
]);

const campaignUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  subject: z.string().trim().max(300).optional(),
  content: z.string().max(5_000_000).optional(),
  status: campaignStatusSchema.optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  recipientFilters: z.unknown().optional(),
  signatureId: z.string().trim().max(64).optional().nullable(),
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

    const campaign = await db.query.emailCampaigns.findFirst({
      where: (c, { eq: whereEq, and: whereAnd }) => whereAnd(whereEq(c.id, id), whereEq(c.orgId, orgId)),
    });

    if (!campaign) {
      return jsonError('Campaign not found', 404, 'NOT_FOUND', requestId);
    }

    return NextResponse.json({ ...campaign, requestId });
  } catch (error) {
    return handleApiError('campaigns:id:get', error, requestId, {
      message: 'Failed to fetch campaign',
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
    const body = await withValidatedBody(request, campaignUpdateSchema, { maxBytes: 6_000_000 });

    let scheduledAtDate: Date | null = null;
    if (body.scheduledAt) {
      const parsed = new Date(body.scheduledAt);
      if (!isNaN(parsed.getTime())) {
        scheduledAtDate = parsed;
      }
    }

    const recipientFilters =
      body.recipientFilters !== undefined ? normalizeRecipientFilters(body.recipientFilters) : undefined;

    const totalRecipients =
      recipientFilters !== undefined ? await countRecipients(orgId, recipientFilters) : undefined;

    const setValues: Partial<typeof emailCampaigns.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) setValues.name = body.name;
    if (body.subject !== undefined) setValues.subject = body.subject;
    if (body.content !== undefined) setValues.content = body.content;
    if (body.status !== undefined) setValues.status = body.status;
    if (body.scheduledAt !== undefined) setValues.scheduledAt = scheduledAtDate;
    if (recipientFilters !== undefined) {
      setValues.recipientFilters = recipientFilters;
      setValues.totalRecipients = totalRecipients;
    }
    if (body.signatureId !== undefined) setValues.signatureId = body.signatureId || null;

    const updated = await db
      .update(emailCampaigns)
      .set(setValues)
      .where(and(eq(emailCampaigns.id, id), eq(emailCampaigns.orgId, orgId)))
      .returning();

    if (updated.length === 0) {
      return jsonError('Campaign not found', 404, 'NOT_FOUND', requestId);
    }

    return NextResponse.json({ ...updated[0], requestId });
  } catch (error) {
    return handleApiError('campaigns:id:put', error, requestId, {
      message: 'Failed to update campaign',
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
      .delete(emailCampaigns)
      .where(and(eq(emailCampaigns.id, id), eq(emailCampaigns.orgId, orgId)))
      .returning();

    if (deleted.length === 0) {
      return jsonError('Campaign not found', 404, 'NOT_FOUND', requestId);
    }

    return NextResponse.json({ success: true, requestId });
  } catch (error) {
    return handleApiError('campaigns:id:delete', error, requestId, {
      message: 'Failed to delete campaign',
    });
  }
}
