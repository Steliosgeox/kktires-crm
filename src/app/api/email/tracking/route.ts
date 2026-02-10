import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailTracking, campaignRecipients, emailCampaigns } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { safeEqual, signTrackingValue } from '@/server/email/tracking';

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
  const sig = searchParams.get('sig');

  if (recipientId && campaignId && sig) {
    try {
      const expected = signTrackingValue(`open|${campaignId}|${recipientId}`);
      if (!expected || !safeEqual(expected, sig)) {
        return new NextResponse(TRACKING_PIXEL, {
          headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
      }

      const recipient = await db.query.campaignRecipients.findFirst({
        where: (r, { and, eq }) => and(eq(r.id, recipientId), eq(r.campaignId, campaignId)),
      });

      if (!recipient) {
        return new NextResponse(TRACKING_PIXEL, {
          headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
      }

      // Dedupe opens per (campaignId, recipientId)
      const existing = await db.query.emailTracking.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.campaignId, campaignId), eq(t.recipientId, recipientId), eq(t.type, 'open')),
      });

      if (existing) {
        return new NextResponse(TRACKING_PIXEL, {
          headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
      }

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

