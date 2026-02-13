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
  content: z.string().max(5_000_000).optional(),
  status: campaignStatusSchema.optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  recipientFilters: z.unknown().optional(),
  signatureId: z.string().trim().max(64).optional().nullable(),
});

function isMissingColumnError(error: unknown, columnName: string): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /no such column/i.test(message) && message.toLowerCase().includes(columnName.toLowerCase());
}

function isForeignKeyError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /foreign key/i.test(message);
}

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

    const body = await withValidatedBody(request, campaignCreateSchema, { maxBytes: 6_000_000 });
    const recipientFilters = normalizeRecipientFilters(body.recipientFilters);
    let totalRecipients = 0;
    try {
      totalRecipients = await countRecipients(orgId, recipientFilters);
    } catch (error) {
      // Avoid blocking draft creation due to recipient-count query drift; send path re-validates recipients.
      console.error(`[campaigns:post] requestId=${requestId} recipient count failed`, error);
    }
    let signatureId: string | null = null;
    if (body.signatureId) {
      const [signature] = await db
        .select({ id: emailSignatures.id })
        .from(emailSignatures)
        .where(and(eq(emailSignatures.id, body.signatureId), eq(emailSignatures.orgId, orgId)))
        .limit(1);
      if (!signature) {
        return jsonError('Selected signature not found', 400, 'BAD_REQUEST', requestId);
      }
      signatureId = body.signatureId;
    }

    let scheduledAtDate: Date | null = null;
    if (body.scheduledAt) {
      const parsed = new Date(body.scheduledAt);
      if (!isNaN(parsed.getTime())) {
        scheduledAtDate = parsed;
      }
    }

    const campaignValues: Record<string, unknown> = {
      id: `camp_${nanoid()}`,
      orgId,
      name: body.name,
      subject: body.subject || body.name,
      content: body.content || '',
      status: body.status || 'draft',
      scheduledAt: scheduledAtDate,
      totalRecipients,
      recipientFilters,
      signatureId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const insertCampaign = async (values: Record<string, unknown>) =>
      db.insert(emailCampaigns).values(values as any).returning();

    let newCampaign;
    try {
      newCampaign = await insertCampaign(campaignValues);
    } catch (error) {
      // Legacy DB fallback: retry without newer optional columns.
      if (isMissingColumnError(error, 'recipient_filters')) {
        delete campaignValues.recipientFilters;
      }
      if (isMissingColumnError(error, 'signature_id')) {
        delete campaignValues.signatureId;
      }

      if (isForeignKeyError(error)) {
        // Retry with no signature FK and ensure org exists one more time.
        campaignValues.signatureId = null;
        try {
          await ensureOrganizationExists(orgId);
        } catch (ensureError) {
          console.error(
            `[campaigns:post] requestId=${requestId} ensureOrganizationExists retry failed`,
            ensureError
          );
        }
      }

      if (
        isMissingColumnError(error, 'recipient_filters') ||
        isMissingColumnError(error, 'signature_id') ||
        isForeignKeyError(error)
      ) {
        newCampaign = await insertCampaign(campaignValues);
      } else {
        throw error;
      }
    }

    return NextResponse.json({ ...newCampaign[0], requestId }, { status: 201 });
  } catch (error) {
    return handleApiError('campaigns:post', error, requestId, {
      message: 'Failed to create campaign',
    });
  }
}
