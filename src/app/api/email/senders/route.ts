import { NextResponse } from 'next/server';

import { createRequestId, handleApiError } from '@/server/api/http';
import { requireSession } from '@/server/authz';
import { getPrimarySmtpSenderEmail, listSafeSmtpSenders } from '@/server/email/senders';

export async function GET() {
  const requestId = createRequestId();
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', requestId }, { status: 401 });
    }

    return NextResponse.json({
      requestId,
      senders: listSafeSmtpSenders({ strict: true }),
      primaryFromEmail: getPrimarySmtpSenderEmail(),
    });
  } catch (error) {
    return handleApiError('email:senders:get', error, requestId, {
      message: 'Failed to load email senders',
    });
  }
}
