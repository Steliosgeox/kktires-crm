import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/lib/db';
import { emailTemplates } from '@/lib/db/schema';
import { createRequestId, handleApiError, withValidatedBody } from '@/server/api/http';
import { templateCreateRequestSchema } from '@/server/api/drizzle-schemas';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

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

    const templates = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.orgId, orgId))
      .orderBy(desc(emailTemplates.createdAt));

    return NextResponse.json({ templates, requestId });
  } catch (error) {
    return handleApiError('templates:get', error, requestId, {
      message: 'Failed to fetch templates',
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
    const body = await withValidatedBody(request, templateCreateRequestSchema, {
      maxBytes: 1_000_000,
    });

    const newTemplate = await db
      .insert(emailTemplates)
      .values({
        id: `tmpl_${nanoid()}`,
        orgId,
        name: body.name,
        subject: body.subject || body.name,
        content: body.content || '',
        category: body.category || 'general',
        createdBy: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ ...newTemplate[0], requestId }, { status: 201 });
  } catch (error) {
    return handleApiError('templates:post', error, requestId, {
      message: 'Failed to create template',
    });
  }
}
