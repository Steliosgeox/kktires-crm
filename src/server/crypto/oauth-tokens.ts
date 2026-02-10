import crypto from 'crypto';

const PREFIX = 'enc:v1:';
const AAD = Buffer.from('kktires-oauth-token', 'utf8');

function base64urlEncode(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64urlDecode(str: string): Buffer {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const pad = padLen ? '='.repeat(padLen) : '';
  return Buffer.from(padded + pad, 'base64');
}

export function getOAuthTokenEncryptionKey(): Buffer | null {
  const raw = process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
  if (!raw) return null;

  try {
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) return null;
    return key;
  } catch {
    return null;
  }
}

export function isEncryptedToken(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export function encryptOAuthToken(plain: string): string {
  const key = getOAuthTokenEncryptionKey();
  if (!key) return plain;
  if (plain.startsWith(PREFIX)) return plain;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(AAD);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return PREFIX + base64urlEncode(Buffer.concat([iv, ciphertext, tag]));
}

export function decryptOAuthToken(maybeEncrypted: string): string {
  if (!maybeEncrypted.startsWith(PREFIX)) return maybeEncrypted;

  const key = getOAuthTokenEncryptionKey();
  if (!key) {
    throw new Error('OAUTH_TOKEN_ENCRYPTION_KEY is required to decrypt stored OAuth tokens');
  }

  const payload = base64urlDecode(maybeEncrypted.slice(PREFIX.length));
  if (payload.length < 12 + 16) {
    throw new Error('Invalid encrypted token payload');
  }

  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(payload.length - 16);
  const ciphertext = payload.subarray(12, payload.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(AAD);
  decipher.setAuthTag(tag);

  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString('utf8');
}

export function encryptAccountTokens<T extends Record<string, unknown>>(account: T): T {
  // NextAuth account uses snake_case fields (access_token, refresh_token, id_token)
  const out = { ...account } as any;

  for (const key of ['access_token', 'refresh_token', 'id_token'] as const) {
    const v = out[key];
    if (typeof v === 'string' && v.length > 0) {
      out[key] = encryptOAuthToken(v);
    }
  }

  return out;
}

export function decryptAccountToken(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!isEncryptedToken(value)) return value;
  return decryptOAuthToken(value);
}
