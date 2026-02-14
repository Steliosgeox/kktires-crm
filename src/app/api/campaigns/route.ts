import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { db } from '@/lib/db';
import { emailCampaigns, emailSignatures, organizations } from '@/lib/db/schema';
import {
  createRequestId,
  handleApiError,
  jsonError,
  parsePagination,
  withValidatedBody,
} from '@/server/api/http';
import { getOrgIdFromSession, requireSession } from '@/server/authz';
import { countRecipients, normalizeRecipientFilters } from '@/server/email/recipients';
import {
  migrateInlineDataImagesToAssets,
  normalizeCampaignAssetsInput,
  syncCampaignAssets,
} from '@/server/email/assets';
import {
  getErrorMessages,
  healEmailCampaignSchema,
  isSchemaError,
  rawInsertCampaign,
} from '@/server/db/auto-heal';

const campaignStatusSchema = z.enum([
  'draft',
  'scheduled',
  'sending',
  'sent',
  'paused',
  'cancelled',
  'failed',
]);

const campaignCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
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

function makeOrgSlug(orgId: string): string {
  const base = orgId
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = orgId.slice(-6).toLowerCase();
  return `${base || 'org'}-${suffix}`.slice(0, 63);
}

async function ensureOrganizationExists(orgId: string) {
  const [existingOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  if (existingOrg) return;

  await db
    .insert(organizations)
    .values({
      id: orgId,
      name: 'KK Tires',
      slug: makeOrgSlug(orgId),
      settings: {
        currency: 'EUR',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        timezone: 'Europe/Athens',
        language: 'el',
      },
      subscriptionTier: 'free',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = parsePagination(searchParams, {
      defaultPage: 1,
      defaultLimit: 20,
      maxLimit: 100,
    });

    const [allCampaigns, countResult, statsResult] = await Promise.all([
      db
        .select({
          id: emailCampaigns.id,
          name: emailCampaigns.name,
          subject: emailCampaigns.subject,
          status: emailCampaigns.status,
          scheduledAt: emailCampaigns.scheduledAt,
          sentAt: emailCampaigns.sentAt,
          totalRecipients: emailCampaigns.totalRecipients,
          sentCount: emailCampaigns.sentCount,
          openCount: emailCampaigns.openCount,
          clickCount: emailCampaigns.clickCount,
          createdAt: emailCampaigns.createdAt,
        })
        .from(emailCampaigns)
        .where(eq(emailCampaigns.orgId, orgId))
        .orderBy(desc(emailCampaigns.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(emailCampaigns).where(eq(emailCampaigns.orgId, orgId)),
      db
        .select({
          totalSent: sql<number>`COALESCE(SUM(${emailCampaigns.sentCount}), 0)`,
          totalOpens: sql<number>`COALESCE(SUM(${emailCampaigns.openCount}), 0)`,
          totalClicks: sql<number>`COALESCE(SUM(${emailCampaigns.clickCount}), 0)`,
        })
        .from(emailCampaigns)
        .where(eq(emailCampaigns.orgId, orgId)),
    ]);

    const total = countResult[0]?.count || 0;
    const stats = statsResult[0] || { totalSent: 0, totalOpens: 0, totalClicks: 0 };

    return NextResponse.json({
      requestId,
      campaigns: allCampaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalSent: stats.totalSent,
        openRate: stats.totalSent > 0 ? ((stats.totalOpens / stats.totalSent) * 100).toFixed(1) : '0',
        clickRate: stats.totalOpens > 0 ? ((stats.totalClicks / stats.totalOpens) * 100).toFixed(1) : '0',
      },
    });
  } catch (error) {
    return handleApiError('campaigns:get', error, requestId, {
      message: 'Failed to fetch campaigns',
    });
  }
}

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

    // Keep campaign creation resilient in environments where auth/org bootstrap was skipped.
    try {
      await ensureOrganizationExists(orgId);
    } catch (error) {
      console.error(`[campaigns:post] requestId=${requestId} ensureOrganizationExists failed`, error);
    }

    const body = await withValidatedBody(request, campaignCreateSchema, { maxBytes: 1_500_000 });
    const recipientFilters = normalizeRecipientFilters(body.recipientFilters);
    let totalRecipients = 0;
    try {
      totalRecipients = await countRecipients(orgId, recipientFilters);
    } catch (error) {
      // Avoid blocking draft creation due to recipient-count query drift; send path re-validates recipients.
      console.error(`[campaigns:post] requestId=${requestId} recipient count failed`, error);
    }
    let content = body.content || '';
    let migratedInlineImages: Awaited<ReturnType<typeof migrateInlineDataImagesToAssets>>['inlineImages'] = [];
    try {
      const migratedInline = await migrateInlineDataImagesToAssets({
        html: content,
        orgId,
        uploaderUserId: session.user.id,
      });
      content = migratedInline.html;
      migratedInlineImages = migratedInline.inlineImages;
    } catch (error) {
      // Blob storage may not be configured; proceed with raw content.
      console.error(`[campaigns:post] requestId=${requestId} inline image migration failed`, error);
    }

    const normalizedAssets = normalizeCampaignAssetsInput(body.assets);
    for (const migrated of migratedInlineImages) {
      if (!normalizedAssets.inlineImages.some((item) => item.assetId === migrated.assetId)) {
        normalizedAssets.inlineImages.push(migrated);
      }
    }

    let signatureId: string | null = null;
    if (body.signatureId) {
      try {
        const [signature] = await db
          .select({ id: emailSignatures.id })
          .from(emailSignatures)
          .where(and(eq(emailSignatures.id, body.signatureId), eq(emailSignatures.orgId, orgId)))
          .limit(1);
        if (!signature) {
          return jsonError('Selected signature not found', 400, 'BAD_REQUEST', requestId);
        }
        signatureId = body.signatureId;
      } catch (sigError) {
        // Signature table may not exist or query may fail; proceed without a signature.
        console.error(`[campaigns:post] requestId=${requestId} signature lookup failed`, sigError);
        signatureId = null;
      }
    }

    let scheduledAtDate: Date | null = null;
    if (body.scheduledAt) {
      const parsed = new Date(body.scheduledAt);
      if (!isNaN(parsed.getTime())) {
        scheduledAtDate = parsed;
      }
    }

    const campaignId = `camp_${nanoid()}`;
    const now = new Date();

    const campaignValues: Record<string, unknown> = {
      id: campaignId,
      orgId,
      name: body.name,
      subject: body.subject || body.name,
      content,
      status: body.status || 'draft',
      scheduledAt: scheduledAtDate,
      totalRecipients,
      recipientFilters,
      signatureId,
      createdAt: now,
      updatedAt: now,
    };

    // ── INSERT strategy: Drizzle → heal schema → retry Drizzle → raw fallback ──

    const selectCampaignBack = async (cId: string) => {
      try {
        const row = await db.query.emailCampaigns.findFirst({
          where: (c, { eq: whereEq }) => whereEq(c.id, cId),
        });
        return row ? [row] : [{ id: cId }];
      } catch {
        return [{ id: cId }];
      }
    };

    let newCampaign;
    let lastInsertError: unknown;

    // Attempt 1: standard Drizzle insert
    try {
      newCampaign = await db.insert(emailCampaigns).values(campaignValues as any).returning();
    } catch (error) {
      lastInsertError = error;
      const errMsg = getErrorMessages(error);
      console.error(`[campaigns:post] requestId=${requestId} Drizzle insert failed:`, errMsg);

      // Check for PK collision from a prior attempt
      if (/UNIQUE constraint failed/i.test(errMsg) || /SQLITE_CONSTRAINT/i.test(errMsg)) {
        newCampaign = await selectCampaignBack(campaignId);
      } else if (isSchemaError(error)) {
        // Schema drift detected — heal and retry
        try {
          const healed = await healEmailCampaignSchema();
          console.log(`[campaigns:post] requestId=${requestId} schema healed:`, healed);
        } catch (healError) {
          console.error(`[campaigns:post] requestId=${requestId} schema heal failed:`, healError);
        }

        // Attempt 2: retry Drizzle after heal
        try {
          newCampaign = await db.insert(emailCampaigns).values(campaignValues as any).returning();
        } catch (retryError) {
          lastInsertError = retryError;
          const retryMsg = getErrorMessages(retryError);
          console.error(`[campaigns:post] requestId=${requestId} Drizzle retry failed:`, retryMsg);

          if (/UNIQUE constraint failed/i.test(retryMsg) || /SQLITE_CONSTRAINT/i.test(retryMsg)) {
            newCampaign = await selectCampaignBack(campaignId);
          } else {
            // Attempt 3: raw SQL fallback (only uses columns that exist in the DB)
            try {
              await rawInsertCampaign(campaignValues);
              newCampaign = await selectCampaignBack(campaignId);
              console.log(`[campaigns:post] requestId=${requestId} raw SQL insert succeeded`);
            } catch (rawError) {
              lastInsertError = rawError;
              const rawMsg = getErrorMessages(rawError);
              console.error(`[campaigns:post] requestId=${requestId} raw SQL insert failed:`, rawMsg);

              if (/UNIQUE constraint failed/i.test(rawMsg) || /SQLITE_CONSTRAINT/i.test(rawMsg)) {
                newCampaign = await selectCampaignBack(campaignId);
              }
            }
          }
        }
      }
    }

    if (!newCampaign || newCampaign.length === 0) {
      throw lastInsertError;
    }

    if (normalizedAssets.attachments.length > 0 || normalizedAssets.inlineImages.length > 0) {
      try {
        await syncCampaignAssets({
          orgId,
          campaignId,
          assets: normalizedAssets,
        });
      } catch (error) {
        await db.delete(emailCampaigns).where(eq(emailCampaigns.id, campaignId)).catch(() => undefined);
        throw error;
      }
    }

    return NextResponse.json({ ...newCampaign[0], requestId, assets: normalizedAssets }, { status: 201 });
  } catch (error) {
    // Surface the actual error detail so production failures are diagnosable.
    const detail = getErrorMessages(error);
    console.error(`[campaigns:post] requestId=${requestId} FINAL ERROR:`, error);
    return handleApiError('campaigns:post', error, requestId, {
      message: `Failed to create campaign | ${detail}`,
    });
  }
}
