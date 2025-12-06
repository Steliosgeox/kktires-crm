import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customers, customerTags, segments } from '@/lib/db/schema';
import { eq, and, sql, inArray, or } from 'drizzle-orm';

const DEFAULT_ORG_ID = 'org_kktires';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const citiesParam = searchParams.get('cities');
    const tagsParam = searchParams.get('tags');
    const segmentsParam = searchParams.get('segments');

    const cities = citiesParam ? citiesParam.split(',').filter(Boolean) : [];
    const tagIds = tagsParam ? tagsParam.split(',').filter(Boolean) : [];
    const segmentIds = segmentsParam ? segmentsParam.split(',').filter(Boolean) : [];

    // Build conditions
    const conditions: any[] = [
      eq(customers.orgId, DEFAULT_ORG_ID),
      sql`${customers.email} IS NOT NULL`,
      sql`(${customers.unsubscribed} = 0 OR ${customers.unsubscribed} IS NULL)`,
    ];

    // City filter
    if (cities.length > 0) {
      conditions.push(inArray(customers.city, cities));
    }

    // If we have tag filters, we need to join with customerTags
    let query;
    if (tagIds.length > 0) {
      // Get customer IDs that have any of the selected tags
      const customersWithTags = await db
        .selectDistinct({ customerId: customerTags.customerId })
        .from(customerTags)
        .where(inArray(customerTags.tagId, tagIds));

      const customerIdsWithTags = customersWithTags.map((c) => c.customerId);

      if (customerIdsWithTags.length > 0) {
        conditions.push(inArray(customers.id, customerIdsWithTags));
      } else {
        // No customers have these tags
        return NextResponse.json({ count: 0 });
      }
    }

    // Count customers matching all conditions
    const [result] = await db
      .select({ count: sql<number>`count(DISTINCT ${customers.id})` })
      .from(customers)
      .where(and(...conditions));

    return NextResponse.json({ count: result?.count || 0 });
  } catch (error) {
    console.error('Error counting recipients:', error);
    return NextResponse.json({ error: 'Failed to count recipients' }, { status: 500 });
  }
}

