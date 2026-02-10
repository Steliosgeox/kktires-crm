import { NextRequest, NextResponse } from 'next/server';
import { db, tags, customerTags, customers } from '@/lib/db';
import { and, eq, count, sql } from 'drizzle-orm';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

// GET /api/tags/:id - Get single tag with customer count
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const { id } = await params;
    
    const tag = await db.query.tags.findFirst({
      where: and(eq(tags.id, id), eq(tags.orgId, orgId)),
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Get customer count
    const [customerCountResult] = await db
      .select({ count: sql<number>`count(DISTINCT ${customers.id})` })
      .from(customerTags)
      .innerJoin(customers, eq(customerTags.customerId, customers.id))
      .where(and(eq(customerTags.tagId, id), eq(customers.orgId, orgId)));

    return NextResponse.json({
      tag: {
        ...tag,
        customerCount: customerCountResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Failed to fetch tag:', error);
    return NextResponse.json({ error: 'Failed to fetch tag' }, { status: 500 });
  }
}

// PUT /api/tags/:id - Update tag
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const { id } = await params;
    const body = await request.json();

    const existing = await db.query.tags.findFirst({
      where: and(eq(tags.id, id), eq(tags.orgId, orgId)),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    const [updatedTag] = await db
      .update(tags)
      .set({
        name: body.name || existing.name,
        color: body.color || existing.color,
        description: body.description !== undefined ? body.description : existing.description,
      })
      .where(and(eq(tags.id, id), eq(tags.orgId, orgId)))
      .returning();

    return NextResponse.json({ tag: updatedTag });
  } catch (error) {
    console.error('Failed to update tag:', error);
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}

// DELETE /api/tags/:id - Delete tag
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const { id } = await params;

    // This will also delete related customerTags due to cascade
    await db.delete(tags).where(and(eq(tags.id, id), eq(tags.orgId, orgId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete tag:', error);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}

