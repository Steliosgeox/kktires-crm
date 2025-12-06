import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { accounts, customers, emailCampaigns, campaignRecipients } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const DEFAULT_ORG_ID = 'org_kktires';

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  html?: boolean;
}

async function getGmailAccessToken(userId: string): Promise<string | null> {
  const account = await db.query.accounts.findFirst({
    where: (a, { eq, and }) => and(
      eq(a.userId, userId),
      eq(a.provider, 'google')
    ),
  });

  if (!account?.access_token) {
    return null;
  }

  // Check if token is expired and refresh if needed
  if (account.expires_at && account.expires_at * 1000 < Date.now()) {
    // Token is expired, try to refresh
    if (!account.refresh_token) {
      return null;
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          grant_type: 'refresh_token',
          refresh_token: account.refresh_token,
        }),
      });

      const tokens = await response.json();

      if (tokens.error) {
        console.error('Token refresh error:', tokens);
        return null;
      }

      // Update the stored token
      await db
        .update(accounts)
        .set({
          access_token: tokens.access_token,
          expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
        })
        .where(eq(accounts.id, account.id));

      return tokens.access_token;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }

  return account.access_token;
}

async function sendGmailEmail(accessToken: string, email: EmailPayload): Promise<boolean> {
  const message = [
    `To: ${email.to}`,
    `Subject: =?UTF-8?B?${Buffer.from(email.subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    email.html 
      ? 'Content-Type: text/html; charset=UTF-8' 
      : 'Content-Type: text/plain; charset=UTF-8',
    '',
    email.body,
  ].join('\r\n');

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Gmail API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Send a single email
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { to, subject, content, html = true } = body;

    if (!to || !subject || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, content' },
        { status: 400 }
      );
    }

    const accessToken = await getGmailAccessToken(session.user.id);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Gmail not connected. Please sign out and sign in again to grant Gmail permissions.' },
        { status: 403 }
      );
    }

    const success = await sendGmailEmail(accessToken, {
      to,
      subject,
      body: content,
      html,
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to send email via Gmail API' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

// Send campaign to multiple recipients
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
    }

    // Get the campaign
    const campaign = await db.query.emailCampaigns.findFirst({
      where: (c, { eq, and }) => and(
        eq(c.id, campaignId),
        eq(c.orgId, DEFAULT_ORG_ID)
      ),
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get access token
    const accessToken = await getGmailAccessToken(session.user.id);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Gmail not connected' },
        { status: 403 }
      );
    }

    // Get customers with email
    const recipients = await db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
      })
      .from(customers)
      .where(and(
        eq(customers.orgId, DEFAULT_ORG_ID),
        sql`${customers.email} IS NOT NULL`,
        sql`(${customers.unsubscribed} = 0 OR ${customers.unsubscribed} IS NULL)`
      ));

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients with email addresses' },
        { status: 400 }
      );
    }

    // Update campaign status to sending
    await db
      .update(emailCampaigns)
      .set({ status: 'sending', updatedAt: new Date() })
      .where(eq(emailCampaigns.id, campaignId));

    // Send emails (with rate limiting)
    let sentCount = 0;
    const errors: string[] = [];
    const BATCH_SIZE = 10;
    const DELAY_MS = 1000; // 1 second between batches

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      
      const results = await Promise.allSettled(
        batch.map(async (recipient) => {
          if (!recipient.email) return false;

          // Personalize content
          const personalizedContent = campaign.content
            .replace(/{{firstName}}/g, recipient.firstName || '')
            .replace(/{{lastName}}/g, recipient.lastName || '')
            .replace(/{{email}}/g, recipient.email);

          const personalizedSubject = campaign.subject
            .replace(/{{firstName}}/g, recipient.firstName || '')
            .replace(/{{lastName}}/g, recipient.lastName || '');

          const success = await sendGmailEmail(accessToken, {
            to: recipient.email,
            subject: personalizedSubject,
            body: personalizedContent,
            html: true,
          });

          // Record recipient status
          await db.insert(campaignRecipients).values({
            id: `rcpt_${nanoid()}`,
            campaignId,
            customerId: recipient.id,
            email: recipient.email,
            status: success ? 'sent' : 'failed',
            sentAt: success ? new Date() : null,
            errorMessage: success ? null : 'Failed to send',
          });

          return success;
        })
      );

      // Count successes
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          sentCount++;
        }
      });

      // Rate limiting delay between batches
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    // Update campaign with results
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

    return NextResponse.json({
      success: true,
      sentCount,
      totalRecipients: recipients.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error sending campaign:', error);
    return NextResponse.json(
      { error: 'Failed to send campaign' },
      { status: 500 }
    );
  }
}

