import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailCampaigns } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { countRecipients, normalizeRecipientFilters } from '@/server/email/recipients';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

const campaignStatusSchema = z.enum(['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled', 'failed']);

const campaignUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().optional(),
  content: z.string().optional(),
  status: campaignStatusSchema.optional(),
  scheduledAt: z.string().optional().nullable(),
  recipientFilters: z.unknown().optional(),
  signatureId: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const { id } = await params;
    
    const campaign = await db.query.emailCampaigns.findFirst({
      where: (c, { eq, and }) => and(
        eq(c.id, id),
        eq(c.orgId, orgId)
      ),
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const { id } = await params;
    const parsed = campaignUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const body = parsed.data;

    // Parse scheduledAt - schema expects Date objects with { mode: 'timestamp' }
    let scheduledAtDate: Date | null = null;
    if (body.scheduledAt) {
      const parsed = new Date(body.scheduledAt);
      if (!isNaN(parsed.getTime())) {
        scheduledAtDate = parsed;
      }
    }

    const recipientFilters =
      body.recipientFilters !== undefined ? normalizeRecipientFilters(body.recipientFilters) : undefined;

    const totalRecipients =
      recipientFilters !== undefined ? await countRecipients(orgId, recipientFilters) : undefined;

    const setValues: Partial<typeof emailCampaigns.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) setValues.name = body.name;
    if (body.subject !== undefined) setValues.subject = body.subject;
    if (body.content !== undefined) setValues.content = body.content;
    if (body.status !== undefined) setValues.status = body.status;
    if (body.scheduledAt !== undefined) setValues.scheduledAt = scheduledAtDate;
    if (recipientFilters !== undefined) {
      setValues.recipientFilters = recipientFilters as any;
      setValues.totalRecipients = totalRecipients as any;
    }
    if (body.signatureId !== undefined) setValues.signatureId = body.signatureId || null;

    const updated = await db
      .update(emailCampaigns)
      .set(setValues as any)
      .where(and(
        eq(emailCampaigns.id, id),
        eq(emailCampaigns.orgId, orgId)
      ))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const { id } = await params;
    
    const deleted = await db
      .delete(emailCampaigns)
      .where(and(
        eq(emailCampaigns.id, id),
        eq(emailCampaigns.orgId, orgId)
      ))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}
