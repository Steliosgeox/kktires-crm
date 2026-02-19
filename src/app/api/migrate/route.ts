import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customers, tags, customerTags, organizations } from '@/lib/db/schema';
import { getOrgIdFromSession, hasRole, requireSession } from '@/server/authz';
import { nanoid } from 'nanoid';
import { and, eq, inArray } from 'drizzle-orm';
import { createRequestId, jsonError, withValidatedBody } from '@/server/api/http';
import { z } from 'zod';
import {
  DEFAULT_CUSTOMER_CATEGORY,
  normalizeCustomerCategory,
} from '@/lib/customers/category';

interface WPFCustomer {
  // Common fields from WPF database
  Id?: number | string;
  id?: number | string;
  FirstName?: string;
  firstName?: string;
  first_name?: string;
  LastName?: string;
  lastName?: string;
  last_name?: string;
  Company?: string;
  company?: string;
  Email?: string;
  email?: string;
  Phone?: string;
  phone?: string;
  Mobile?: string;
  mobile?: string;
  Address?: string;
  address?: string;
  City?: string;
  city?: string;
  PostalCode?: string;
  postalCode?: string;
  postal_code?: string;
  AFM?: string;
  afm?: string;
  Afm?: string;
  DOY?: string;
  doy?: string;
  Doy?: string;
  Category?: string;
  category?: string;
  Revenue?: number;
  revenue?: number;
  IsVip?: boolean;
  isVip?: boolean;
  is_vip?: boolean;
  Notes?: string;
  notes?: string;
  Tags?: string;
  tags?: string;
  CreatedAt?: string | number;
  createdAt?: string | number;
  created_at?: string | number;
}

const MigrateRequestSchema = z.object({
  customers: z.array(z.record(z.string(), z.unknown())).max(20_000),
  clearExisting: z.boolean().optional(),
});

