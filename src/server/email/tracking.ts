import crypto from 'crypto';

function base64urlEncode(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function getAppBaseUrl(): string | null {
  const raw = process.env.NEXTAUTH_URL;
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.origin;
  } catch {
    return null;
  }
}

export function getEmailTrackingSecret(): string | null {
  const raw = process.env.EMAIL_TRACKING_SECRET;
  const secret = raw?.trim();
  return secret ? secret : null;
}

export function signTrackingValue(value: string): string | null {
  const secret = getEmailTrackingSecret();
  if (!secret) return null;
  const digest = crypto.createHmac('sha256', secret).update(value).digest();
  return base64urlEncode(digest);
}

export function safeEqual(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

export function buildOpenPixelUrl(params: { campaignId: string; recipientId: string }): string | null {
  const baseUrl = getAppBaseUrl();
  const sig = signTrackingValue(`open|${params.campaignId}|${params.recipientId}`);
  if (!baseUrl || !sig) return null;

  const u = new URL('/api/email/tracking', baseUrl);
  u.searchParams.set('cid', params.campaignId);
  u.searchParams.set('rid', params.recipientId);
  u.searchParams.set('sig', sig);
  return u.toString();
}

export function buildClickUrl(params: {
  campaignId: string;
  recipientId: string;
  destinationUrl: string;
}): string | null {
  const baseUrl = getAppBaseUrl();
  const sig = signTrackingValue(
    `click|${params.campaignId}|${params.recipientId}|${params.destinationUrl}`
  );
  if (!baseUrl || !sig) return null;

  const u = new URL('/api/email/click', baseUrl);
  u.searchParams.set('cid', params.campaignId);
  u.searchParams.set('rid', params.recipientId);
  u.searchParams.set('u', params.destinationUrl);
  u.searchParams.set('sig', sig);
  return u.toString();
}

export function buildUnsubscribeUrl(params: { campaignId: string; recipientId: string }): string | null {
  const baseUrl = getAppBaseUrl();
  const sig = signTrackingValue(`unsub|${params.campaignId}|${params.recipientId}`);
  if (!baseUrl || !sig) return null;

  const u = new URL('/api/unsubscribe', baseUrl);
  u.searchParams.set('cid', params.campaignId);
  u.searchParams.set('rid', params.recipientId);
  u.searchParams.set('sig', sig);
  return u.toString();
}

function isSkippableHref(href: string): boolean {
  const h = href.trim().toLowerCase();
  if (!h) return true;
  if (h.startsWith('mailto:')) return true;
  if (h.startsWith('tel:')) return true;
  if (h.startsWith('#')) return true;
  if (h.startsWith('javascript:')) return true;
  return false;
}

export function rewriteHtmlLinksForClickTracking(params: {
  html: string;
  campaignId: string;
  recipientId: string;
}): string {
  const { html, campaignId, recipientId } = params;

  // If we can't sign or don't know base URL, keep HTML as-is.
  if (!getAppBaseUrl() || !getEmailTrackingSecret()) return html;

  const re = /(<a\b[^>]*\bhref\s*=\s*)(["'])(.*?)\2/gi;

  return html.replace(re, (match, prefix: string, quote: string, hrefRaw: string) => {
    const href = String(hrefRaw || '').trim();
    if (isSkippableHref(href)) return match;

    // Only rewrite absolute http(s) links.
    let dest: URL;
    try {
      dest = new URL(href);
    } catch {
      return match;
    }
    if (dest.protocol !== 'http:' && dest.protocol !== 'https:') return match;

    const tracked = buildClickUrl({
      campaignId,
      recipientId,
      destinationUrl: dest.toString(),
    });
    if (!tracked) return match;

    return `${prefix}${quote}${tracked}${quote}`;
  });
}

export function injectOpenPixel(html: string, pixelUrl: string | null): string {
  if (!pixelUrl) return html;

  const pixel = `<img src=\"${pixelUrl}\" width=\"1\" height=\"1\" style=\"display:none!important\" alt=\"\" />`;
  const marker = '</body>';
  const lower = html.toLowerCase();
  const idx = lower.lastIndexOf(marker);
  if (idx >= 0) {
    return html.slice(0, idx) + pixel + html.slice(idx);
  }
  return html + pixel;
}

export function appendUnsubscribeFooter(html: string, unsubscribeUrl: string | null): string {
  if (!unsubscribeUrl) return html;

  const footer = [
    '<div style=\"margin-top:16px;font-size:12px;color:#666\">',
    `Για να διαγραφείτε από αυτή τη λίστα, πατήστε <a href=\"${unsubscribeUrl}\">εδώ</a>.`,
    '</div>',
  ].join('');

  const marker = '</body>';
  const lower = html.toLowerCase();
  const idx = lower.lastIndexOf(marker);
  if (idx >= 0) {
    return html.slice(0, idx) + footer + html.slice(idx);
  }
  return html + footer;
}
