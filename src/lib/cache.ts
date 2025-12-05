import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import { customers, tags, emailCampaigns, emailTemplates, tasks, leads, segments } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

const DEFAULT_ORG_ID = 'org_kktires';

// Cache for 60 seconds, revalidate in background
const CACHE_REVALIDATE = 60;

// Cached customer count
export const getCachedCustomerCount = unstable_cache(
  async () => {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(eq(customers.orgId, DEFAULT_ORG_ID));
    return result[0]?.count || 0;
  },
  ['customer-count'],
  { revalidate: CACHE_REVALIDATE, tags: ['customers'] }
);

// Cached statistics
export const getCachedStatistics = unstable_cache(
  async () => {
    const [customerCount, tagCount, campaignCount, leadCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(customers).where(eq(customers.orgId, DEFAULT_ORG_ID)),
      db.select({ count: sql<number>`count(*)` }).from(tags).where(eq(tags.orgId, DEFAULT_ORG_ID)),
      db.select({ count: sql<number>`count(*)` }).from(emailCampaigns).where(eq(emailCampaigns.orgId, DEFAULT_ORG_ID)),
      db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.orgId, DEFAULT_ORG_ID)),
    ]);

    // Get revenue stats
    const revenueResult = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${customers.revenue}), 0)`,
        avgRevenue: sql<number>`COALESCE(AVG(${customers.revenue}), 0)`,
      })
      .from(customers)
      .where(eq(customers.orgId, DEFAULT_ORG_ID));

    // Get category distribution
    const categoryResult = await db
      .select({
        category: customers.category,
        count: sql<number>`count(*)`,
      })
      .from(customers)
      .where(eq(customers.orgId, DEFAULT_ORG_ID))
      .groupBy(customers.category);

    // Get VIP count
    const vipResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(sql`${customers.orgId} = ${DEFAULT_ORG_ID} AND ${customers.isVip} = 1`);

    return {
      customers: customerCount[0]?.count || 0,
      tags: tagCount[0]?.count || 0,
      campaigns: campaignCount[0]?.count || 0,
      leads: leadCount[0]?.count || 0,
      totalRevenue: revenueResult[0]?.totalRevenue || 0,
      avgRevenue: revenueResult[0]?.avgRevenue || 0,
      vipCustomers: vipResult[0]?.count || 0,
      categoryDistribution: categoryResult,
    };
  },
  ['statistics'],
  { revalidate: CACHE_REVALIDATE, tags: ['statistics', 'customers'] }
);

// Cached campaign stats
export const getCachedCampaignStats = unstable_cache(
  async () => {
    const statsResult = await db
      .select({
        totalSent: sql<number>`COALESCE(SUM(${emailCampaigns.sentCount}), 0)`,
        totalOpens: sql<number>`COALESCE(SUM(${emailCampaigns.openCount}), 0)`,
        totalClicks: sql<number>`COALESCE(SUM(${emailCampaigns.clickCount}), 0)`,
      })
      .from(emailCampaigns)
      .where(eq(emailCampaigns.orgId, DEFAULT_ORG_ID));

    const stats = statsResult[0] || { totalSent: 0, totalOpens: 0, totalClicks: 0 };

    return {
      totalSent: stats.totalSent,
      openRate: stats.totalSent > 0 ? ((stats.totalOpens / stats.totalSent) * 100).toFixed(1) : '0',
      clickRate: stats.totalOpens > 0 ? ((stats.totalClicks / stats.totalOpens) * 100).toFixed(1) : '0',
    };
  },
  ['campaign-stats'],
  { revalidate: CACHE_REVALIDATE, tags: ['campaigns'] }
);

// Cached tags list
export const getCachedTags = unstable_cache(
  async () => {
    return db
      .select()
      .from(tags)
      .where(eq(tags.orgId, DEFAULT_ORG_ID))
      .orderBy(tags.name);
  },
  ['tags-list'],
  { revalidate: CACHE_REVALIDATE, tags: ['tags'] }
);

// Cached customer locations for map
export const getCachedCustomerLocations = unstable_cache(
  async () => {
    const result = await db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        company: customers.company,
        city: customers.city,
        street: customers.street,
        latitude: customers.latitude,
        longitude: customers.longitude,
        category: customers.category,
        isVip: customers.isVip,
      })
      .from(customers)
      .where(eq(customers.orgId, DEFAULT_ORG_ID));
    
    return result;
  },
  ['customer-locations'],
  { revalidate: CACHE_REVALIDATE * 5, tags: ['customers', 'locations'] }
);

