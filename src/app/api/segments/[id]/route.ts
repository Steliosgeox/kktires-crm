import { NextRequest, NextResponse } from 'next/server';
import { db, segments } from '@/lib/db';
import { eq } from 'drizzle-orm';

// GET /api/segments/:id - Get single segment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const segment = await db.query.segments.findFirst({
      where: eq(segments.id, id),
    });

    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    return NextResponse.json({ segment });
  } catch (error) {
    console.error('Failed to fetch segment:', error);
    return NextResponse.json({ error: 'Failed to fetch segment' }, { status: 500 });
  }
}

// PUT /api/segments/:id - Update segment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.query.segments.findFirst({
      where: eq(segments.id, id),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    const [updatedSegment] = await db
      .update(segments)
      .set({
        name: body.name || existing.name,
        description: body.description !== undefined ? body.description : existing.description,
        filters: body.filters !== undefined ? body.filters : existing.filters,
        updatedAt: new Date(),
      })
      .where(eq(segments.id, id))
      .returning();

    return NextResponse.json({ segment: updatedSegment });
  } catch (error) {
    console.error('Failed to update segment:', error);
    return NextResponse.json({ error: 'Failed to update segment' }, { status: 500 });
  }
}

// DELETE /api/segments/:id - Delete segment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.delete(segments).where(eq(segments.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete segment:', error);
    return NextResponse.json({ error: 'Failed to delete segment' }, { status: 500 });
  }
}

