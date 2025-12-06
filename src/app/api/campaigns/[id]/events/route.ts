import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailTracking, campaignRecipients, customers } from '@/lib/db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';

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
      })
      .from(emailTracking)
      .where(
        and(
          eq(emailTracking.campaignId, campaignId),
          gte(emailTracking.createdAt, startDate)
        )
      )
      .orderBy(desc(emailTracking.createdAt))
      .limit(100);

    // Calculate summary stats
    const openCount = events.filter((e) => e.type === 'open').length;
    const clickCount = events.filter((e) => e.type === 'click').length;
    const bounceCount = events.filter((e) => e.type === 'bounce').length;
    const unsubscribeCount = events.filter((e) => e.type === 'unsubscribe').length;

    return NextResponse.json({
      events,
      summary: {
        openCount,
        clickCount,
        bounceCount,
        unsubscribeCount,
        period,
      },
    });
  } catch (error) {
    console.error('Error fetching campaign events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

