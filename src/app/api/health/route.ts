import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { organizations, sessions, users, verificationTokens } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { createRequestId, jsonError } from '@/server/api/http';
import { hasRole, requireSession } from '@/server/authz';

function isAuthorizedBySecret(request: Request): boolean {
  const secret = process.env.HEALTHCHECK_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
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
    });
  } catch (error) {
    console.error(`[health] requestId=${requestId}`, error);
    return jsonError('Health check failed', 503, 'INTERNAL_ERROR', requestId);
  }
}
