import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { createRequestId, handleApiError, withValidatedBody } from '@/server/api/http';

const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/ilsp/Meltemi-7B-v1';

const EmailAssistRequestSchema = z.object({
  content: z.string().trim().min(1).max(20_000),
  tone: z.enum(['professional', 'friendly', 'formal']).default('professional'),
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

    const body = await withValidatedBody(request, EmailAssistRequestSchema, {
      maxBytes: 100_000,
    });
    const { content, tone } = body;

    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ improved: content, source: 'fallback', requestId });
    }

    const toneInstructions = {
      professional: 'professional and clear',
      friendly: 'friendly and warm',
      formal: 'formal and business-like',
    } as const;

    const prompt = `Improve the email text below so it is ${toneInstructions[tone]}.\n` +
      'Keep the original meaning and return only the improved body.\n\n' +
      `Original:\n${content}\n\nImproved:`;

    try {
      const response = await fetch(HUGGINGFACE_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.7,
            top_p: 0.95,
            do_sample: true,
            return_full_text: false,
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 503) {
          return NextResponse.json({
            improved: content,
            source: 'original',
            requestId,
            message: 'AI model is loading, please try again in a moment',
          });
        }
        return NextResponse.json({ improved: content, source: 'fallback', requestId });
      }

      const result = await response.json();
      let improved = content;
      if (Array.isArray(result) && result[0]?.generated_text) {
        improved = String(result[0].generated_text).trim();
      } else if (typeof result === 'string') {
        improved = result.trim();
      }

      return NextResponse.json({
        improved,
        source: 'meltemi',
        requestId,
      });
    } catch (aiError) {
      console.error(`[ai/email-assist] requestId=${requestId}`, aiError);
      return NextResponse.json({ improved: content, source: 'fallback', requestId });
    }
  } catch (error) {
    return handleApiError('ai/email-assist', error, requestId, {
      message: 'Failed to process request',
    });
  }
}
