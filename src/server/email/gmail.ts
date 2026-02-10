import { db } from '@/lib/db';
import { accounts } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { decryptAccountToken, encryptOAuthToken } from '@/server/crypto/oauth-tokens';

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  html?: boolean;
  headers?: Record<string, string>;
}

export async function getGmailAccessToken(userId: string): Promise<string | null> {
  const account = await db.query.accounts.findFirst({
    where: (a, { and, eq }) => and(eq(a.userId, userId), eq(a.provider, 'google')),
  });

  if (!account?.access_token) {
    return null;
  }

  let accessToken: string;
  let refreshToken: string | null = null;
  try {
    accessToken = decryptAccountToken(account.access_token) || '';
    refreshToken = decryptAccountToken(account.refresh_token);
  } catch (error) {
    console.error('Failed to decrypt OAuth tokens. Is OAUTH_TOKEN_ENCRYPTION_KEY set?', error);
    return null;
  }

  if (!accessToken) return null;

  // Check if token is expired and refresh if needed
  if (account.expires_at && account.expires_at * 1000 < Date.now()) {
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      const tokens = await response.json();
      if (tokens.error) {
        console.error('Token refresh error:', tokens);
        return null;
      }

      await db
        .update(accounts)
        .set({
          access_token: encryptOAuthToken(tokens.access_token),
          expires_at: Math.floor(Date.now() / 1000) + (tokens.expires_in || 0),
        })
        .where(eq(accounts.id, account.id));

      return tokens.access_token;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }

  return accessToken;
}

export async function sendGmailEmail(accessToken: string, email: EmailPayload): Promise<boolean> {
  const extraHeaders: string[] = [];
  if (email.headers && typeof email.headers === 'object') {
    for (const [k, v] of Object.entries(email.headers)) {
      const name = String(k || '').trim();
      if (!/^[A-Za-z0-9-]+$/.test(name)) continue;
      const value = String(v ?? '').replace(/[\r\n]+/g, ' ').trim();
      if (!value) continue;
      extraHeaders.push(`${name}: ${value}`);
    }
  }

  const message = [
    `To: ${email.to}`,
    `Subject: =?UTF-8?B?${Buffer.from(email.subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    ...extraHeaders,
    email.html ? 'Content-Type: text/html; charset=UTF-8' : 'Content-Type: text/plain; charset=UTF-8',
    '',
    email.body,
  ].join('\r\n');

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Gmail API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}
