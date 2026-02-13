import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { sessions } from '@/lib/db/schema';
import { hasRole, requireSession } from '@/server/authz';
import { createRequestId, jsonError } from '@/server/api/http';

function maskToken(token: string): string {
  if (!token) return '';
  return token.length <= 8 ? `${token}...` : `${token.slice(0, 8)}...`;
}

export async function GET(req: NextRequest) {
  const requestId = createRequestId();

  try {
    if (process.env.AUTH_DEBUG !== '1') {
      return jsonError('Not found', 404, 'NOT_FOUND', requestId);
    }

    const sessionForAuthz = await requireSession();
    if (!sessionForAuthz) {
      return jsonError('Unauthorized', 401, 'UNAUTHORIZED', requestId);
    }
    if (!hasRole(sessionForAuthz, ['owner', 'admin'])) {
      return jsonError('Forbidden', 403, 'FORBIDDEN', requestId);
    }

    const cookieNames = req.cookies.getAll().map((c) => c.name).sort();

    const sessionCookie =
      req.cookies.get('__Secure-authjs.session-token')?.value ||
      req.cookies.get('authjs.session-token')?.value ||
      req.cookies.get('__Secure-next-auth.session-token')?.value ||
      req.cookies.get('next-auth.session-token')?.value ||
      null;

    const session = await auth();

    let dbSession:
      | { sessionToken: string; userId: string; expires: Date }
      | null
      | undefined = undefined;

    if (sessionCookie) {
      try {
        dbSession = await db.query.sessions.findFirst({
          where: (s, { eq: whereEq }) => whereEq(s.sessionToken, sessionCookie),
        });
      } catch {
        const row = await db
          .select({
            sessionToken: sessions.sessionToken,
            userId: sessions.userId,
            expires: sessions.expires,
          })
          .from(sessions)
          .where(eq(sessions.sessionToken, sessionCookie))
          .limit(1);
        dbSession = row[0] ?? null;
      }
    }

    return NextResponse.json({
      ok: true,
      requestId,
      now: new Date().toISOString(),
      host: req.headers.get('host'),
      proto: req.headers.get('x-forwarded-proto') || 'unknown',
      url: req.nextUrl.toString(),
      cookieNames,
      sessionCookiePresent: !!sessionCookie,
      sessionCookieMasked: sessionCookie ? maskToken(sessionCookie) : null,
      authUser: session?.user
        ? { id: session.user.id, email: session.user.email, name: session.user.name }
        : null,
      dbSession: sessionCookie
        ? dbSession
          ? { userId: dbSession.userId, expires: dbSession.expires }
          : null
        : null,
    });
  } catch (error) {
    console.error(`[debug/auth-state] requestId=${requestId}`, error);
    return jsonError('Failed to inspect auth state', 500, 'INTERNAL_ERROR', requestId);
  }
}
