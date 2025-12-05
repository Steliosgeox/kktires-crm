import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailTemplates } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const DEFAULT_ORG_ID = 'org_kktires';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const template = await db.query.emailTemplates.findFirst({
      where: (t, { eq, and }) => and(
        eq(t.id, id),
        eq(t.orgId, DEFAULT_ORG_ID)
      ),
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updated = await db
      .update(emailTemplates)
      .set({
        name: body.name,
        subject: body.subject,
        content: body.content,
        category: body.category,
        updatedAt: new Date(),
      })
      .where(and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.orgId, DEFAULT_ORG_ID)
      ))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const deleted = await db
      .delete(emailTemplates)
      .where(and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.orgId, DEFAULT_ORG_ID)
      ))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
