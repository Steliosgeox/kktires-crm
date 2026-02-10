import nodemailer from 'nodemailer';

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

function getSmtpConfig(): SmtpConfig | null {
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
  return !!getSmtpConfig();
}

// Avoid depending on nodemailer type declarations during builds (some CI setups omit devDependencies).
// Runtime is still nodemailer; this is only about TS types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let transport: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTransport(): any {
  if (transport) return transport;
  const cfg = getSmtpConfig();
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

export async function sendSmtpEmail(params: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
  from?: string;
}): Promise<boolean> {
  const cfg = getSmtpConfig();
  if (!cfg) return false;

  try {
    await getTransport().sendMail({
      from: params.from || cfg.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      headers: params.headers,
    });
    return true;
  } catch (error) {
    console.error('SMTP send error:', error);
    return false;
  }
}
