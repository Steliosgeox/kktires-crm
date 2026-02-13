import nodemailer from 'nodemailer';

export type SmtpConfig = {
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

function parseSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!host || !portRaw || !user || !pass) return null;

  const port = Number.parseInt(portRaw, 10);
  if (!Number.isFinite(port) || port <= 0) return null;

  const secureRaw = (process.env.SMTP_SECURE || '').trim().toLowerCase();
  const secure =
    secureRaw === 'true' ||
    secureRaw === '1' ||
    // Common defaults: 465 = implicit TLS
    port === 465;

  const from = (process.env.SMTP_FROM || user).trim();
  if (!from) return null;

  return { host, port, secure, user, pass, from };
}

export function isSmtpConfigured(): boolean {
  return !!parseSmtpConfig();
}

export function getSmtpReadiness(): SmtpReadiness {
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
let transport: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTransport(): any {
  if (transport) return transport;
  const cfg = parseSmtpConfig();
  if (!cfg) {
    throw new Error('SMTP is not configured (missing SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS)');
  }

  transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });

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
}): Promise<SmtpSendResult> {
  const cfg = parseSmtpConfig();
  if (!cfg) {
    const readiness = getSmtpReadiness();
    const details = readiness.missing.length > 0 ? ` Missing: ${readiness.missing.join(', ')}.` : '';
    return {
      ok: false,
      provider: 'smtp',
      errorCode: 'SMTP_NOT_CONFIGURED',
      errorMessage: `SMTP is not configured.${details}`,
    };
  }

  try {
    const info = await getTransport().sendMail({
      from: params.from || cfg.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      headers: params.headers,
    });
    return { ok: true, provider: 'smtp', messageId: info?.messageId };
  } catch (error) {
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
}): Promise<boolean> {
  const result = await sendSmtpEmailDetailed(params);
  return result.ok;
}
