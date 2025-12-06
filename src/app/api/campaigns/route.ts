import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailCampaigns, customers } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const DEFAULT_ORG_ID = 'org_kktires';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Run all queries in parallel for better performance
    const [allCampaigns, countResult, statsResult] = await Promise.all([
      // Get campaigns
      db.select({
        id: emailCampaigns.id,
        name: emailCampaigns.name,
        subject: emailCampaigns.subject,
        status: emailCampaigns.status,
        scheduledAt: emailCampaigns.scheduledAt,
        sentAt: emailCampaigns.sentAt,
        totalRecipients: emailCampaigns.totalRecipients,
        sentCount: emailCampaigns.sentCount,
        openCount: emailCampaigns.openCount,
        clickCount: emailCampaigns.clickCount,
        createdAt: emailCampaigns.createdAt,
      })
        .from(emailCampaigns)
        .where(eq(emailCampaigns.orgId, DEFAULT_ORG_ID))
        .orderBy(desc(emailCampaigns.createdAt))
        .limit(limit)
        .offset(offset),

      // Get total count
      db.select({ count: sql<number>`count(*)` })
        .from(emailCampaigns)
        .where(eq(emailCampaigns.orgId, DEFAULT_ORG_ID)),

      // Calculate stats
      db.select({
        totalSent: sql<number>`COALESCE(SUM(${emailCampaigns.sentCount}), 0)`,
        totalOpens: sql<number>`COALESCE(SUM(${emailCampaigns.openCount}), 0)`,
        totalClicks: sql<number>`COALESCE(SUM(${emailCampaigns.clickCount}), 0)`,
      })
        .from(emailCampaigns)
        .where(eq(emailCampaigns.orgId, DEFAULT_ORG_ID)),
    ]);

    const total = countResult[0]?.count || 0;
    const stats = statsResult[0] || { totalSent: 0, totalOpens: 0, totalClicks: 0 };

    return NextResponse.json({
      campaigns: allCampaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalSent: stats.totalSent,
        openRate: stats.totalSent > 0 ? ((stats.totalOpens / stats.totalSent) * 100).toFixed(1) : '0',
        clickRate: stats.totalOpens > 0 ? ((stats.totalClicks / stats.totalOpens) * 100).toFixed(1) : '0',
      },
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Count recipients (customers with email who haven't unsubscribed)
    const recipientCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(sql`${customers.orgId} = ${DEFAULT_ORG_ID} AND ${customers.email} IS NOT NULL AND (${customers.unsubscribed} = 0 OR ${customers.unsubscribed} IS NULL)`);

    // Parse scheduledAt - schema expects Date objects with { mode: 'timestamp' }
    let scheduledAtDate: Date | null = null;
    if (body.scheduledAt) {
      const parsed = new Date(body.scheduledAt);
      if (!isNaN(parsed.getTime())) {
        scheduledAtDate = parsed;
      }
    }

    const newCampaign = await db.insert(emailCampaigns).values({
      id: `camp_${nanoid()}`,
      orgId: DEFAULT_ORG_ID,
      name: body.name,
      subject: body.subject || body.name,
      content: body.content || '',
      status: body.status || 'draft',
      scheduledAt: scheduledAtDate,
      totalRecipients: recipientCount[0]?.count || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(newCampaign[0], { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}

