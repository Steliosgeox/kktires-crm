import { NextResponse } from 'next/server';

import { processDueEmailJobs } from '@/server/email/process-jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;

  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;

  // Vercel Cron typically includes this header. Keep it as a convenience, not as strong auth.
  const vercelCron = request.headers.get('x-vercel-cron');
  if (vercelCron === '1' || vercelCron === 'true') return true;

  const url = new URL(request.url);
  if (url.searchParams.get('secret') === secret) return true;

  return false;
}

function getWorkerId(): string {
  const region = process.env.VERCEL_REGION || 'local';
  const deploy = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || 'dev';
  return `cron:${region}:${deploy}:${process.pid}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const timeBudgetMs = Number.parseInt(process.env.EMAIL_CRON_TIME_BUDGET_MS || '8000', 10);
    const maxJobs = Number.parseInt(process.env.EMAIL_CRON_MAX_JOBS || '5', 10);

    const result = await processDueEmailJobs({
      workerId: getWorkerId(),
      timeBudgetMs: Number.isFinite(timeBudgetMs) ? timeBudgetMs : 8000,
      maxJobs: Number.isFinite(maxJobs) ? maxJobs : 5,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[cron/email-jobs] error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}

