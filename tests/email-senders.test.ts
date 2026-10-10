import { vi } from 'vitest';

const ORIGINAL_ENV = {
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM,
  SMTP_SENDERS_JSON: process.env.SMTP_SENDERS_JSON,
};

describe('smtp sender configuration helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SMTP_HOST = 'mail.primary.gr';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'info@kktires.gr';
    process.env.SMTP_PASS = 'primary-secret';
    process.env.SMTP_FROM = 'info@kktires.gr';
    process.env.SMTP_SENDERS_JSON = JSON.stringify([
      {
        id: 'kctparts',
        label: 'KC T Parts',
        fromEmail: 'info@kctparts.gr',
        host: 'mail.parts.gr',
        port: 587,
        secure: false,
        user: 'info@kctparts.gr',
        pass: 'parts-secret',
      },
    ]);
  });

  afterEach(() => {
    process.env.SMTP_HOST = ORIGINAL_ENV.SMTP_HOST;
    process.env.SMTP_PORT = ORIGINAL_ENV.SMTP_PORT;
    process.env.SMTP_SECURE = ORIGINAL_ENV.SMTP_SECURE;
    process.env.SMTP_USER = ORIGINAL_ENV.SMTP_USER;
    process.env.SMTP_PASS = ORIGINAL_ENV.SMTP_PASS;
    process.env.SMTP_FROM = ORIGINAL_ENV.SMTP_FROM;
    process.env.SMTP_SENDERS_JSON = ORIGINAL_ENV.SMTP_SENDERS_JSON;
  });

  it('returns configured senders plus the primary SMTP sender', async () => {
    const sendersModule = await import('@/server/email/senders');

    const safe = sendersModule.listSafeSmtpSenders();
    expect(safe).toEqual([
      {
        id: 'primary',
        label: 'Primary SMTP',
        fromEmail: 'info@kktires.gr',
        isPrimary: true,
      },
      {
        id: 'kctparts',
        label: 'KC T Parts',
        fromEmail: 'info@kctparts.gr',
        isPrimary: false,
      },
    ]);
    expect(sendersModule.findSmtpSenderByEmail('INFO@KCTPARTS.GR')?.user).toBe('info@kctparts.gr');
    expect(sendersModule.getPrimarySmtpSenderEmail()).toBe('info@kktires.gr');
  });

  it('returns the primary sender when SMTP_SENDERS_JSON is absent', async () => {
    process.env.SMTP_SENDERS_JSON = '';
    const sendersModule = await import('@/server/email/senders');

    expect(sendersModule.listSafeSmtpSenders()).toEqual([
      {
        id: 'primary',
        label: 'Primary SMTP',
        fromEmail: 'info@kktires.gr',
        isPrimary: true,
      },
    ]);
    expect(sendersModule.findSmtpSenderByEmail('info@kktires.gr')?.user).toBe('info@kktires.gr');
  });

  it('rejects malformed SMTP_SENDERS_JSON payloads', async () => {
    process.env.SMTP_SENDERS_JSON = '{"broken":true';
    const sendersModule = await import('@/server/email/senders');

    expect(() => sendersModule.getConfiguredSmtpSenders()).toThrow(/valid JSON/i);
  });

  it('falls back to the primary sender when SMTP_SENDERS_JSON is malformed', async () => {
    process.env.SMTP_SENDERS_JSON = '{"broken":true';
    const sendersModule = await import('@/server/email/senders');

    expect(sendersModule.listSafeSmtpSenders()).toEqual([
      {
        id: 'primary',
        label: 'Primary SMTP',
        fromEmail: 'info@kktires.gr',
        isPrimary: true,
      },
    ]);
    expect(sendersModule.findSmtpSenderByEmail('info@kctparts.gr')).toBeNull();
  });

  it('rejects duplicate sender emails', async () => {
    process.env.SMTP_SENDERS_JSON = JSON.stringify([
      {
        id: 'one',
        label: 'One',
        fromEmail: 'info@kctparts.gr',
        host: 'mail.one.gr',
        port: 587,
        secure: false,
        user: 'info@kctparts.gr',
        pass: 'secret-1',
      },
      {
        id: 'two',
        label: 'Two',
        fromEmail: 'info@kctparts.gr',
        host: 'mail.two.gr',
        port: 587,
        secure: false,
        user: 'info@kctparts.gr',
        pass: 'secret-2',
      },
    ]);
    const sendersModule = await import('@/server/email/senders');

    expect(() => sendersModule.getConfiguredSmtpSenders()).toThrow(/duplicate sender email/i);
  });

  it('rejects incomplete sender entries', async () => {
    process.env.SMTP_SENDERS_JSON = JSON.stringify([
      {
        id: 'broken',
        label: 'Broken Sender',
        fromEmail: 'info@broken.gr',
        host: 'mail.broken.gr',
        port: 587,
        secure: false,
        user: 'info@broken.gr',
      },
    ]);
    const sendersModule = await import('@/server/email/senders');

    expect(() => sendersModule.getConfiguredSmtpSenders()).toThrow(/pass/i);
  });
});
