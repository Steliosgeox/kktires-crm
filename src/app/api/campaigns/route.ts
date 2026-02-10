import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailCampaigns } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { countRecipients, normalizeRecipientFilters } from '@/server/email/recipients';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

const campaignStatusSchema = z.enum(['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled', 'failed']);

const campaignCreateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().optional(),
  content: z.string().optional(),
  status: campaignStatusSchema.optional(),
  scheduledAt: z.string().optional().nullable(),
  recipientFilters: z.unknown().optional(),
  signatureId: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Run all queries in parallel for better performance
    const [allCampaigns, countResult, statsResult] = await Promise.all([
      // Get campaigns
      db.select({
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

      // Get total count
      db.select({ count: sql<number>`count(*)` })
        .from(emailCampaigns)
        .where(eq(emailCampaigns.orgId, orgId)),

      // Calculate stats
      db.select({
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
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const parsed = campaignCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const recipientFilters = normalizeRecipientFilters(body.recipientFilters);
    const totalRecipients = await countRecipients(orgId, recipientFilters);

    // Parse scheduledAt - schema expects Date objects with { mode: 'timestamp' }
    let scheduledAtDate: Date | null = null;
    if (body.scheduledAt) {
      const parsed = new Date(body.scheduledAt);
      if (!isNaN(parsed.getTime())) {
        scheduledAtDate = parsed;
      }
    }

    const newCampaign = await db.insert(emailCampaigns).values({
      id: `camp_${nanoid()}`,
      orgId,
      name: body.name,
      subject: body.subject || body.name,
      content: body.content || '',
      status: body.status || 'draft',
      scheduledAt: scheduledAtDate,
      totalRecipients,
      recipientFilters,
      signatureId: body.signatureId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(newCampaign[0], { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
