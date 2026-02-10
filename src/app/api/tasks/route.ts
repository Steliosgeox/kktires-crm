import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks, customers } from '@/lib/db/schema';
import { eq, desc, sql, and, lt } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const whereParts: any[] = [eq(tasks.orgId, orgId)];
    if (status && status !== 'all') {
      whereParts.push(eq(tasks.status, status));
    }

    // Get all tasks with customer info
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

    // Count by status
    const todoCount = await db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(eq(tasks.orgId, orgId), eq(tasks.status, 'todo')));
    const inProgressCount = await db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(eq(tasks.orgId, orgId), eq(tasks.status, 'in_progress')));
    const doneCount = await db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(eq(tasks.orgId, orgId), eq(tasks.status, 'done')));
    
    // Overdue count
    const overdueCount = await db.select({ count: sql<number>`count(*)` }).from(tasks).where(
      and(
        eq(tasks.orgId, orgId),
        sql`${tasks.status} != 'done'`,
        lt(tasks.dueDate, new Date())
      )
    );

    return NextResponse.json({
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
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const body = await request.json();
    
    const newTask = await db.insert(tasks).values({
      id: nanoid(),
      orgId,
      title: body.title,
      description: body.description || null,
      customerId: body.customerId || null,
      status: body.status || 'todo',
      priority: body.priority || 'medium',
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(newTask[0], { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

