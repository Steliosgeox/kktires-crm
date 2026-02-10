import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { automationSteps, emailAutomations } from '@/lib/db/schema';
import { eq, desc, inArray, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getOrgIdFromSession, requireSession } from '@/server/authz';
import { z } from 'zod';

const createAutomationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  trigger: z.string().min(1),
  triggerConfig: z.unknown().optional(),
  actions: z.array(z.object({
    type: z.string().min(1),
    label: z.string().optional(),
    config: z.unknown().optional(),
  })).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const automations = await db
      .select()
      .from(emailAutomations)
      .where(eq(emailAutomations.orgId, orgId))
      .orderBy(desc(emailAutomations.createdAt));

    const ids = automations.map((a) => a.id);
    const steps = ids.length
      ? await db
          .select()
          .from(automationSteps)
          .where(inArray(automationSteps.automationId, ids))
          .orderBy(asc(automationSteps.sortOrder))
      : [];

    const stepsByAutomation = new Map<string, typeof steps>();
    for (const s of steps) {
      const list = stepsByAutomation.get(s.automationId) || [];
      list.push(s);
      stepsByAutomation.set(s.automationId, list);
    }

    return NextResponse.json({
      automations: automations.map((a) => ({
        ...a,
        steps: stepsByAutomation.get(a.id) || [],
      })),
    });
  } catch (error) {
    console.error('Error fetching automations:', error);
    return NextResponse.json({ error: 'Failed to fetch automations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const parsed = createAutomationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const id = `auto_${nanoid()}`;

    const triggerConfig =
      body.triggerConfig && typeof body.triggerConfig === 'object'
        ? (body.triggerConfig as Record<string, unknown>)
        : {};

    const newAutomation = await db.insert(emailAutomations).values({
      id,
      orgId,
      name: body.name,
      description: body.description || null,
      trigger: body.trigger,
      triggerConfig,
      isActive: body.isActive || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    const actions = body.actions || [];
    if (actions.length > 0) {
      await db.insert(automationSteps).values(
        actions.map((a, idx) => ({
          id: `step_${nanoid()}`,
          automationId: id,
          type: a.type,
          config: {
            ...(typeof a.config === 'object' && a.config ? (a.config as Record<string, unknown>) : {}),
            ...(a.label ? { label: a.label } : {}),
          },
          sortOrder: idx,
          createdAt: new Date(),
        }))
      );
    }

    return NextResponse.json(newAutomation[0], { status: 201 });
  } catch (error) {
    console.error('Error creating automation:', error);
    return NextResponse.json({ error: 'Failed to create automation' }, { status: 500 });
  }
}

