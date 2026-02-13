import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { db } from '@/lib/db';
import { leads } from '@/lib/db/schema';
import {
  createRequestId,
  handleApiError,
  parsePagination,
  withValidatedBody,
} from '@/server/api/http';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

const LeadStatusSchema = z.enum(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']);
const LeadSourceSchema = z.enum(['website', 'referral', 'import', 'manual']);

const LeadCreateSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().max(120).nullable().optional(),
  company: z.string().trim().max(160).nullable().optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  phone: z.string().trim().max(64).nullable().optional(),
  source: LeadSourceSchema.optional(),
  status: LeadStatusSchema.optional(),
  score: z.number().int().min(0).max(100).optional(),
  notes: z.string().max(10_000).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', requestId },
        { status: 401 }
      );
    }
    const orgId = getOrgIdFromSession(session);

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') || '').trim();
    const { page, limit, offset } = parsePagination(searchParams, {
      defaultPage: 1,
      defaultLimit: 50,
      maxLimit: 100,
    });

    const whereParts: SQL[] = [eq(leads.orgId, orgId)];
    if (status && status !== 'all' && LeadStatusSchema.safeParse(status).success) {
      whereParts.push(eq(leads.status, status));
    }

    const allLeads = await db
      .select()
      .from(leads)
      .where(and(...whereParts))
      .orderBy(desc(leads.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(...whereParts));

    const total = countResult[0]?.count || 0;

    const byStatus = {
      new: allLeads.filter((l) => l.status === 'new'),
      contacted: allLeads.filter((l) => l.status === 'contacted'),
      qualified: allLeads.filter((l) => l.status === 'qualified'),
      proposal: allLeads.filter((l) => l.status === 'proposal'),
      won: allLeads.filter((l) => l.status === 'won'),
      lost: allLeads.filter((l) => l.status === 'lost'),
    };

    return NextResponse.json({
      requestId,
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
    return handleApiError('leads:get', error, requestId, { message: 'Failed to fetch leads' });
  }
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', requestId },
        { status: 401 }
      );
    }
    const orgId = getOrgIdFromSession(session);

    const body = await withValidatedBody(request, LeadCreateSchema, { maxBytes: 120_000 });

    const newLead = await db
      .insert(leads)
      .values({
        id: `lead_${nanoid()}`,
        orgId,
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
      })
      .returning();

    return NextResponse.json({ ...newLead[0], requestId }, { status: 201 });
  } catch (error) {
    return handleApiError('leads:post', error, requestId, {
      message: 'Failed to create lead',
    });
  }
}
