import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, lt, sql, type SQL } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { db } from '@/lib/db';
import { customers, tasks } from '@/lib/db/schema';
import {
  createRequestId,
  handleApiError,
  parsePagination,
  withValidatedBody,
} from '@/server/api/http';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

const TaskStatusSchema = z.enum(['todo', 'in_progress', 'done']);
const TaskPrioritySchema = z.enum(['low', 'medium', 'high']);

const TaskCreateSchema = z.object({
  title: z.string().trim().min(1).max(240),
  description: z.string().max(10_000).nullable().optional(),
  customerId: z.string().trim().max(64).nullable().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', requestId },
        { status: 401 }
      );
    }
    const orgId = getOrgIdFromSession(session);

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') || '').trim();
    const { page, limit, offset } = parsePagination(searchParams, {
      defaultPage: 1,
      defaultLimit: 50,
      maxLimit: 100,
    });

    const whereParts: SQL[] = [eq(tasks.orgId, orgId)];
    if (status && status !== 'all' && TaskStatusSchema.safeParse(status).success) {
      whereParts.push(eq(tasks.status, status));
    }

    const allTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        completedAt: tasks.completedAt,
        createdAt: tasks.createdAt,
        customerId: tasks.customerId,
        customerName: sql<string>`${customers.firstName} || ' ' || COALESCE(${customers.lastName}, '')`,
        customerCompany: customers.company,
      })
      .from(tasks)
      .leftJoin(customers, eq(tasks.customerId, customers.id))
      .where(and(...whereParts))
      .orderBy(desc(tasks.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(and(...whereParts));

    const total = countResult[0]?.count || 0;

    const [todoCount, inProgressCount, doneCount, overdueCount] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(and(eq(tasks.orgId, orgId), eq(tasks.status, 'todo'))),
      db
        .select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(and(eq(tasks.orgId, orgId), eq(tasks.status, 'in_progress'))),
      db
        .select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(and(eq(tasks.orgId, orgId), eq(tasks.status, 'done'))),
      db.select({ count: sql<number>`count(*)` }).from(tasks).where(
        and(eq(tasks.orgId, orgId), sql`${tasks.status} != 'done'`, lt(tasks.dueDate, new Date()))
      ),
    ]);

    return NextResponse.json({
      requestId,
      tasks: allTasks,
      counts: {
        todo: todoCount[0]?.count || 0,
        in_progress: inProgressCount[0]?.count || 0,
        done: doneCount[0]?.count || 0,
        overdue: overdueCount[0]?.count || 0,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError('tasks:get', error, requestId, { message: 'Failed to fetch tasks' });
  }
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', requestId },
        { status: 401 }
      );
    }
    const orgId = getOrgIdFromSession(session);

    const body = await withValidatedBody(request, TaskCreateSchema, { maxBytes: 100_000 });

    const dueDate = body.dueDate ? new Date(body.dueDate) : null;

    const newTask = await db
      .insert(tasks)
      .values({
        id: nanoid(),
        orgId,
        title: body.title,
        description: body.description || null,
        customerId: body.customerId || null,
        status: body.status || 'todo',
        priority: body.priority || 'medium',
        dueDate,
        createdBy: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ ...newTask[0], requestId }, { status: 201 });
  } catch (error) {
    return handleApiError('tasks:post', error, requestId, { message: 'Failed to create task' });
  }
}
