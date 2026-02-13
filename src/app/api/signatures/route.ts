import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { db } from '@/lib/db';
import { emailSignatures } from '@/lib/db/schema';
import { createRequestId, handleApiError, withValidatedBody } from '@/server/api/http';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

const SignatureCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  content: z.string().min(1).max(100_000),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  const requestId = createRequestId();
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', requestId },
        { status: 401 }
      );
    }
    const orgId = getOrgIdFromSession(session);

    const signatures = await db
      .select()
      .from(emailSignatures)
      .where(eq(emailSignatures.orgId, orgId))
      .orderBy(desc(emailSignatures.isDefault), desc(emailSignatures.createdAt));

    return NextResponse.json({ signatures, requestId });
  } catch (error) {
    return handleApiError('signatures:get', error, requestId, {
      message: 'Failed to fetch signatures',
    });
  }
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', requestId },
        { status: 401 }
      );
    }
    const orgId = getOrgIdFromSession(session);
    const body = await withValidatedBody(request, SignatureCreateSchema, { maxBytes: 150_000 });

    if (body.isDefault) {
      await db
        .update(emailSignatures)
        .set({ isDefault: false })
        .where(eq(emailSignatures.orgId, orgId));
    }

    const newSignature = await db
      .insert(emailSignatures)
      .values({
        id: `sig_${nanoid()}`,
        orgId,
        name: body.name,
        content: body.content,
        isDefault: body.isDefault || false,
        createdBy: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ ...newSignature[0], requestId }, { status: 201 });
  } catch (error) {
    return handleApiError('signatures:post', error, requestId, {
      message: 'Failed to create signature',
    });
  }
}
