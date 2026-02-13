import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getOrgIdFromSession, requireSession } from '@/server/authz';
import { createRequestId, handleApiError, withValidatedBody } from '@/server/api/http';
import { enqueueCampaignSend } from '@/server/email/job-queue';
import { sendEmail } from '@/server/email/transport';
import {
  applyAssetBundleToHtml,
  normalizeCampaignAssetsInput,
  prepareAdhocAssetBundle,
} from '@/server/email/assets';

const CampaignAssetsSchema = z
  .object({
    attachments: z.array(z.string().trim().min(1).max(64)).max(200).optional(),
    inlineImages: z
      .array(
        z.object({
          assetId: z.string().trim().min(1).max(64),
          embedInline: z.boolean().optional(),
          widthPx: z.number().int().positive().max(2400).nullable().optional(),
          align: z.enum(['left', 'center', 'right']).nullable().optional(),
          alt: z.string().max(500).nullable().optional(),
          sortOrder: z.number().int().min(0).max(10_000).optional(),
        })
      )
      .max(500)
      .optional(),
  })
  .optional();

const SendSingleEmailSchema = z.object({
  to: z.string().trim().email().max(254),
  subject: z.string().trim().min(1).max(300),
  content: z.string().min(1).max(500_000),
  html: z.boolean().optional(),
  assets: CampaignAssetsSchema,
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
    const orgId = getOrgIdFromSession(session);

    let finalHtml = html ? content : undefined;
    let attachments = undefined as
      | Array<{
          filename: string;
          content: Buffer | Uint8Array;
          contentType?: string;
          cid?: string;
          disposition?: 'inline' | 'attachment';
        }>
      | undefined;

    const normalizedAssets = normalizeCampaignAssetsInput(body.assets);
    if (normalizedAssets.attachments.length > 0 || normalizedAssets.inlineImages.length > 0) {
      const bundle = await prepareAdhocAssetBundle({
        orgId,
        assets: normalizedAssets,
      });
      if (html && finalHtml) {
        const resolved = applyAssetBundleToHtml(finalHtml, bundle);
        finalHtml = resolved.html;
        attachments = resolved.attachments;
      } else {
        attachments = bundle.attachments;
      }
    }

    const result = await sendEmail({
      to,
      subject,
      ...(html ? { html: finalHtml } : { text: content }),
      attachments,
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
