import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/lib/db';
import { customers, leads } from '@/lib/db/schema';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const orgId = getOrgIdFromSession(session);

  try {
    const { id } = await params;
    const lead = await db.query.leads.findFirst({
      where: (l, { and, eq }) => and(eq(l.id, id), eq(l.orgId, orgId)),
    });

    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (lead.convertedToCustomerId) {
      return NextResponse.json({
        ok: true,
        customerId: lead.convertedToCustomerId,
        alreadyConverted: true,
      });
    }

    const customerId = `cust_${nanoid()}`;
    await db.insert(customers).values({
      id: customerId,
      orgId,
      firstName: lead.firstName,
      lastName: lead.lastName,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      lifecycleStage: 'customer',
      leadSource: lead.source,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.user.id,
    });

    await db
      .update(leads)
      .set({
        status: 'won',
        convertedToCustomerId: customerId,
        convertedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(leads.id, id), eq(leads.orgId, orgId)));

    return NextResponse.json({ ok: true, customerId });
  } catch (error) {
    console.error('[leads/:id/convert] error:', error);
    return NextResponse.json({ error: 'Failed to convert lead' }, { status: 500 });
  }
}
