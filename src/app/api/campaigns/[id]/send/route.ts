import { NextResponse } from 'next/server';
import { requireSession, getOrgIdFromSession } from '@/server/authz';
import { enqueueCampaignSend } from '@/server/email/job-queue';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = getOrgIdFromSession(session);
  const { id: campaignId } = await params;

  const body = await request.json().catch(() => ({} as any));
  const runAt = body?.runAt ?? body?.scheduledAt ?? undefined;

  const result = await enqueueCampaignSend({
    orgId,
    campaignId,
    senderUserId: session.user.id,
    runAt,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    jobId: result.jobId,
    alreadyQueued: result.alreadyQueued,
    runAt: result.runAt,
  });
}
