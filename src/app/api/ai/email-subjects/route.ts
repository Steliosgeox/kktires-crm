import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { generateGreekSubjectLines } from '@/lib/ai/meltemi';
import { createRequestId, handleApiError, withValidatedBody } from '@/server/api/http';

const SubjectRequestSchema = z.object({
  emailContent: z.string().trim().min(1).max(20_000),
  count: z.number().int().min(1).max(10).optional(),
});

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', requestId },
        { status: 401 }
      );
    }

    const body = await withValidatedBody(request, SubjectRequestSchema, {
      maxBytes: 100_000,
    });
    const result = await generateGreekSubjectLines(body.emailContent, body.count ?? 5);

    if (!result.success) {
      return NextResponse.json({
        suggestions: [],
        error: result.error,
        source: 'fallback',
        requestId,
      });
    }

    const suggestions = parseSubjectLines(result.generatedText || '');
    return NextResponse.json({ suggestions, source: 'meltemi', requestId });
  } catch (error) {
    return handleApiError('ai/email-subjects', error, requestId, {
      message: 'Failed to generate subject suggestions',
    });
  }
}

function parseSubjectLines(text: string): string[] {
  const lines = text.split('\n').filter((line) => line.trim());
  const suggestions: string[] = [];

  for (const line of lines) {
    const cleaned = line.replace(/^\d+[\.\)]\s*/, '').trim();
    if (cleaned && cleaned.length > 0 && cleaned.length < 100) {
      suggestions.push(cleaned);
    }
  }

  return suggestions.slice(0, 5);
}
