import { NextRequest, NextResponse } from 'next/server';
import { db, tags, customerTags } from '@/lib/db';
import { eq, count } from 'drizzle-orm';

// GET /api/tags/:id - Get single tag with customer count
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const tag = await db.query.tags.findFirst({
      where: eq(tags.id, id),
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Get customer count
    const [customerCountResult] = await db
      .select({ count: count() })
      .from(customerTags)
      .where(eq(customerTags.tagId, id));

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
    const { id } = await params;
    const body = await request.json();

    const existing = await db.query.tags.findFirst({
      where: eq(tags.id, id),
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
      .where(eq(tags.id, id))
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
    const { id } = await params;

    // This will also delete related customerTags due to cascade
    await db.delete(tags).where(eq(tags.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete tag:', error);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}