function normalizeCustomer(raw: WPFCustomer): {
  firstName: string;
  lastName: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  afm: string | null;
  doy: string | null;
  category: string;
  revenue: number;
  isVip: boolean;
  notes: string | null;
  tags: string[];
} {
  const firstName = raw.FirstName || raw.firstName || raw.first_name || 'Unknown';
  const lastName = raw.LastName || raw.lastName || raw.last_name || null;
  const company = raw.Company || raw.company || null;
  const email = raw.Email || raw.email || null;
  const phone = raw.Phone || raw.phone || null;
  const mobile = raw.Mobile || raw.mobile || null;
  const address = raw.Address || raw.address || null;
  const city = raw.City || raw.city || null;
  const postalCode = raw.PostalCode || raw.postalCode || raw.postal_code || null;
  const afm = raw.AFM || raw.afm || raw.Afm || null;
  const doy = raw.DOY || raw.doy || raw.Doy || null;
  const rawCategory = raw.Category || raw.category || '';
  const category = normalizeCustomerCategory(String(rawCategory)) ?? DEFAULT_CUSTOMER_CATEGORY;
  const revenue = raw.Revenue || raw.revenue || 0;
  const isVip = raw.IsVip || raw.isVip || raw.is_vip || false;
  const notes = raw.Notes || raw.notes || null;
  
  // Parse tags from comma-separated string
  const tagsRaw = raw.Tags || raw.tags || '';
  const tagsList = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  return {
    firstName,
    lastName,
    company,
    email,
    phone,
    mobile,
    address,
    city,
    postalCode,
    afm,
    doy,
    category,
    revenue,
    isVip,
    notes,
    tags: tagsList,
  };
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  if (process.env.ENABLE_MIGRATE_ENDPOINT !== 'true') {
    return jsonError('Not found', 404, 'NOT_FOUND', requestId);
  }

  try {
    const session = await requireSession();
    if (!session) {
      return jsonError('Unauthorized', 401, 'UNAUTHORIZED', requestId);
    }
    if (!hasRole(session, ['owner', 'admin'])) {
      return jsonError('Forbidden', 403, 'FORBIDDEN', requestId);
    }

    const orgId = getOrgIdFromSession(session);

    const body = await withValidatedBody(request, MigrateRequestSchema, {
      maxBytes: 20_000_000,
    });
    const customersData = body.customers as WPFCustomer[];
    const clearExisting = body.clearExisting ?? false;

    console.log(`Starting migration of ${customersData.length} customers...`);

    // Ensure organization exists
    const existingOrg = await db.query.organizations.findFirst({
      where: (orgs, { eq }) => eq(orgs.id, orgId),
    });

    if (!existingOrg) {
      await db.insert(organizations).values({
        id: orgId,
        name: 'KK Tires',
        slug: 'kktires',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: {
          currency: 'EUR',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: 'HH:mm',
          timezone: 'Europe/Athens',
          language: 'el',
        },
      });
    }

    // Clear existing data if requested
    if (clearExisting) {
      console.log('Clearing existing customer data...');
      const existingCustomerIds = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.orgId, orgId));

      const ids = existingCustomerIds.map((c) => c.id);
      if (ids.length > 0) {
        await db.delete(customerTags).where(inArray(customerTags.customerId, ids));
      }

      await db.delete(customers).where(eq(customers.orgId, orgId));
    }

    // Collect all unique tags
    const allTags = new Set<string>();
    const normalizedCustomers = customersData.map(normalizeCustomer);
    normalizedCustomers.forEach(c => c.tags.forEach(t => allTags.add(t)));

    // Create tags if they don't exist
    const tagMap = new Map<string, string>();
    const existingTags = await db.select().from(tags).where(eq(tags.orgId, orgId));
    existingTags.forEach(t => tagMap.set(t.name.toLowerCase(), t.id));

    const newTags: { id: string; orgId: string; name: string; color: string; createdAt: Date }[] = [];
    const tagColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];
    let colorIndex = 0;

    for (const tagName of allTags) {
      if (!tagMap.has(tagName.toLowerCase())) {
        const tagId = `tag_${nanoid()}`;
        tagMap.set(tagName.toLowerCase(), tagId);
        newTags.push({
          id: tagId,
          orgId,
          name: tagName,
          color: tagColors[colorIndex % tagColors.length],
          createdAt: new Date(),
        });
        colorIndex++;
      }
    }

    if (newTags.length > 0) {
      await db.insert(tags).values(newTags);
      console.log(`Created ${newTags.length} new tags`);
    }

    // Insert customers in batches
    const BATCH_SIZE = 50;
    let insertedCount = 0;
    const customerTagLinks: { id: string; customerId: string; tagId: string; createdAt: Date }[] = [];

    for (let i = 0; i < normalizedCustomers.length; i += BATCH_SIZE) {
      const batch = normalizedCustomers.slice(i, i + BATCH_SIZE);
      const customerRecords = batch.map(c => {
        const customerId = `cust_${nanoid()}`;
        
        // Prepare tag links
        c.tags.forEach(tagName => {
          const tagId = tagMap.get(tagName.toLowerCase());
          if (tagId) {
            customerTagLinks.push({
              id: `ct_${nanoid()}`,
              customerId,
              tagId,
              createdAt: new Date(),
            });
          }
        });

        return {
          id: customerId,
          orgId,
          firstName: c.firstName,
          lastName: c.lastName,
          company: c.company,
          email: c.email,
          phone: c.phone,
          mobile: c.mobile,
          street: c.address,
          city: c.city,
          postalCode: c.postalCode,
          afm: c.afm,
          doy: c.doy,
          category: c.category,
          revenue: c.revenue,
          isVip: c.isVip,
          notes: c.notes,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: session.user.id,
        };
      });

      await db.insert(customers).values(customerRecords);
      insertedCount += batch.length;
      console.log(`Inserted ${insertedCount}/${normalizedCustomers.length} customers`);
    }

    // Insert customer-tag links in batches
    if (customerTagLinks.length > 0) {
      for (let i = 0; i < customerTagLinks.length; i += BATCH_SIZE) {
        const batch = customerTagLinks.slice(i, i + BATCH_SIZE);
        await db.insert(customerTags).values(batch);
      }
      console.log(`Created ${customerTagLinks.length} customer-tag associations`);
    }

    return NextResponse.json({
      success: true,
      requestId,
      message: `Successfully migrated ${insertedCount} customers`,
      stats: {
        customersImported: insertedCount,
        tagsCreated: newTags.length,
        tagAssociations: customerTagLinks.length,
      },
    });
  } catch (error) {
    console.error(`[migrate] requestId=${requestId}`, error);
    return jsonError('Migration failed', 500, 'INTERNAL_ERROR', requestId);
  }
}

// GET endpoint to check migration status
export async function GET() {
  const requestId = createRequestId();
  if (process.env.ENABLE_MIGRATE_ENDPOINT !== 'true') {
    return jsonError('Not found', 404, 'NOT_FOUND', requestId);
  }

  try {
    const session = await requireSession();
    if (!session) {
      return jsonError('Unauthorized', 401, 'UNAUTHORIZED', requestId);
    }
    if (!hasRole(session, ['owner', 'admin'])) {
      return jsonError('Forbidden', 403, 'FORBIDDEN', requestId);
    }

    const orgId = getOrgIdFromSession(session);

    const customerCount = await db.select().from(customers).where(eq(customers.orgId, orgId));
    const tagCount = await db.select().from(tags).where(eq(tags.orgId, orgId));
    
    return NextResponse.json({
      status: 'ready',
      requestId,
      currentData: {
        customers: customerCount.length,
        tags: tagCount.length,
      },
      instructions: {
        endpoint: 'POST /api/migrate',
        format: '{ "customers": [...], "clearExisting": true }',
        customerFields: [
          'FirstName / firstName / first_name',
          'LastName / lastName / last_name',
          'Company / company',
          'Email / email',
          'Phone / phone',
          'Mobile / mobile',
          'Address / address',
          'City / city',
          'PostalCode / postalCode / postal_code',
          'AFM / afm',
          'DOY / doy',
          'Category / category',
          'Revenue / revenue',
          'IsVip / isVip / is_vip',
          'Notes / notes',
          'Tags / tags (comma-separated)',
        ],
      },
    });
  } catch (error) {
    console.error(`[migrate:get] requestId=${requestId}`, error);
    return jsonError('Migration status failed', 500, 'INTERNAL_ERROR', requestId);
  }
}
