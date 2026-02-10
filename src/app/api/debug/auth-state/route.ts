import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { sessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

function maskToken(token: string): string {
  if (!token) return '';
  return token.length <= 8 ? `${token}…` : `${token.slice(0, 8)}…`;
}

export async function GET(req: NextRequest) {
  // Intentionally minimal/no secrets. Helps debug “magic link redirects back to /login”.
  try {
    if (process.env.AUTH_DEBUG !== '1') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
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
          where: (s, { eq }) => eq(s.sessionToken, sessionCookie),
        });
      } catch {
        // If schema differs, fall back to a generic query
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
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
