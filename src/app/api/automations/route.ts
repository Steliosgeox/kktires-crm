import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { automationSteps, emailAutomations } from '@/lib/db/schema';
import { eq, desc, inArray, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getOrgIdFromSession, requireSession } from '@/server/authz';
import { z } from 'zod';
import { createRequestId, jsonError } from '@/server/api/http';

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
  const requestId = createRequestId();
  try {
    const session = await requireSession();
    if (!session) return jsonError('Unauthorized', 401, 'UNAUTHORIZED', requestId);
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
      requestId,
      automations: automations.map((a) => ({
        ...a,
        steps: stepsByAutomation.get(a.id) || [],
      })),
    });
  } catch (error) {
    console.error(`[automations:get] requestId=${requestId}`, error);
    return jsonError('Failed to fetch automations', 500, 'INTERNAL_ERROR', requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await requireSession();
    if (!session) return jsonError('Unauthorized', 401, 'UNAUTHORIZED', requestId);
    const orgId = getOrgIdFromSession(session);

    const parsed = createAutomationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError('Invalid payload', 400, 'BAD_REQUEST', requestId);
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

    return NextResponse.json({ ...newAutomation[0], requestId }, { status: 201 });
  } catch (error) {
    console.error(`[automations:post] requestId=${requestId}`, error);
    return jsonError('Failed to create automation', 500, 'INTERNAL_ERROR', requestId);
  }
}

