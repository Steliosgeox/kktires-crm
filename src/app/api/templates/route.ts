import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailTemplates } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const DEFAULT_ORG_ID = 'org_kktires';

export async function GET(request: NextRequest) {
  try {
    const templates = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.orgId, DEFAULT_ORG_ID))
      .orderBy(desc(emailTemplates.createdAt));

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const newTemplate = await db.insert(emailTemplates).values({
      id: `tmpl_${nanoid()}`,
      orgId: DEFAULT_ORG_ID,
      name: body.name,
      subject: body.subject || body.name,
      content: body.content || '',
      category: body.category || 'general',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(newTemplate[0], { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

