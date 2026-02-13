import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getOrgIdFromSession, requireSession } from '@/server/authz';
import { createRequestId, handleApiError, withValidatedBody } from '@/server/api/http';
import { getGmailAccessToken, sendGmailEmail } from '@/server/email/gmail';
import { enqueueCampaignSend } from '@/server/email/job-queue';

const SendSingleEmailSchema = z.object({
  to: z.string().trim().email().max(254),
  subject: z.string().trim().min(1).max(300),
  content: z.string().min(1).max(500_000),
  html: z.boolean().optional(),
});

const SendCampaignSchema = z.object({
  campaignId: z.string().trim().min(1).max(64),
  runAt: z.string().datetime().optional().nullable(),
});

// Send a single email
export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', requestId },
        { status: 401 }
      );
    }

    const body = await withValidatedBody(request, SendSingleEmailSchema, {
      maxBytes: 1_000_000,
    });
    const { to, subject, content, html = true } = body;

    const accessToken = await getGmailAccessToken(session.user.id);
    if (!accessToken) {
      return NextResponse.json(
        {
          error: 'Gmail not connected. Please sign out and sign in again to grant Gmail permissions.',
          code: 'FORBIDDEN',
          requestId,
        },
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
        { error: 'Failed to send email via Gmail API', code: 'INTERNAL_ERROR', requestId },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, requestId, message: 'Email sent successfully' });
  } catch (error) {
    return handleApiError('email:send-single', error, requestId, {
      message: 'Failed to send email',
    });
  }
}

// Send campaign to multiple recipients
export async function PUT(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', requestId },
        { status: 401 }
      );
    }

    const body = await withValidatedBody(request, SendCampaignSchema, { maxBytes: 20_000 });
    const { campaignId, runAt } = body;

    const orgId = getOrgIdFromSession(session);
    const result = await enqueueCampaignSend({
      orgId,
      campaignId,
      senderUserId: session.user.id,
      runAt,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: 'BAD_REQUEST', requestId },
        { status: result.status }
      );
    }

    return NextResponse.json({ success: true, requestId, ...result });
  } catch (error) {
    return handleApiError('email:send-campaign', error, requestId, {
      message: 'Failed to send campaign',
    });
  }
}
