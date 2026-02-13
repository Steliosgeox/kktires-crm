function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(' ', 2);
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  return token;
}

function extractQuerySecret(urlValue: string): string | null {
  try {
    const url = new URL(urlValue);
    return (
      url.searchParams.get('cron_secret') ||
      url.searchParams.get('key') ||
      url.searchParams.get('token')
    );
  } catch {
    return null;
  }
}

export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret) return !isProduction;

  const bearerToken = extractBearerToken(request.headers.get('authorization'));
  if (bearerToken === secret) return true;

  const headerSecret =
    request.headers.get('x-cron-secret')?.trim() || request.headers.get('x-api-key')?.trim();
  if (headerSecret === secret) return true;

  return extractQuerySecret(request.url) === secret;
}
