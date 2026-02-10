import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { campaignRecipients, emailCampaigns, emailTracking } from '@/lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { safeEqual, signTrackingValue } from '@/server/email/tracking';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get('cid');
  const recipientId = searchParams.get('rid');
  const u = searchParams.get('u');
  const sig = searchParams.get('sig');

  if (!campaignId || !recipientId || !u || !sig) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 });
  }

  if (u.length > 4096) {
    return NextResponse.json({ error: 'URL too long' }, { status: 400 });
  }

  let dest: URL;
  try {
    dest = new URL(u);
  } catch {
    return NextResponse.json({ error: 'Invalid destination URL' }, { status: 400 });
  }

  if (dest.protocol !== 'http:' && dest.protocol !== 'https:') {
    return NextResponse.json({ error: 'Invalid destination protocol' }, { status: 400 });
  }

  const expected = signTrackingValue(`click|${campaignId}|${recipientId}|${dest.toString()}`);
  if (!expected || !safeEqual(expected, sig)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const recipient = await db.query.campaignRecipients.findFirst({
      where: (r, { and, eq }) => and(eq(r.id, recipientId), eq(r.campaignId, campaignId)),
    });

    if (recipient) {
      // Dedupe clicks per (campaignId, recipientId, linkUrl)
      const existing = await db.query.emailTracking.findFirst({
        where: (t, { and, eq }) =>
          and(
            eq(t.campaignId, campaignId),
            eq(t.recipientId, recipientId),
            eq(t.type, 'click'),
            eq(t.linkUrl, dest.toString())
          ),
      });

      if (!existing) {
        await db.insert(emailTracking).values({
          id: `track_${nanoid()}`,
          campaignId,
          recipientId,
          type: 'click',
          linkUrl: dest.toString(),
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
          userAgent: request.headers.get('user-agent') || null,
          createdAt: new Date(),
        });

        await db
          .update(emailCampaigns)
          .set({
            clickCount: sql`${emailCampaigns.clickCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(emailCampaigns.id, campaignId));
      }
    }
  } catch (error) {
    // Never break the redirect because analytics failed.
    console.error('Click tracking failed:', error);
  }

  return NextResponse.redirect(dest.toString(), { status: 302 });
}

