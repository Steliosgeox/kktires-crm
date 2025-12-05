import { auth } from '@/auth';
import { NextResponse } from 'next/server';

// Security headers for production
const securityHeaders = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
};

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

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === '/login';
  const isApiRoute = req.nextUrl.pathname.startsWith('/api');
  const isAuthRoute = req.nextUrl.pathname.startsWith('/api/auth');
  const isHealthRoute = req.nextUrl.pathname === '/api/health';
  const isPublicAsset = req.nextUrl.pathname.startsWith('/_next') || 
                         req.nextUrl.pathname.startsWith('/favicon') ||
                         req.nextUrl.pathname.startsWith('/manifest') ||
                         req.nextUrl.pathname.startsWith('/icons');

  // Allow public assets, auth routes, and health checks
  if (isPublicAsset || isAuthRoute || isHealthRoute) {
    const response = NextResponse.next();
    // Add security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Rate limiting for API routes
  if (isApiRoute && !isAuthRoute) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               'unknown';
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }
  }

  // Redirect logged-in users away from login page
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Protect dashboard routes - redirect to login if not authenticated
  if (!isLoggedIn && !isLoginPage && !isApiRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Protect API routes (except auth routes)
  if (!isLoggedIn && isApiRoute && !isAuthRoute) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const response = NextResponse.next();
  
  // Add security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)'],
};

