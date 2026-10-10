import nodemailer from 'nodemailer';
import { findSmtpSenderByEmail, getPrimarySmtpSender } from './senders';

export type SmtpConfig = {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

export type SmtpReadiness = {
  configured: boolean;
  missing: string[];
  host: string | null;
  port: number | null;
  secure: boolean | null;
  from: string | null;
};

function parsePrimarySmtpConfig(): SmtpConfig | null {
  const primary = getPrimarySmtpSender();
  if (!primary) return null;

  return {
    id: primary.id,
    host: primary.host,
    port: primary.port,
    secure: primary.secure,
    user: primary.user,
    pass: primary.pass,
    from: primary.fromEmail,
  };
}

function parseSmtpConfig(senderEmail?: string): SmtpConfig | null {
  if (!senderEmail) {
    return parsePrimarySmtpConfig();
  }

  const sender = findSmtpSenderByEmail(senderEmail);
  if (!sender) return null;

  return {
    id: sender.id,
    host: sender.host,
    port: sender.port,
    secure: sender.secure,
    user: sender.user,
    pass: sender.pass,
    from: sender.fromEmail,
  };
}

export function isSmtpConfigured(): boolean {
  return !!parseSmtpConfig();
}

export function getSmtpReadiness(senderEmail?: string): SmtpReadiness {
  const cfg = parseSmtpConfig(senderEmail);
  if (cfg) {
    return {
      configured: true,
      missing: [],
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      from: cfg.from,
    };
  }

  if (senderEmail) {
    return {
      configured: false,
      missing: [`SMTP sender "${senderEmail}"`],
      host: null,
      port: null,
      secure: null,
      from: senderEmail,
    };
  }

  const host = process.env.SMTP_HOST?.trim() || null;
  const portRaw = process.env.SMTP_PORT?.trim() || null;
  const user = process.env.SMTP_USER?.trim() || null;
  const pass = process.env.SMTP_PASS?.trim() || null;
  const fromRaw = process.env.SMTP_FROM?.trim() || user;

  const missing: string[] = [];
  if (!host) missing.push('SMTP_HOST');
  if (!portRaw) missing.push('SMTP_PORT');
  if (!user) missing.push('SMTP_USER');
  if (!pass) missing.push('SMTP_PASS');

  const port = portRaw ? Number.parseInt(portRaw, 10) : NaN;
  if (!Number.isFinite(port) || port <= 0) {
    missing.push('SMTP_PORT(valid)');
  }

  const secureRaw = (process.env.SMTP_SECURE || '').trim().toLowerCase();
  const secure =
    secureRaw === 'true' ||
    secureRaw === '1' ||
    (Number.isFinite(port) && port === 465);

  const from = (fromRaw || '').trim();
  if (!from) {
    missing.push('SMTP_FROM_or_SMTP_USER');
  }

  return {
    configured: missing.length === 0,
    missing,
    host,
    port: Number.isFinite(port) ? port : null,
    secure,
    from: from || null,
  };
}

// Avoid depending on nodemailer type declarations during builds (some CI setups omit devDependencies).
// Runtime is still nodemailer; this is only about TS types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transportCache = new Map<string, any>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTransport(senderEmail?: string): any {
  const cfg = parseSmtpConfig(senderEmail);
  if (!cfg) {
    throw new Error('SMTP is not configured (missing SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS)');
  }

  const cacheKey = cfg.id;
  const existing = transportCache.get(cacheKey);
  if (existing) return existing;

  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
    // Hard timeouts prevent SMTP hangs from blocking serverless invocations.
    // Without these, a stalled SMTP server can hold the Vercel function open until
    // the platform hard-kills it (60 s), leaving the email job locked for 15 min.
    connectionTimeout: 10_000, // 10 s to establish TCP connection
    greetingTimeout: 5_000, // 5 s for the SMTP greeting banner
    socketTimeout: 30_000, // 30 s idle per socket operation
  });

  transportCache.set(cacheKey, transport);
  return transport;
}

export type SmtpSendResult =
  | { ok: true; provider: 'smtp'; messageId?: string }
  | {
      ok: false;
      provider: 'smtp';
      errorCode: 'SMTP_NOT_CONFIGURED' | 'SMTP_SEND_FAILED';
      errorMessage: string;
    };

function formatSendError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'SMTP send failed';
}

export async function sendSmtpEmailDetailed(params: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
  from?: string;
  senderEmail?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | Uint8Array;
    contentType?: string;
    cid?: string;
    disposition?: 'inline' | 'attachment';
  }>;
}): Promise<SmtpSendResult> {
  const cfg = parseSmtpConfig(params.senderEmail);
  if (!cfg) {
    const readiness = getSmtpReadiness(params.senderEmail);
    const details = readiness.missing.length > 0 ? ` Missing: ${readiness.missing.join(', ')}.` : '';
    return {
      ok: false,
      provider: 'smtp',
      errorCode: 'SMTP_NOT_CONFIGURED',
      errorMessage: `SMTP is not configured.${details}`,
    };
  }

  try {
    const info = await getTransport(params.senderEmail).sendMail({
      from: params.from || cfg.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      headers: params.headers,
      attachments: params.attachments,
    });
    return { ok: true, provider: 'smtp', messageId: info?.messageId };
  } catch (error) {
    // Reset the cached transport for this sender so the next caller gets a fresh connection.
    transportCache.delete(cfg.id);
    const message = formatSendError(error);
    console.error('SMTP send error:', error);
    return {
      ok: false,
      provider: 'smtp',
      errorCode: 'SMTP_SEND_FAILED',
      errorMessage: message,
    };
  }
}

export async function sendSmtpEmail(params: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
  from?: string;
  senderEmail?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | Uint8Array;
    contentType?: string;
    cid?: string;
    disposition?: 'inline' | 'attachment';
  }>;
}): Promise<boolean> {
  const result = await sendSmtpEmailDetailed(params);
  return result.ok;
}
