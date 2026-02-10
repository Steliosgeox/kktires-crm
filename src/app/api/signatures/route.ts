import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailSignatures } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

export async function GET() {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const signatures = await db
      .select()
      .from(emailSignatures)
      .where(eq(emailSignatures.orgId, orgId))
      .orderBy(desc(emailSignatures.isDefault), desc(emailSignatures.createdAt));

    return NextResponse.json({ signatures });
  } catch (error) {
    console.error('Error fetching signatures:', error);
    return NextResponse.json({ error: 'Failed to fetch signatures' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const body = await request.json();

    // If this is set as default, unset other defaults first
    if (body.isDefault) {
      await db
        .update(emailSignatures)
        .set({ isDefault: false })
        .where(eq(emailSignatures.orgId, orgId));
    }

    const newSignature = await db.insert(emailSignatures).values({
      id: `sig_${nanoid()}`,
      orgId,
      name: body.name,
      content: body.content,
      isDefault: body.isDefault || false,
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(newSignature[0], { status: 201 });
  } catch (error) {
    console.error('Error creating signature:', error);
    return NextResponse.json({ error: 'Failed to create signature' }, { status: 500 });
  }
}

