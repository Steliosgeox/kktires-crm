import { NextResponse } from 'next/server';

import { processDueEmailJobs } from '@/server/email/process-jobs';
import { createRequestId, jsonError } from '@/server/api/http';
import { isCronAuthorized } from '@/server/cron/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getWorkerId(): string {
  const region = process.env.VERCEL_REGION || 'local';
  const deploy = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || 'dev';
  return `cron:${region}:${deploy}:${process.pid}`;
}

export async function GET(request: Request) {
  const requestId = createRequestId();
  if (!isCronAuthorized(request)) {
    return jsonError('Unauthorized', 401, 'UNAUTHORIZED', requestId);
  }

  try {
    const timeBudgetMs = Number.parseInt(process.env.EMAIL_CRON_TIME_BUDGET_MS || '8000', 10);
    const maxJobs = Number.parseInt(process.env.EMAIL_CRON_MAX_JOBS || '5', 10);

    const result = await processDueEmailJobs({
      workerId: getWorkerId(),
      timeBudgetMs: Number.isFinite(timeBudgetMs) ? timeBudgetMs : 8000,
      maxJobs: Number.isFinite(maxJobs) ? maxJobs : 5,
    });

    return NextResponse.json({ ...result, requestId });
  } catch (error) {
    console.error(`[cron/email-jobs] requestId=${requestId}`, error);
    return jsonError('Cron job failed', 500, 'INTERNAL_ERROR', requestId);
  }
}
