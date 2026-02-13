import { getSmtpReadiness, sendSmtpEmailDetailed } from './smtp';

export type EmailTransportProvider = 'smtp';

export type EmailTransportErrorCode =
  | 'SMTP_NOT_CONFIGURED'
  | 'SMTP_SEND_FAILED';

export type EmailSendParams = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
  from?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | Uint8Array;
    contentType?: string;
    cid?: string;
    disposition?: 'inline' | 'attachment';
  }>;
};

export type EmailSendResult =
  | {
      ok: true;
      provider: EmailTransportProvider;
      messageId?: string;
    }
  | {
      ok: false;
      provider: EmailTransportProvider;
      errorCode: EmailTransportErrorCode;
      errorMessage: string;
    };

export type EmailTransportReadiness =
  | {
      ok: true;
      provider: EmailTransportProvider;
    }
  | {
      ok: false;
      provider: EmailTransportProvider;
      errorCode: 'SMTP_NOT_CONFIGURED';
      errorMessage: string;
      missing: string[];
    };

function formatMissingEnv(missing: string[]): string {
  if (missing.length === 0) {
    return '';
  }
  return ` Missing: ${missing.join(', ')}.`;
}

export function ensureEmailTransportReady(): EmailTransportReadiness {
  const readiness = getSmtpReadiness();
  if (!readiness.configured) {
    return {
      ok: false,
      provider: 'smtp',
      errorCode: 'SMTP_NOT_CONFIGURED',
      errorMessage: `SMTP is not configured.${formatMissingEnv(readiness.missing)}`,
      missing: readiness.missing,
    };
  }

  return { ok: true, provider: 'smtp' };
}

export async function sendEmail(params: EmailSendParams): Promise<EmailSendResult> {
  const readiness = ensureEmailTransportReady();
  if (!readiness.ok) {
    return {
      ok: false,
      provider: readiness.provider,
      errorCode: readiness.errorCode,
      errorMessage: readiness.errorMessage,
    };
  }

  const result = await sendSmtpEmailDetailed(params);
  if (result.ok) {
    return {
      ok: true,
      provider: result.provider,
      messageId: result.messageId,
    };
  }

  return {
    ok: false,
    provider: result.provider,
    errorCode: result.errorCode,
    errorMessage: result.errorMessage,
  };
}

