import { NextRequest, NextResponse } from 'next/server';
import { db, segments, customers } from '@/lib/db';
import { eq, count, and, like, or, gt, lt, gte, lte, ne } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

// GET /api/segments - Get all segments with customer counts
export async function GET() {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const allSegments = await db.query.segments.findMany({
      where: eq(segments.orgId, orgId),
      orderBy: (segments, { desc }) => [desc(segments.createdAt)],
    });

    // Calculate customer count for each segment
    const segmentsWithCounts = await Promise.all(
      allSegments.map(async (segment) => {
        let customerCount = 0;
        
        if (segment.filters && segment.filters.conditions && segment.filters.conditions.length > 0) {
          // Build filter query
          const conditions = segment.filters.conditions.map((cond) => {
            const field = cond.field as keyof typeof customers.$inferSelect;
            const column = (customers as any)[field];
            if (!column) return null;
            const value = cond.value as string | number | boolean;
            
            switch (cond.operator) {
              case 'equals':
                return eq(column, value as any);
              case 'contains':
                return like(column, `%${value}%`);
              case 'startsWith':
                return like(column, `${value}%`);
              case 'greaterThan':
                return gt(column, value as number);
              case 'lessThan':
                return lt(column, value as number);
              case 'greaterOrEqual':
                return gte(column, value as number);
              case 'lessOrEqual':
                return lte(column, value as number);
              case 'notEquals':
                return ne(column, value as any);
              default:
                return eq(column, value as any);
            }
          }).filter(Boolean) as any[];

          try {
            const [result] = await db
              .select({ count: count() })
              .from(customers)
              .where(
                segment.filters.logic === 'or'
                  ? and(eq(customers.orgId, orgId), or(...conditions))
                  : and(eq(customers.orgId, orgId), ...conditions)
              );
            customerCount = result?.count || 0;
          } catch (e) {
            // If filter fails, just return 0
            customerCount = 0;
          }
        }

        return {
          ...segment,
          customerCount,
        };
      })
    );

    return NextResponse.json({ segments: segmentsWithCounts });
  } catch (error) {
    console.error('Failed to fetch segments:', error);
    return NextResponse.json({ error: 'Failed to fetch segments' }, { status: 500 });
  }
}

// POST /api/segments - Create new segment
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const body = await request.json();
    const now = new Date();

    const [newSegment] = await db.insert(segments).values({
      id: nanoid(),
      orgId,
      name: body.name,
      description: body.description || null,
      filters: body.filters || null,
      customerCount: 0,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return NextResponse.json({ segment: newSegment });
  } catch (error) {
    console.error('Failed to create segment:', error);
    return NextResponse.json({ error: 'Failed to create segment' }, { status: 500 });
  }
}
