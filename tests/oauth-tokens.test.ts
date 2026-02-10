import crypto from 'crypto';

import { decryptOAuthToken, encryptOAuthToken, isEncryptedToken } from '../src/server/crypto/oauth-tokens';

function randomKeyB64() {
  return crypto.randomBytes(32).toString('base64');
}

const ORIGINAL_KEY = process.env.OAUTH_TOKEN_ENCRYPTION_KEY;

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
  else process.env.OAUTH_TOKEN_ENCRYPTION_KEY = ORIGINAL_KEY;
});

describe('OAuth Token Encryption', () => {
  it('round-trips with AES-256-GCM when key is configured', () => {
    process.env.OAUTH_TOKEN_ENCRYPTION_KEY = randomKeyB64();

    const plain = 'refresh_token_example';
    const enc = encryptOAuthToken(plain);
    expect(isEncryptedToken(enc)).toBe(true);
    expect(decryptOAuthToken(enc)).toBe(plain);
  });

  it('passes through when key is missing', () => {
    delete process.env.OAUTH_TOKEN_ENCRYPTION_KEY;

    const plain = 'access_token_example';
    const enc = encryptOAuthToken(plain);
    expect(enc).toBe(plain);
    expect(isEncryptedToken(enc)).toBe(false);
    expect(decryptOAuthToken(enc)).toBe(plain);
  });

  it('throws when decrypting an encrypted token without a key', () => {
    process.env.OAUTH_TOKEN_ENCRYPTION_KEY = randomKeyB64();

    const enc = encryptOAuthToken('id_token_example');
    delete process.env.OAUTH_TOKEN_ENCRYPTION_KEY;

    expect(() => decryptOAuthToken(enc)).toThrow();
  });
});
