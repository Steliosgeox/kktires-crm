import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createRequestId,
  handleApiError,
  jsonError,
  withValidatedBody,
} from '@/server/api/http';
import { getOrgIdFromSession, requireSession } from '@/server/authz';
import { enqueueCampaignSend } from '@/server/email/job-queue';

const CampaignSendSchema = z.object({
  runAt: z.string().datetime().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = createRequestId();
  try {
    const session = await requireSession();
    if (!session) return jsonError('Unauthorized', 401, 'UNAUTHORIZED', requestId);

    const orgId = getOrgIdFromSession(session);
    const { id: campaignId } = await params;

    const body = await withValidatedBody(request, CampaignSendSchema, { maxBytes: 16_000 });
    const runAt = body.runAt ?? body.scheduledAt ?? undefined;

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

    return NextResponse.json({
      success: true,
      requestId,
      jobId: result.jobId,
      alreadyQueued: result.alreadyQueued,
      runAt: result.runAt,
    });
  } catch (error) {
    return handleApiError('campaigns:send', error, requestId, {
      message: 'Failed to enqueue campaign',
    });
  }
}
