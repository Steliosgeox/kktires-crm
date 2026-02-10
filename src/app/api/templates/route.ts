import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailTemplates } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const templates = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.orgId, orgId))
      .orderBy(desc(emailTemplates.createdAt));

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const body = await request.json();

    const newTemplate = await db.insert(emailTemplates).values({
      id: `tmpl_${nanoid()}`,
      orgId,
      name: body.name,
      subject: body.subject || body.name,
      content: body.content || '',
      category: body.category || 'general',
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(newTemplate[0], { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
