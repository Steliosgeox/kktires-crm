import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customers, customerTags, tags } from '@/lib/db/schema';
import { eq, desc, like, or, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Default org ID for now (will be replaced with auth)
const DEFAULT_ORG_ID = 'org_kktires';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');
    const city = searchParams.get('city');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build query conditions
    let query = db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        company: customers.company,
        email: customers.email,
        phone: customers.phone,
        mobile: customers.mobile,
        city: customers.city,
        category: customers.category,
        revenue: customers.revenue,
        isVip: customers.isVip,
        afm: customers.afm,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      })
      .from(customers)
      .where(eq(customers.orgId, DEFAULT_ORG_ID))
      .orderBy(desc(customers.createdAt))
      .limit(limit)
      .offset(offset);

    const allCustomers = await query;

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(eq(customers.orgId, DEFAULT_ORG_ID));
    
    const total = countResult[0]?.count || 0;

    // Get tags for each customer
    const customerIds = allCustomers.map(c => c.id);
    const customerTagsData = customerIds.length > 0 
      ? await db
          .select({
            customerId: customerTags.customerId,
            tagId: tags.id,
            tagName: tags.name,
            tagColor: tags.color,
          })
          .from(customerTags)
          .innerJoin(tags, eq(customerTags.tagId, tags.id))
          .where(sql`${customerTags.customerId} IN ${customerIds}`)
      : [];

    // Map tags to customers
    const customersWithTags = allCustomers.map(customer => ({
      ...customer,
      tags: customerTagsData
        .filter(ct => ct.customerId === customer.id)
        .map(ct => ({ id: ct.tagId, name: ct.tagName, color: ct.tagColor })),
    }));

    return NextResponse.json({
      customers: customersWithTags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const newCustomer = await db.insert(customers).values({
      id: `cust_${nanoid()}`,
      orgId: DEFAULT_ORG_ID,
      firstName: body.firstName,
      lastName: body.lastName || null,
      company: body.company || null,
      email: body.email || null,
      phone: body.phone || null,
      mobile: body.mobile || null,
      street: body.street || null,
      city: body.city || null,
      postalCode: body.postalCode || null,
      country: body.country || 'Ελλάδα',
      afm: body.afm || null,
      doy: body.doy || null,
      category: body.category || 'retail',
      revenue: body.revenue || 0,
      isVip: body.isVip || false,
      notes: body.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(newCustomer[0], { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}

