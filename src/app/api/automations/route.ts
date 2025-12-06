import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailAutomations } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const DEFAULT_ORG_ID = 'org_kktires';

export async function GET() {
  try {
    const automations = await db
      .select()
      .from(emailAutomations)
      .where(eq(emailAutomations.orgId, DEFAULT_ORG_ID))
      .orderBy(desc(emailAutomations.createdAt));

    return NextResponse.json({ automations });
  } catch (error) {
    console.error('Error fetching automations:', error);
    return NextResponse.json({ error: 'Failed to fetch automations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const newAutomation = await db.insert(emailAutomations).values({
      id: `auto_${nanoid()}`,
      orgId: DEFAULT_ORG_ID,
      name: body.name,
      description: body.description || null,
      trigger: body.trigger,
      triggerConfig: body.triggerConfig || {},
      isActive: body.isActive || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(newAutomation[0], { status: 201 });
  } catch (error) {
    console.error('Error creating automation:', error);
    return NextResponse.json({ error: 'Failed to create automation' }, { status: 500 });
  }
}

