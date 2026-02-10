import { NextRequest, NextResponse } from 'next/server';
import { requireSession, getOrgIdFromSession } from '@/server/authz';
import { getGmailAccessToken, sendGmailEmail } from '@/server/email/gmail';
import { enqueueCampaignSend } from '@/server/email/job-queue';

// Send a single email
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { campaignId, runAt } = body;

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
    }

    const orgId = getOrgIdFromSession(session);

    const result = await enqueueCampaignSend({
      orgId,
      campaignId,
      senderUserId: session.user.id,
      runAt,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error sending campaign:', error);
    return NextResponse.json(
      { error: 'Failed to send campaign' },
      { status: 500 }
    );
  }
}

