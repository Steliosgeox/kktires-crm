import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/lib/db';
import { customers, leads } from '@/lib/db/schema';
import { createRequestId, handleApiError, jsonError } from '@/server/api/http';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();

  try {
    const session = await requireSession();
    if (!session) return jsonError('Unauthorized', 401, 'UNAUTHORIZED', requestId);
    const orgId = getOrgIdFromSession(session);
    const { id } = await params;
    const lead = await db.query.leads.findFirst({
      where: (l, { and, eq }) => and(eq(l.id, id), eq(l.orgId, orgId)),
    });

    if (!lead) return jsonError('Lead not found', 404, 'NOT_FOUND', requestId);
    if (lead.convertedToCustomerId) {
      return NextResponse.json({
        ok: true,
        customerId: lead.convertedToCustomerId,
        alreadyConverted: true,
        requestId,
      });
    }

    const normalizedLeadEmail = lead.email?.trim().toLowerCase() || null;
    let customerId = `cust_${nanoid()}`;

    if (normalizedLeadEmail) {
      const existingCustomer = await db.query.customers.findFirst({
        where: (c, { and: whereAnd, eq: whereEq }) =>
          whereAnd(whereEq(c.orgId, orgId), sql`lower(trim(${c.email})) = ${normalizedLeadEmail}`),
      });

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        await db.insert(customers).values({
          id: customerId,
          orgId,
          firstName: lead.firstName,
          lastName: lead.lastName,
          company: lead.company,
          email: normalizedLeadEmail,
          phone: lead.phone,
          lifecycleStage: 'customer',
          leadSource: lead.source,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: session.user.id,
        });
      }
    } else {
      await db.insert(customers).values({
        id: customerId,
        orgId,
        firstName: lead.firstName,
        lastName: lead.lastName,
        company: lead.company,
        email: null,
        phone: lead.phone,
        lifecycleStage: 'customer',
        leadSource: lead.source,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: session.user.id,
      });
    }

    await db
      .update(leads)
      .set({
        status: 'won',
        convertedToCustomerId: customerId,
        convertedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(leads.id, id), eq(leads.orgId, orgId)));

    return NextResponse.json({ ok: true, customerId, requestId });
  } catch (error) {
    return handleApiError('leads:id:convert', error, requestId, {
      message: 'Failed to convert lead',
    });
  }
}
