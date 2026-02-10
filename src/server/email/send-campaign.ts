import { db } from '@/lib/db';
import { campaignRecipients, emailCampaigns, emailJobItems, emailSignatures } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { selectRecipients } from './recipients';
import { getGmailAccessToken, sendGmailEmail } from './gmail';
import {
  appendUnsubscribeFooter,
  buildOpenPixelUrl,
  buildUnsubscribeUrl,
  injectOpenPixel,
  rewriteHtmlLinksForClickTracking,
} from './tracking';

function personalize(text: string, data: Record<string, string>) {
  return Object.entries(data).reduce((acc, [k, v]) => acc.replaceAll(k, v), text);
}

function appendSignatureHtml(contentHtml: string, signatureHtml: string | null) {
  if (!signatureHtml) return contentHtml;

  // Basic, safe append. If the editor includes a full HTML document, try to inject before </body>.
  const marker = '</body>';
  const signatureBlock = `\n<div style=\"margin-top:24px\">${signatureHtml}</div>\n`;

  if (contentHtml.toLowerCase().includes(marker)) {
    const idx = contentHtml.toLowerCase().lastIndexOf(marker);
    return contentHtml.slice(0, idx) + signatureBlock + contentHtml.slice(idx);
  }

  return contentHtml + signatureBlock;
}

export async function sendCampaignNow(params: { orgId: string; userId: string; campaignId: string; jobId?: string }) {
  const { orgId, userId, campaignId, jobId } = params;

  const campaign = await db.query.emailCampaigns.findFirst({
    where: (c, { and, eq }) => and(eq(c.id, campaignId), eq(c.orgId, orgId)),
  });

  if (!campaign) {
    return { ok: false as const, status: 404, error: 'Campaign not found' };
  }

  if (campaign.status === 'sent') {
    return { ok: false as const, status: 409, error: 'Campaign is already sent' };
  }

  const accessToken = await getGmailAccessToken(userId);
  if (!accessToken) {
    return { ok: false as const, status: 403, error: 'Gmail not connected' };
  }

  const recipients = await selectRecipients(orgId, campaign.recipientFilters || {});
  if (recipients.length === 0) {
    return { ok: false as const, status: 400, error: 'No recipients with email addresses' };
  }

  const signature =
    campaign.signatureId
      ? await db.query.emailSignatures.findFirst({
          where: (s, { and, eq }) => and(eq(s.id, campaign.signatureId as string), eq(s.orgId, orgId)),
        })
      : null;

  // Update campaign status to sending
  await db
    .update(emailCampaigns)
    .set({ status: 'sending', totalRecipients: recipients.length, updatedAt: new Date() })
    .where(eq(emailCampaigns.id, campaignId));

  let sentCount = 0;
  let failedCount = 0;

  const BATCH_SIZE = 10;
  const DELAY_MS = 1000;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (r) => {
        const recipientRowId = `rcpt_${nanoid()}`;

        // Insert the recipient row first so tracking ids exist before the email is opened/clicked.
        await db.insert(campaignRecipients).values({
          id: recipientRowId,
          campaignId,
          customerId: r.id,
          email: r.email,
          status: 'pending',
          sentAt: null,
          errorMessage: null,
        });

        if (jobId) {
          await db.insert(emailJobItems).values({
            id: `jit_${nanoid()}`,
            jobId,
            campaignId,
            recipientId: recipientRowId,
            status: 'pending',
            sentAt: null,
            errorMessage: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        const vars: Record<string, string> = {
          '{{firstName}}': r.firstName || '',
          '{{lastName}}': r.lastName || '',
          '{{company}}': r.company || '',
          '{{email}}': r.email || '',
          '{{city}}': r.city || '',
          '{{phone}}': r.phone || r.mobile || '',
        };

        const subject = personalize(campaign.subject, vars);
        let content = appendSignatureHtml(personalize(campaign.content, vars), signature?.content || null);

        // Tracking: rewrite links + add pixel + add unsubscribe footer when configured.
        const pixelUrl = buildOpenPixelUrl({ campaignId, recipientId: recipientRowId });
        const unsubscribeUrl = buildUnsubscribeUrl({ campaignId, recipientId: recipientRowId });

        content = rewriteHtmlLinksForClickTracking({
          html: content,
          campaignId,
          recipientId: recipientRowId,
        });
        content = injectOpenPixel(content, pixelUrl);
        content = appendUnsubscribeFooter(content, unsubscribeUrl);

        const headers: Record<string, string> = {};
        if (unsubscribeUrl) {
          headers['List-Unsubscribe'] = `<${unsubscribeUrl}>`;
        }

        const ok = await sendGmailEmail(accessToken, {
          to: r.email,
          subject,
          body: content,
          html: true,
          headers,
        });

        await db
          .update(campaignRecipients)
          .set({
            status: ok ? 'sent' : 'failed',
            sentAt: ok ? new Date() : null,
            errorMessage: ok ? null : 'Failed to send',
          })
          .where(eq(campaignRecipients.id, recipientRowId));

        if (jobId) {
          await db
            .update(emailJobItems)
            .set({
              status: ok ? 'sent' : 'failed',
              sentAt: ok ? new Date() : null,
              errorMessage: ok ? null : 'Failed to send',
              updatedAt: new Date(),
            })
            .where(and(eq(emailJobItems.jobId, jobId), eq(emailJobItems.recipientId, recipientRowId)));
        }

        return ok;
      })
    );

    results.forEach((res) => {
      if (res.status === 'fulfilled' && res.value) sentCount++;
      else failedCount++;
    });

    if (i + BATCH_SIZE < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  await db
    .update(emailCampaigns)
    .set({
      status: 'sent',
      sentAt: new Date(),
      sentCount,
      totalRecipients: recipients.length,
      updatedAt: new Date(),
    })
    .where(eq(emailCampaigns.id, campaignId));

  return { ok: true as const, sentCount, failedCount, totalRecipients: recipients.length };
}
