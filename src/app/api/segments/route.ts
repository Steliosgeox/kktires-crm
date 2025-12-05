import { NextRequest, NextResponse } from 'next/server';
import { db, segments, customers } from '@/lib/db';
import { eq, count, and, like, or, gt, lt, gte, lte, ne } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const DEFAULT_ORG_ID = 'org_kktires';

// GET /api/segments - Get all segments with customer counts
export async function GET() {
  try {
    const allSegments = await db.query.segments.findMany({
      where: eq(segments.orgId, DEFAULT_ORG_ID),
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
            const value = cond.value as string | number | boolean;
            
            switch (cond.operator) {
              case 'equals':
                return eq(customers[field], value as string);
              case 'contains':
                return like(customers[field], `%${value}%`);
              case 'startsWith':
                return like(customers[field], `${value}%`);
              case 'greaterThan':
                return gt(customers[field], value as number);
              case 'lessThan':
                return lt(customers[field], value as number);
              case 'greaterOrEqual':
                return gte(customers[field], value as number);
              case 'lessOrEqual':
                return lte(customers[field], value as number);
              case 'notEquals':
                return ne(customers[field], value as string);
              default:
                return eq(customers[field], value as string);
            }
          });

          try {
            const [result] = await db
              .select({ count: count() })
              .from(customers)
              .where(
                segment.filters.logic === 'or' 
                  ? or(...conditions) 
                  : and(eq(customers.orgId, DEFAULT_ORG_ID), ...conditions)
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
    const body = await request.json();
    const now = new Date();

    const [newSegment] = await db.insert(segments).values({
      id: nanoid(),
      orgId: DEFAULT_ORG_ID,
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

