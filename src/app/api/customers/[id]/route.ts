import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

// GET single customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const { id } = await params;
    
    const customer = await db.query.customers.findFirst({
      where: (c, { eq, and }) => and(
        eq(c.id, id),
        eq(c.orgId, orgId)
      ),
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

// UPDATE customer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const { id } = await params;
    const body = await request.json();
    
    const updated = await db
      .update(customers)
      .set({
        firstName: body.firstName,
        lastName: body.lastName,
        company: body.company,
        email: body.email,
        phone: body.phone,
        mobile: body.mobile,
        street: body.street,
        city: body.city,
        postalCode: body.postalCode,
        afm: body.afm,
        doy: body.doy,
        category: body.category,
        revenue: body.revenue,
        isVip: body.isVip,
        notes: body.notes,
        updatedAt: new Date(),
      })
      .where(and(
        eq(customers.id, id),
        eq(customers.orgId, orgId)
      ))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    );
  }
}

// DELETE customer
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
      .delete(customers)
      .where(and(
        eq(customers.id, id),
        eq(customers.orgId, orgId)
      ))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deleted: deleted[0] });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    );
  }
}
