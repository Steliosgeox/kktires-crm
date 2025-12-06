import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailTracking, campaignRecipients, emailCampaigns } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Transparent 1x1 pixel GIF
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// GET - Track email open (pixel tracking)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const recipientId = searchParams.get('rid');
  const campaignId = searchParams.get('cid');

  if (recipientId && campaignId) {
    try {
      // Record the open event
      await db.insert(emailTracking).values({
        id: `track_${nanoid()}`,
        campaignId,
        recipientId,
        type: 'open',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
        createdAt: new Date(),
      });

      // Update campaign open count
      await db
        .update(emailCampaigns)
        .set({
          openCount: sql`${emailCampaigns.openCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(emailCampaigns.id, campaignId));
    } catch (error) {
      console.error('Error recording open:', error);
    }
  }

  // Return transparent pixel
  return new NextResponse(TRACKING_PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

// POST - Track link click
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipientId, campaignId, linkUrl } = body;

    if (!recipientId || !campaignId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Record the click event
    await db.insert(emailTracking).values({
      id: `track_${nanoid()}`,
      campaignId,
      recipientId,
      type: 'click',
      linkUrl: linkUrl || null,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      userAgent: request.headers.get('user-agent') || null,
      createdAt: new Date(),
    });

    // Update campaign click count
    await db
      .update(emailCampaigns)
      .set({
        clickCount: sql`${emailCampaigns.clickCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(emailCampaigns.id, campaignId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error recording click:', error);
    return NextResponse.json({ error: 'Failed to record click' }, { status: 500 });
  }
}

