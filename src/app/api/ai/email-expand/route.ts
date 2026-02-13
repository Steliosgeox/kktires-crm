import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { expandToGreekEmail, type CustomerContext } from '@/lib/ai/meltemi';
import { createRequestId, handleApiError, withValidatedBody } from '@/server/api/http';

const ExpandRequestSchema = z.object({
  briefNote: z.string().trim().min(1).max(20_000),
  customer: z
    .object({
      firstName: z.string().trim().max(120).optional(),
      lastName: z.string().trim().max(120).optional(),
      company: z.string().trim().max(160).optional(),
      email: z.string().trim().email().max(254).optional(),
    })
    .optional(),
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

    const body = await withValidatedBody(request, ExpandRequestSchema, { maxBytes: 100_000 });
    const customerContext: CustomerContext = {
      firstName: body.customer?.firstName || 'Customer',
      lastName: body.customer?.lastName,
      company: body.customer?.company,
      email: body.customer?.email,
    };

    const result = await expandToGreekEmail(body.briefNote, customerContext);
    if (!result.success) {
      return NextResponse.json({
        generatedText: body.briefNote,
        error: result.error,
        source: 'fallback',
        requestId,
      });
    }

    return NextResponse.json({
      generatedText: result.generatedText,
      source: 'meltemi',
      requestId,
    });
  } catch (error) {
    return handleApiError('ai/email-expand', error, requestId, {
      message: 'Failed to expand email',
    });
  }
}
