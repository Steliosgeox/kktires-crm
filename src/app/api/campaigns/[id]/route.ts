import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db';
import { emailCampaigns } from '@/lib/db/schema';
import {
  listEmailAssetsForCampaign,
  migrateInlineDataImagesToAssets,
  normalizeCampaignAssetsInput,
  syncCampaignAssets,
} from '@/server/email/assets';
import {
  createRequestId,
  handleApiError,
  jsonError,
  withValidatedBody,
} from '@/server/api/http';
import { countRecipients, normalizeRecipientFilters } from '@/server/email/recipients';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

function isMissingColumnError(error: unknown, columnName: string): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /no such column/i.test(message) && message.toLowerCase().includes(columnName.toLowerCase());
}

function isForeignKeyError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /foreign key/i.test(message);
}

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
  content: z.string().max(1_000_000).optional(),
  status: campaignStatusSchema.optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  recipientFilters: z.unknown().optional(),
  signatureId: z.string().trim().max(64).optional().nullable(),
  assets: z
    .object({
      attachments: z.array(z.string().trim().min(1).max(64)).max(200).optional(),
      inlineImages: z
        .array(
          z.object({
            assetId: z.string().trim().min(1).max(64),
            embedInline: z.boolean().optional(),
            widthPx: z.number().int().positive().max(2400).nullable().optional(),
            align: z.enum(['left', 'center', 'right']).nullable().optional(),
            alt: z.string().max(500).nullable().optional(),
            sortOrder: z.number().int().min(0).max(10_000).optional(),
          })
        )
        .max(500)
        .optional(),
    })
    .optional(),
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

    const assets = await listEmailAssetsForCampaign(orgId, id);
    return NextResponse.json({ ...campaign, assets, requestId });
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
    const body = await withValidatedBody(request, campaignUpdateSchema, { maxBytes: 1_500_000 });

    let scheduledAtDate: Date | null = null;
    if (body.scheduledAt) {
      const parsed = new Date(body.scheduledAt);
      if (!isNaN(parsed.getTime())) {
        scheduledAtDate = parsed;
      }
    }

    const recipientFilters =
      body.recipientFilters !== undefined ? normalizeRecipientFilters(body.recipientFilters) : undefined;

    let totalRecipients: number | undefined;
    if (recipientFilters !== undefined) {
      try {
        totalRecipients = await countRecipients(orgId, recipientFilters);
      } catch (error) {
        // Avoid blocking save due to recipient-count query drift; send path re-validates recipients.
        console.error(`[campaigns:id:put] requestId=${requestId} recipient count failed`, error);
        totalRecipients = undefined;
      }
    }

    const setValues: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) setValues.name = body.name;
    if (body.subject !== undefined) setValues.subject = body.subject;
    const normalizedAssets = normalizeCampaignAssetsInput(body.assets);
    if (body.content !== undefined) {
      const migratedInline = await migrateInlineDataImagesToAssets({
        html: body.content,
        orgId,
        uploaderUserId: session.user.id,
      });
      setValues.content = migratedInline.html;
      for (const migrated of migratedInline.inlineImages) {
        if (!normalizedAssets.inlineImages.some((item) => item.assetId === migrated.assetId)) {
          normalizedAssets.inlineImages.push(migrated);
        }
      }
    }
    if (body.status !== undefined) setValues.status = body.status;
    if (body.scheduledAt !== undefined) setValues.scheduledAt = scheduledAtDate;
    if (recipientFilters !== undefined) {
      setValues.recipientFilters = recipientFilters;
      if (totalRecipients !== undefined) setValues.totalRecipients = totalRecipients;
    }
    if (body.signatureId !== undefined) setValues.signatureId = body.signatureId || null;

    const runUpdate = async (values: Record<string, unknown>) =>
      db
        .update(emailCampaigns)
        .set(values as any)
        .where(and(eq(emailCampaigns.id, id), eq(emailCampaigns.orgId, orgId)))
        .returning();

    let updated;
    try {
      updated = await runUpdate(setValues);
    } catch (error) {
      // Legacy DB fallback: retry without newer optional columns that may not exist yet.
      if (isMissingColumnError(error, 'recipient_filters')) {
        delete setValues.recipientFilters;
        delete setValues.totalRecipients;
      }
      if (isMissingColumnError(error, 'signature_id')) {
        delete setValues.signatureId;
      }
      if (isForeignKeyError(error)) {
        setValues.signatureId = null;
      }

      if (
        isMissingColumnError(error, 'recipient_filters') ||
        isMissingColumnError(error, 'signature_id') ||
        isForeignKeyError(error)
      ) {
        updated = await runUpdate(setValues);
      } else {
        throw error;
      }
    }

    if (updated.length === 0) {
      return jsonError('Campaign not found', 404, 'NOT_FOUND', requestId);
    }

    if (body.assets !== undefined || normalizedAssets.inlineImages.length > 0) {
      await syncCampaignAssets({
        orgId,
        campaignId: id,
        assets: normalizedAssets,
      });
    }

    const assets = await listEmailAssetsForCampaign(orgId, id);
    return NextResponse.json({ ...updated[0], assets, requestId });
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
