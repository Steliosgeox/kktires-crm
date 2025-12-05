import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leads } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const DEFAULT_ORG_ID = 'org_kktires';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const allLeads = await db
      .select()
      .from(leads)
      .where(eq(leads.orgId, DEFAULT_ORG_ID))
      .orderBy(desc(leads.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.orgId, DEFAULT_ORG_ID));
    
    const total = countResult[0]?.count || 0;

    // Group by status for Kanban view
    const byStatus = {
      new: allLeads.filter(l => l.status === 'new'),
      contacted: allLeads.filter(l => l.status === 'contacted'),
      qualified: allLeads.filter(l => l.status === 'qualified'),
      proposal: allLeads.filter(l => l.status === 'proposal'),
      won: allLeads.filter(l => l.status === 'won'),
      lost: allLeads.filter(l => l.status === 'lost'),
    };

    return NextResponse.json({
      leads: allLeads,
      byStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const newLead = await db.insert(leads).values({
      id: `lead_${nanoid()}`,
      orgId: DEFAULT_ORG_ID,
      firstName: body.firstName,
      lastName: body.lastName || null,
      company: body.company || null,
      email: body.email || null,
      phone: body.phone || null,
      source: body.source || 'manual',
      status: body.status || 'new',
      score: body.score || 0,
      notes: body.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(newLead[0], { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    );
  }
}

