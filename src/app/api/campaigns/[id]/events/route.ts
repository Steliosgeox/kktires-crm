import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailCampaigns, emailTracking, campaignRecipients } from '@/lib/db/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const { id: campaignId } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';

    // Ensure the campaign belongs to the current org
    const campaign = await db.query.emailCampaigns.findFirst({
      where: (c, { and, eq }) => and(eq(c.id, campaignId), eq(c.orgId, orgId)),
    });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Calculate start date based on period
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0); // All time
    }

    // Fetch tracking events
    const events = await db
      .select({
        id: emailTracking.id,
        type: emailTracking.type,
        linkUrl: emailTracking.linkUrl,
        userAgent: emailTracking.userAgent,
        createdAt: emailTracking.createdAt,
        recipientEmail: campaignRecipients.email,
      })
      .from(emailTracking)
      .leftJoin(campaignRecipients, eq(emailTracking.recipientId, campaignRecipients.id))
      .where(
        and(
          eq(emailTracking.campaignId, campaignId),
          gte(emailTracking.createdAt, startDate)
        )
      )
      .orderBy(desc(emailTracking.createdAt))
      .limit(100);

    const grouped = await db
      .select({
        type: emailTracking.type,
        count: sql<number>`count(*)`,
      })
      .from(emailTracking)
      .where(
        and(eq(emailTracking.campaignId, campaignId), gte(emailTracking.createdAt, startDate))
      )
      .groupBy(emailTracking.type);

    const byType = new Map<string, number>();
    grouped.forEach((row) => byType.set(row.type, row.count || 0));

    return NextResponse.json({
      events,
      summary: {
        openCount: byType.get('open') || 0,
        clickCount: byType.get('click') || 0,
        bounceCount: byType.get('bounce') || 0,
        unsubscribeCount: byType.get('unsubscribe') || 0,
        period,
      },
    });
  } catch (error) {
    console.error('Error fetching campaign events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

