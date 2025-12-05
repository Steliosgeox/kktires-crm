import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import { customers, leads } from '@/lib/db/schema';
import { eq, sql, and, gte } from 'drizzle-orm';

const DEFAULT_ORG_ID = 'org_kktires';

// Cache statistics for 60 seconds
const getStatistics = unstable_cache(
  async () => {
    // Run queries in parallel for better performance
    const [
      customerCount,
      revenueResult,
      leadCount,
      leadsByStatus,
      customersByCategory,
      customersByCity,
      topCustomers,
      vipCount,
    ] = await Promise.all([
      // Get customer count
      db.select({ count: sql<number>`count(*)` })
        .from(customers)
        .where(eq(customers.orgId, DEFAULT_ORG_ID)),

      // Get total revenue
      db.select({ total: sql<number>`COALESCE(SUM(revenue), 0)` })
        .from(customers)
        .where(eq(customers.orgId, DEFAULT_ORG_ID)),

      // Get lead count
      db.select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(eq(leads.orgId, DEFAULT_ORG_ID)),

      // Get leads by status
      db.select({
        status: leads.status,
        count: sql<number>`count(*)`,
      })
        .from(leads)
        .where(eq(leads.orgId, DEFAULT_ORG_ID))
        .groupBy(leads.status),

      // Get customers by category
      db.select({
        category: customers.category,
        count: sql<number>`count(*)`,
      })
        .from(customers)
        .where(eq(customers.orgId, DEFAULT_ORG_ID))
        .groupBy(customers.category),

      // Get customers by city
      db.select({
        city: customers.city,
        count: sql<number>`count(*)`,
      })
        .from(customers)
        .where(and(
          eq(customers.orgId, DEFAULT_ORG_ID),
          sql`${customers.city} IS NOT NULL`
        ))
        .groupBy(customers.city)
        .limit(10),

      // Get top customers by revenue
      db.select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        company: customers.company,
        revenue: customers.revenue,
      })
        .from(customers)
        .where(eq(customers.orgId, DEFAULT_ORG_ID))
        .orderBy(sql`${customers.revenue} DESC`)
        .limit(10),

      // Get VIP customer count
      db.select({ count: sql<number>`count(*)` })
        .from(customers)
        .where(and(
          eq(customers.orgId, DEFAULT_ORG_ID),
          eq(customers.isVip, true)
        )),
    ]);

    // Get new customers this month (not cached as it changes daily)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const newThisMonth = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(and(
        eq(customers.orgId, DEFAULT_ORG_ID),
        gte(customers.createdAt, startOfMonth)
      ));

    return {
      overview: {
        totalCustomers: customerCount[0]?.count || 0,
        totalRevenue: revenueResult[0]?.total || 0,
        totalLeads: leadCount[0]?.count || 0,
        vipCustomers: vipCount[0]?.count || 0,
        newThisMonth: newThisMonth[0]?.count || 0,
      },
      leadsByStatus: leadsByStatus.reduce((acc, item) => {
        acc[item.status] = item.count;
        return acc;
      }, {} as Record<string, number>),
      customersByCategory: customersByCategory.reduce((acc, item) => {
        acc[item.category || 'other'] = item.count;
        return acc;
      }, {} as Record<string, number>),
      customersByCity: customersByCity.map(item => ({
        city: item.city || 'Άγνωστη',
        count: item.count,
      })),
      topCustomers,
    };
  },
  ['statistics-data'],
  { revalidate: 60, tags: ['statistics'] }
);

export async function GET() {
  try {
    const data = await getStatistics();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

