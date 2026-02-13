import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetSmtpReadiness, mockSendSmtpEmailDetailed } = vi.hoisted(() => ({
  mockGetSmtpReadiness: vi.fn(),
  mockSendSmtpEmailDetailed: vi.fn(),
}));

vi.mock('@/server/email/smtp', () => ({
  getSmtpReadiness: mockGetSmtpReadiness,
  sendSmtpEmailDetailed: mockSendSmtpEmailDetailed,
}));

describe('email transport (SMTP-only)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns readiness error when SMTP is not configured', async () => {
    mockGetSmtpReadiness.mockReturnValue({
      configured: false,
      missing: ['SMTP_HOST', 'SMTP_PASS'],
      host: null,
      port: null,
      secure: null,
      from: null,
    });

    const { ensureEmailTransportReady, sendEmail } = await import('@/server/email/transport');

    const readiness = ensureEmailTransportReady();
    expect(readiness.ok).toBe(false);
    if (!readiness.ok) {
      expect(readiness.errorCode).toBe('SMTP_NOT_CONFIGURED');
      expect(readiness.errorMessage).toContain('SMTP is not configured');
      expect(readiness.missing).toEqual(['SMTP_HOST', 'SMTP_PASS']);
    }

    const sendResult = await sendEmail({
      to: 'someone@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });
    expect(sendResult.ok).toBe(false);
    if (!sendResult.ok) {
      expect(sendResult.errorCode).toBe('SMTP_NOT_CONFIGURED');
      expect(sendResult.errorMessage).toContain('SMTP is not configured');
    }
  });

  it('returns success payload for SMTP send success', async () => {
    mockGetSmtpReadiness.mockReturnValue({
      configured: true,
      missing: [],
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      from: 'info@example.com',
    });
    mockSendSmtpEmailDetailed.mockResolvedValue({
      ok: true,
      provider: 'smtp',
      messageId: '<msg-123@example.com>',
    });

    const { sendEmail } = await import('@/server/email/transport');
    const result = await sendEmail({
      to: 'receiver@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider).toBe('smtp');
      expect(result.messageId).toBe('<msg-123@example.com>');
    }
  });

  it('maps SMTP send failures to stable error codes', async () => {
    mockGetSmtpReadiness.mockReturnValue({
      configured: true,
      missing: [],
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      from: 'info@example.com',
    });
    mockSendSmtpEmailDetailed.mockResolvedValue({
      ok: false,
      provider: 'smtp',
      errorCode: 'SMTP_SEND_FAILED',
      errorMessage: 'connect ECONNREFUSED 127.0.0.1:587',
    });

    const { sendEmail } = await import('@/server/email/transport');
    const result = await sendEmail({
      to: 'receiver@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.provider).toBe('smtp');
      expect(result.errorCode).toBe('SMTP_SEND_FAILED');
      expect(result.errorMessage).toContain('ECONNREFUSED');
    }
  });
});

