import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailJobItems, emailJobs, organizations, sessions, users, verificationTokens } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { createRequestId, jsonError } from '@/server/api/http';
import { hasRole, requireSession } from '@/server/authz';
import { getOAuthTokenEncryptionKey } from '@/server/crypto/oauth-tokens';
import { getSmtpReadiness } from '@/server/email/smtp';

function isAuthorizedBySecret(request: Request): boolean {
  const secret = process.env.HEALTHCHECK_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

async function safeCountTable(query: () => Promise<Array<{ count: number }>>) {
  try {
    const [row] = await query();
    return {
      ok: true,
      count: Number(row?.count || 0),
      error: null as string | null,
    };
  } catch (error) {
    return {
      ok: false,
      count: null as number | null,
      error: error instanceof Error ? error.message : 'Unknown table check error',
    };
  }
}

export async function GET(request: Request) {
  const requestId = createRequestId();
  const secretAuthorized = isAuthorizedBySecret(request);
  let roleAuthorized = false;
  if (!secretAuthorized) {
    try {
      const session = await requireSession();
      roleAuthorized = !!session && hasRole(session, ['owner', 'admin']);
    } catch {
      roleAuthorized = false;
    }
  }

  const canViewDetails = secretAuthorized || roleAuthorized;
  try {
    if (!canViewDetails) {
      return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        requestId,
      });
    }

    // Check database connectivity and presence of core tables
    const [org] = await db.select({ count: sql<number>`count(*)` }).from(organizations).limit(1);
    const [usr] = await db.select({ count: sql<number>`count(*)` }).from(users).limit(1);
    const [sess] = await db.select({ count: sql<number>`count(*)` }).from(sessions).limit(1);
    const [vt] = await db.select({ count: sql<number>`count(*)` }).from(verificationTokens).limit(1);
    const smtp = getSmtpReadiness();
    const emailJobsTable = await safeCountTable(() =>
      db.select({ count: sql<number>`count(*)` }).from(emailJobs).limit(1)
    );
    const emailJobItemsTable = await safeCountTable(() =>
      db.select({ count: sql<number>`count(*)` }).from(emailJobItems).limit(1)
    );

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: process.env.npm_package_version || '1.0.0',
      requestId,
      tables: {
        organizations: org?.count ?? 0,
        users: usr?.count ?? 0,
        sessions: sess?.count ?? 0,
        verification_tokens: vt?.count ?? 0,
      },
      emailReadiness: {
        transport: {
          provider: 'smtp',
          configured: smtp.configured,
          missing: smtp.missing,
          host: smtp.host,
          port: smtp.port,
          secure: smtp.secure,
          from: smtp.from,
        },
        trackingSecretConfigured: Boolean(process.env.EMAIL_TRACKING_SECRET?.trim()),
        oauthTokenEncryptionKeyConfigured: Boolean(getOAuthTokenEncryptionKey()),
        cronSecretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
        queueTables: {
          email_jobs: emailJobsTable,
          email_job_items: emailJobItemsTable,
        },
      },
    });
  } catch (error) {
    console.error(`[health] requestId=${requestId}`, error);
    return jsonError('Health check failed', 503, 'INTERNAL_ERROR', requestId);
  }
}
