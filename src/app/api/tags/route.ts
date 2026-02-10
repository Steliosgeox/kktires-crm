import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tags } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

export async function GET() {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const allTags = await db
      .select()
      .from(tags)
      .where(eq(tags.orgId, orgId));

    return NextResponse.json({ tags: allTags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const body = await request.json();
    
    const newTag = await db.insert(tags).values({
      id: `tag_${nanoid()}`,
      orgId,
      name: body.name,
      color: body.color || '#3B82F6',
      description: body.description || null,
      createdAt: new Date(),
    }).returning();

    return NextResponse.json(newTag[0], { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}

