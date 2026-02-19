import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/lib/db';
import { customerTags, tags } from '@/lib/db/schema';
import { createRequestId, handleApiError, withValidatedBody } from '@/server/api/http';
import { tagCreateRequestSchema } from '@/server/api/drizzle-schemas';
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

    const allTags = await db
      .select({
        id: tags.id,
        orgId: tags.orgId,
        name: tags.name,
        color: tags.color,
        description: tags.description,
        createdAt: tags.createdAt,
        customerCount: sql<number>`count(DISTINCT ${customerTags.customerId})`,
      })
      .from(tags)
      .leftJoin(customerTags, eq(customerTags.tagId, tags.id))
      .where(eq(tags.orgId, orgId))
      .groupBy(tags.id, tags.orgId, tags.name, tags.color, tags.description, tags.createdAt);
    return NextResponse.json({ tags: allTags, requestId });
  } catch (error) {
    return handleApiError('tags:get', error, requestId, { message: 'Failed to fetch tags' });
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
    const body = await withValidatedBody(request, tagCreateRequestSchema, { maxBytes: 50_000 });

    const newTag = await db
      .insert(tags)
      .values({
        id: `tag_${nanoid()}`,
        orgId,
        name: body.name,
        color: body.color || '#3B82F6',
        description: body.description || null,
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json({ ...newTag[0], requestId }, { status: 201 });
  } catch (error) {
    return handleApiError('tags:post', error, requestId, { message: 'Failed to create tag' });
  }
}
