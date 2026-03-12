import type { EmailAiAction } from './types';

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

async function postJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = await readJson(response);
  if (!response.ok) {
    const message =
      typeof payload.error === 'string'
        ? payload.error
        : `${url} failed (${response.status} ${response.statusText})`;
    throw new Error(message);
  }

  return payload;
}

export async function requestAiAssist(
  action: EmailAiAction,
  currentContent: string
): Promise<{ content?: string; subjects?: string[] }> {
  if (action === 'expand') {
    const payload = await postJson('/api/ai/email-expand', {
      briefNote: currentContent,
      customer: { firstName: 'Customer' },
    });

    return {
      content:
        typeof payload.generatedText === 'string' ? payload.generatedText : undefined,
    };
  }

  if (action === 'improve') {
    const payload = await postJson('/api/ai/email-assist', {
      content: currentContent,
      language: 'el',
      tone: 'professional',
    });

    return {
      content: typeof payload.improved === 'string' ? payload.improved : undefined,
    };
  }

  const payload = await postJson('/api/ai/email-subjects', {
    emailContent: currentContent,
    count: 5,
  });

  return {
    subjects: Array.isArray(payload.suggestions)
      ? payload.suggestions.filter((item): item is string => typeof item === 'string')
      : [],
  };
}
