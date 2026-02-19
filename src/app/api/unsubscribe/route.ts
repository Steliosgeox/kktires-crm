import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { campaignRecipients, customers, emailCampaigns, emailTracking, unsubscribes } from '@/lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { safeEqual, signTrackingValue } from '@/server/email/tracking';

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 302 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get('cid');
  const recipientId = searchParams.get('rid');
  const sig = searchParams.get('sig');
  const reason = searchParams.get('reason');

  if (!campaignId || !recipientId || !sig) {
    return redirectTo(request, '/unsubscribe?error=missing_params');
  }

  const expected = signTrackingValue(`unsub|${campaignId}|${recipientId}`);
  if (!expected || !safeEqual(expected, sig)) {
    return redirectTo(request, '/unsubscribe?error=invalid_signature');
  }

  try {
    const recipient = await db.query.campaignRecipients.findFirst({
      where: (r, { and, eq }) => and(eq(r.id, recipientId), eq(r.campaignId, campaignId)),
    });

    const campaign = await db.query.emailCampaigns.findFirst({
      where: (c, { eq }) => eq(c.id, campaignId),
    });

    if (!recipient || !campaign) {
      return redirectTo(request, '/unsubscribe?error=not_found');
    }

    // Dedupe unsubscribes per (orgId, email)
    const existing = await db.query.unsubscribes.findFirst({
      where: (u, { and, eq }) => and(eq(u.orgId, campaign.orgId), eq(u.email, recipient.email)),
    });

    if (!existing) {
      await db.insert(unsubscribes).values({
        id: `unsub_${nanoid()}`,
        orgId: campaign.orgId,
        email: recipient.email,
        reason: reason || null,
        campaignId,
        createdAt: new Date(),
      });

      await db
        .update(emailCampaigns)
        .set({
          unsubscribeCount: sql`${emailCampaigns.unsubscribeCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(emailCampaigns.id, campaignId));
    }

    // Mark linked customer as unsubscribed when available.
    if (recipient.customerId) {
      await db
        .update(customers)
        .set({ unsubscribed: true, updatedAt: new Date() })
        .where(and(eq(customers.id, recipient.customerId), eq(customers.orgId, campaign.orgId)));
    }

    // Also record a tracking event for campaign analytics (best-effort).
    const existingUnsubEvent = await db.query.emailTracking.findFirst({
      where: (t, { and, eq }) =>
        and(eq(t.campaignId, campaignId), eq(t.recipientId, recipientId), eq(t.type, 'unsubscribe')),
    });
    if (!existingUnsubEvent) {
      await db
        .insert(emailTracking)
        .values({
          id: `track_${nanoid()}`,
          campaignId,
          recipientId,
          type: 'unsubscribe',
          linkUrl: null,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
          userAgent: request.headers.get('user-agent') || null,
          createdAt: new Date(),
        })
        .catch(() => undefined);
    }

    return redirectTo(request, '/unsubscribe?success=1');
  } catch (error) {
    console.error('Unsubscribe failed:', error);
    return redirectTo(request, '/unsubscribe?error=server_error');
  }
}
