import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

const TaskPatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  // Accept either an ISO datetime or a YYYY-MM-DD date string.
  dueDate: z.string().trim().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const orgId = getOrgIdFromSession(session);

  try {
    const { id } = await params;
    const body = TaskPatchSchema.parse(await request.json());

    const nextStatus = body.status;
    const completedAt =
      nextStatus === 'done' ? new Date() : nextStatus ? null : undefined;

    const nextDueDate = (() => {
      if (body.dueDate === undefined) return undefined;
      if (body.dueDate === null) return null;
      const d = new Date(body.dueDate);
      return Number.isFinite(d.valueOf()) ? d : null;
    })();

    const [updated] = await db
      .update(tasks)
      .set({
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(nextDueDate !== undefined ? { dueDate: nextDueDate } : {}),
        ...(completedAt !== undefined ? { completedAt } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, id), eq(tasks.orgId, orgId)))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    console.error('[tasks/:id] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Treat PUT as PATCH for now (full replace not needed in this app).
  return PATCH(request, { params });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const orgId = getOrgIdFromSession(session);

  try {
    const { id } = await params;
    const [deleted] = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.orgId, orgId)))
      .returning({ id: tasks.id });

    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[tasks/:id] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
