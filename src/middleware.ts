import { NextRequest, NextResponse } from 'next/server';

// Rate limiting map (simple in-memory, use Redis in production at scale)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export default function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const isApiRoute = pathname.startsWith('/api');
  const isAuthRoute = pathname.startsWith('/api/auth');
  const isHealthRoute = pathname === '/api/health';

  // These endpoints must remain public so email opens/clicks/unsubscribes work.
  const isPublicEmailApi =
    pathname.startsWith('/api/email/tracking') ||
    pathname.startsWith('/api/email/click') ||
    pathname.startsWith('/api/unsubscribe');

  const isPublicAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/manifest') ||
    pathname.startsWith('/icons');

  if (isPublicAsset || isAuthRoute || isHealthRoute || isPublicEmailApi) {
    return NextResponse.next();
  }

  // Rate limiting for API routes. Authz is enforced inside each route handler.
  if (isApiRoute) {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)'],
};
