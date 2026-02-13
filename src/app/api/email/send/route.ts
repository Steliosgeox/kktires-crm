import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getOrgIdFromSession, requireSession } from '@/server/authz';
import { createRequestId, handleApiError, withValidatedBody } from '@/server/api/http';
import { enqueueCampaignSend } from '@/server/email/job-queue';
import { sendEmail } from '@/server/email/transport';

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

    const result = await sendEmail({
      to,
      subject,
      ...(html ? { html: content } : { text: content }),
    });

    if (!result.ok) {
      const status = result.errorCode === 'SMTP_NOT_CONFIGURED' ? 503 : 502;
      return NextResponse.json(
        {
          error: result.errorMessage,
          code: result.errorCode,
          provider: result.provider,
          requestId,
        },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      requestId,
      message: 'Email sent successfully',
      provider: result.provider,
      messageId: result.messageId ?? null,
    });
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
        { error: result.error, code: result.code || 'BAD_REQUEST', requestId },
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
