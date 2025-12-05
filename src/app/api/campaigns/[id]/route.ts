import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailCampaigns } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const DEFAULT_ORG_ID = 'org_kktires';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const campaign = await db.query.emailCampaigns.findFirst({
      where: (c, { eq, and }) => and(
        eq(c.id, id),
        eq(c.orgId, DEFAULT_ORG_ID)
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
    const { id } = await params;
    const body = await request.json();

    // Parse scheduledAt - schema expects Date objects with { mode: 'timestamp' }
    let scheduledAtDate: Date | null = null;
    if (body.scheduledAt) {
      const parsed = new Date(body.scheduledAt);
      if (!isNaN(parsed.getTime())) {
        scheduledAtDate = parsed;
      }
    }

    const updated = await db
      .update(emailCampaigns)
      .set({
        name: body.name,
        subject: body.subject,
        content: body.content,
        status: body.status,
        scheduledAt: scheduledAtDate,
        updatedAt: new Date(),
      })
      .where(and(
        eq(emailCampaigns.id, id),
        eq(emailCampaigns.orgId, DEFAULT_ORG_ID)
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
    const { id } = await params;
    
    const deleted = await db
      .delete(emailCampaigns)
      .where(and(
        eq(emailCampaigns.id, id),
        eq(emailCampaigns.orgId, DEFAULT_ORG_ID)
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
