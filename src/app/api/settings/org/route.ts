import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { organizations } from '@/lib/db/schema';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

const OrgUpdateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  vatId: z.string().trim().max(64).nullable().optional(),
  address: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  phone: z.string().trim().max(64).nullable().optional(),
  website: z.string().trim().max(255).nullable().optional(),
});

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const orgId = getOrgIdFromSession(session);

  try {
    const org = await db.query.organizations.findFirst({
      where: (o, { eq }) => eq(o.id, orgId),
      columns: { id: true, name: true, settings: true },
    });

    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    return NextResponse.json(org);
  } catch (error) {
    console.error('[settings/org] GET error:', error);
    return NextResponse.json({ error: 'Failed to load organization' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const orgId = getOrgIdFromSession(session);

  try {
    const body = OrgUpdateSchema.parse(await request.json());

    const current = await db.query.organizations.findFirst({
      where: (o, { eq }) => eq(o.id, orgId),
      columns: { settings: true },
    });
    if (!current) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const baseSettings = current.settings || {
      currency: 'EUR',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      timezone: 'Europe/Athens',
      language: 'el',
    };

    const nextSettings = {
      ...baseSettings,
      companyProfile: {
        ...(baseSettings.companyProfile || {}),
        vatId: body.vatId ?? baseSettings.companyProfile?.vatId,
        address: body.address ?? baseSettings.companyProfile?.address,
        city: body.city ?? baseSettings.companyProfile?.city,
        phone: body.phone ?? baseSettings.companyProfile?.phone,
        website: body.website ?? baseSettings.companyProfile?.website,
      },
    };

    await db
      .update(organizations)
      .set({ name: body.name, settings: nextSettings, updatedAt: new Date() })
      .where(eq(organizations.id, orgId));

    const org = await db.query.organizations.findFirst({
      where: (o, { eq }) => eq(o.id, orgId),
      columns: { id: true, name: true, settings: true },
    });

    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    return NextResponse.json(org);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    console.error('[settings/org] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
  }
}
