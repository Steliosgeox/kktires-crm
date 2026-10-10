type SmtpSenderSource = 'primary' | 'configured';

export type SmtpSenderConfig = {
  id: string;
  label: string;
  fromEmail: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  isPrimary: boolean;
  source: SmtpSenderSource;
};

export type SafeSmtpSender = Pick<SmtpSenderConfig, 'id' | 'label' | 'fromEmail' | 'isPrimary'>;

const PRIMARY_SMTP_SENDER_ID = 'primary';
const PRIMARY_SMTP_SENDER_LABEL = 'Primary SMTP';

let cachedSendersRaw: string | null = null;
let cachedSenders: SmtpSenderConfig[] = [];
let cachedSendersError: Error | null = null;
let loggedSendersErrorRaw: string | null = null;

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function parsePort(value: unknown, label: string): number {
  const raw = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
  const port = Number.parseInt(raw, 10);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return port;
}

function parseSecure(value: unknown, port: number, label: string): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  if (value === undefined || value === null || value === '') {
    return port === 465;
  }
  throw new Error(`${label} must be a boolean`);
}

function requireTrimmedString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a non-empty string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return trimmed;
}

function requirePassword(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function toConfiguredSender(
  value: unknown,
  index: number
): SmtpSenderConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`SMTP_SENDERS_JSON[${index}] must be an object`);
  }

  const row = value as Record<string, unknown>;
  const id = requireTrimmedString(row.id, `SMTP_SENDERS_JSON[${index}].id`);
  const label = requireTrimmedString(row.label, `SMTP_SENDERS_JSON[${index}].label`);
  const host = requireTrimmedString(row.host, `SMTP_SENDERS_JSON[${index}].host`);
  const user = requireTrimmedString(row.user, `SMTP_SENDERS_JSON[${index}].user`);
  const pass = requirePassword(row.pass, `SMTP_SENDERS_JSON[${index}].pass`);
  const port = parsePort(row.port, `SMTP_SENDERS_JSON[${index}].port`);
  const secure = parseSecure(row.secure, port, `SMTP_SENDERS_JSON[${index}].secure`);
  const fromEmail = normalizeEmail(requireTrimmedString(row.fromEmail, `SMTP_SENDERS_JSON[${index}].fromEmail`));

  if (!fromEmail) {
    throw new Error(`SMTP_SENDERS_JSON[${index}].fromEmail must be a valid email`);
  }

  return {
    id,
    label,
    fromEmail,
    host,
    port,
    secure,
    user,
    pass,
    isPrimary: false,
    source: 'configured',
  };
}

function parseConfiguredSmtpSenders(raw: string): SmtpSenderConfig[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `SMTP_SENDERS_JSON must be valid JSON: ${error instanceof Error ? error.message : 'unknown parse error'}`
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error('SMTP_SENDERS_JSON must be a JSON array');
  }

  const senders = parsed.map((item, index) => toConfiguredSender(item, index));
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();

  for (const sender of senders) {
    if (seenIds.has(sender.id)) {
      throw new Error(`SMTP_SENDERS_JSON contains duplicate sender id "${sender.id}"`);
    }
    if (seenEmails.has(sender.fromEmail)) {
      throw new Error(`SMTP_SENDERS_JSON contains duplicate sender email "${sender.fromEmail}"`);
    }
    seenIds.add(sender.id);
    seenEmails.add(sender.fromEmail);
  }

  return senders;
}

export function getConfiguredSmtpSenders(): SmtpSenderConfig[] {
  const raw = process.env.SMTP_SENDERS_JSON?.trim() || '';
  if (!raw) {
    cachedSendersRaw = raw;
    cachedSenders = [];
    cachedSendersError = null;
    loggedSendersErrorRaw = null;
    return [];
  }

  if (cachedSendersRaw === raw) {
    if (cachedSendersError) throw cachedSendersError;
    return cachedSenders;
  }

  cachedSendersRaw = raw;
  try {
    cachedSenders = parseConfiguredSmtpSenders(raw);
    cachedSendersError = null;
    loggedSendersErrorRaw = null;
    return cachedSenders;
  } catch (error) {
    cachedSenders = [];
    cachedSendersError = error instanceof Error ? error : new Error(String(error));
    throw cachedSendersError;
  }
}

function getConfiguredSmtpSendersSafe(): SmtpSenderConfig[] {
  try {
    return getConfiguredSmtpSenders();
  } catch (error) {
    const raw = process.env.SMTP_SENDERS_JSON?.trim() || '';
    if (raw && loggedSendersErrorRaw !== raw) {
      loggedSendersErrorRaw = raw;
      console.error('Invalid SMTP_SENDERS_JSON. Falling back to the primary SMTP sender only.', error);
    }
    return [];
  }
}

export function getPrimarySmtpSender(): SmtpSenderConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const fromEmail = normalizeEmail(process.env.SMTP_FROM || user || '');

  if (!host || !portRaw || !user || !pass || !fromEmail) {
    return null;
  }

  const port = Number.parseInt(portRaw, 10);
  if (!Number.isFinite(port) || port <= 0) {
    return null;
  }

  return {
    id: PRIMARY_SMTP_SENDER_ID,
    label: PRIMARY_SMTP_SENDER_LABEL,
    fromEmail,
    host,
    port,
    secure: parseSecure(process.env.SMTP_SECURE || '', port, 'SMTP_SECURE'),
    user,
    pass,
    isPrimary: true,
    source: 'primary',
  };
}

export function getAvailableSmtpSenders(options?: { strict?: boolean }): SmtpSenderConfig[] {
  const configured = options?.strict ? getConfiguredSmtpSenders() : getConfiguredSmtpSendersSafe();
  const primary = getPrimarySmtpSender();

  if (!primary) return configured;
  if (configured.some((sender) => sender.fromEmail === primary.fromEmail)) {
    return configured;
  }

  return [primary, ...configured];
}

export function listSafeSmtpSenders(options?: { strict?: boolean }): SafeSmtpSender[] {
  return getAvailableSmtpSenders(options).map(({ id, label, fromEmail, isPrimary }) => ({
    id,
    label,
    fromEmail,
    isPrimary,
  }));
}

export function findSmtpSenderByEmail(email: string | null | undefined): SmtpSenderConfig | null {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  return getAvailableSmtpSenders().find((sender) => sender.fromEmail === normalized) || null;
}

export function isKnownSmtpSender(email: string | null | undefined): boolean {
  return !!findSmtpSenderByEmail(email);
}

export function getPrimarySmtpSenderEmail(): string | null {
  return getPrimarySmtpSender()?.fromEmail || null;
}

export function hasMultipleAvailableSmtpSenders(): boolean {
  return getAvailableSmtpSenders().length > 1;
}
