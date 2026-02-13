import { NextResponse } from 'next/server';

import { createRequestId, handleApiError, jsonError } from '@/server/api/http';
import { getOrgIdFromSession, requireSession } from '@/server/authz';
import { deleteEmailAsset } from '@/server/email/assets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();
  try {
    const session = await requireSession();
    if (!session) return jsonError('Unauthorized', 401, 'UNAUTHORIZED', requestId);

    const orgId = getOrgIdFromSession(session);
    const { id: assetId } = await params;

    const url = new URL(request.url);
    const campaignId = url.searchParams.get('campaignId')?.trim() || undefined;

    const result = await deleteEmailAsset({
      orgId,
      assetId,
      campaignId,
    });

    return NextResponse.json({
      success: true,
      requestId,
      ...result,
    });
  } catch (error) {
    return handleApiError('email-assets:delete', error, requestId, {
      message: 'Failed to delete asset',
    });
  }
}
