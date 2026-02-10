import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSession } from '@/server/authz';

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const account = await db.query.accounts.findFirst({
    where: (a, { and, eq }) => and(eq(a.userId, session.user.id), eq(a.provider, 'google')),
  });

  return NextResponse.json({
    connected: !!account,
    hasRefreshToken: !!account?.refresh_token,
    scope: account?.scope || null,
    email: session.user.email || null,
  });
}

