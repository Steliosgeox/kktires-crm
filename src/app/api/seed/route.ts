import { NextResponse } from 'next/server';
import { requireSession, hasRole, getOrgIdFromSession } from '@/server/authz';
import { db } from '@/lib/db';
import { organizations, customers, tags, customerTags, leads } from '@/lib/db/schema';
import { nanoid } from 'nanoid';

// Sample Greek customer data
const sampleCustomers = [
  {
    firstName: 'Γιώργος',
    lastName: 'Παπαδόπουλος',
    company: 'ΑΒΓ Μεταφορές ΑΕ',
    email: 'g.papadopoulos@abg.gr',
    phone: '210 1234567',
    mobile: '697 1234567',
    city: 'Αθήνα',
    street: 'Πειραιώς 125',
    postalCode: '11854',
    afm: '123456789',
    doy: 'Αθηνών',
    category: 'vip',
    revenue: 45000,
    isVip: true,
  },
  {
    firstName: 'Μαρία',
    lastName: 'Κωνσταντίνου',
    company: 'Express Logistics ΕΠΕ',
    email: 'maria@express.gr',
    phone: '2310 654321',
    mobile: '694 5678901',
    city: 'Θεσσαλονίκη',
    street: 'Εγνατία 156',
    postalCode: '54636',
    afm: '234567890',
    doy: 'Θεσσαλονίκης',
    category: 'premium',
    revenue: 28500,
    isVip: false,
  },
  {
    firstName: 'Νίκος',
    lastName: 'Γεωργίου',
    company: null,
    email: 'nikos.g@gmail.com',
    phone: null,
    mobile: '697 1234567',
    city: 'Πάτρα',
    street: 'Κορίνθου 45',
    postalCode: '26221',
    afm: null,
    doy: null,
    category: 'retail',
    revenue: 850,
    isVip: false,
  },
  {
    firstName: 'Ελένη',
    lastName: 'Μαυροειδή',
    company: 'Mavroidi & Sons ΟΕ',
    email: 'eleni@mavroidi.gr',
    phone: '210 9876543',
    mobile: '693 4567890',
    city: 'Αθήνα',
    street: 'Συγγρού 200',
    postalCode: '17672',
    afm: '345678901',
    doy: 'Καλλιθέας',
    category: 'wholesale',
    revenue: 67000,
    isVip: true,
  },
  {
    firstName: 'Δημήτρης',
    lastName: 'Αντωνίου',
    company: 'City Taxi ΙΚΕ',
    email: 'info@citytaxi.gr',
    phone: '210 5555555',
    mobile: '698 7654321',
    city: 'Αθήνα',
    street: 'Αχαρνών 300',
    postalCode: '11145',
    afm: '456789012',
    doy: 'Αθηνών',
    category: 'fleet',
    revenue: 32000,
    isVip: false,
  },
  {
    firstName: 'Σοφία',
    lastName: 'Δημητρίου',
    company: 'Auto Service Plus',
    email: 'sofia@autoservice.gr',
    phone: '2310 111222',
    mobile: '699 1112223',
    city: 'Θεσσαλονίκη',
    street: 'Λαγκαδά 88',
    postalCode: '56429',
    afm: '567890123',
    doy: 'Θεσσαλονίκης',
    category: 'garage',
    revenue: 18500,
    isVip: false,
  },
  {
    firstName: 'Κώστας',
    lastName: 'Παππάς',
    company: 'Pappas Transport',
    email: 'k.pappas@transport.gr',
    phone: '2610 333444',
    mobile: '697 3334445',
    city: 'Πάτρα',
    street: 'Νόρμαν 15',
    postalCode: '26223',
    afm: '678901234',
    doy: 'Πατρών',
    category: 'fleet',
    revenue: 55000,
    isVip: true,
  },
  {
    firstName: 'Αγγελική',
    lastName: 'Σταυρίδου',
    company: null,
    email: 'angeliki.st@yahoo.gr',
    phone: null,
    mobile: '694 5556667',
    city: 'Ηράκλειο',
    street: 'Λεωφ. Κνωσσού 50',
    postalCode: '71409',
    afm: null,
    doy: null,
    category: 'retail',
    revenue: 1200,
    isVip: false,
  },
];

const sampleTags = [
  { name: 'Χονδρική', color: '#3B82F6' },
  { name: 'Λιανική', color: '#10B981' },
  { name: 'Στόλος', color: '#8B5CF6' },
  { name: 'Συνεργείο', color: '#F59E0B' },
  { name: 'VIP', color: '#EF4444' },
  { name: 'Νέος', color: '#06B6D4' },
  { name: 'Πιστός', color: '#84CC16' },
  { name: 'Taxi', color: '#FBBF24' },
];

const sampleLeads = [
  {
    firstName: 'Αλέξανδρος',
    lastName: 'Νικολάου',
    company: 'Fast Courier',
    email: 'alex@fastcourier.gr',
    phone: '210 7778889',
    source: 'website',
    status: 'new',
    score: 75,
  },
  {
    firstName: 'Ιωάννα',
    lastName: 'Παπαγεωργίου',
    company: 'Super Market Plus',
    email: 'ioanna@smplus.gr',
    phone: '2310 2223334',
    source: 'referral',
    status: 'contacted',
    score: 60,
  },
  {
    firstName: 'Θεόδωρος',
    lastName: 'Βασιλείου',
    company: 'Transport Pro',
    email: 'theo@transportpro.gr',
    phone: '2610 4445556',
    source: 'import',
    status: 'qualified',
    score: 85,
  },
  {
    firstName: 'Μαρίνα',
    lastName: 'Χρήστου',
    company: 'City Rentals',
    email: 'marina@cityrentals.gr',
    phone: '210 6667778',
    source: 'manual',
    status: 'proposal',
    score: 90,
  },
];

export async function POST() {
  if (process.env.ENABLE_SEED_ENDPOINT !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasRole(session, ['owner', 'admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = getOrgIdFromSession(session);

    // Create organization if not exists
    const existingOrg = await db.query.organizations.findFirst({
      where: (orgs, { eq }) => eq(orgs.id, orgId),
    });

    if (!existingOrg) {
      await db.insert(organizations).values({
        id: orgId,
        name: 'KK Tires',
        slug: 'kktires',
        settings: {
          currency: 'EUR',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24h',
          timezone: 'Europe/Athens',
          language: 'el',
        },
        subscriptionTier: 'premium',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Create tags
    const createdTags: { id: string; name: string }[] = [];
    for (const tag of sampleTags) {
      const tagId = `tag_${nanoid()}`;
      await db.insert(tags).values({
        id: tagId,
        orgId,
        name: tag.name,
        color: tag.color,
        createdAt: new Date(),
      }).onConflictDoNothing();
      createdTags.push({ id: tagId, name: tag.name });
    }

    // Get existing tags
    const allTags = await db.query.tags.findMany({
      where: (t, { eq }) => eq(t.orgId, orgId),
    });

    // Create customers
    const createdCustomerIds: string[] = [];
    for (const customer of sampleCustomers) {
      const customerId = `cust_${nanoid()}`;
      await db.insert(customers).values({
        id: customerId,
        orgId,
        firstName: customer.firstName,
        lastName: customer.lastName,
        company: customer.company,
        email: customer.email,
        phone: customer.phone,
        mobile: customer.mobile,
        city: customer.city,
        street: customer.street,
        postalCode: customer.postalCode,
        country: 'Ελλάδα',
        afm: customer.afm,
        doy: customer.doy,
        category: customer.category,
        revenue: customer.revenue,
        isVip: customer.isVip,
        lifecycleStage: 'customer',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();
      createdCustomerIds.push(customerId);

      // Add tags based on category
      const tagMappings: Record<string, string[]> = {
        vip: ['VIP', 'Χονδρική', 'Πιστός'],
        premium: ['Στόλος'],
        wholesale: ['Χονδρική', 'Συνεργείο', 'VIP'],
        fleet: ['Στόλος', 'Taxi'],
        garage: ['Συνεργείο'],
        retail: ['Λιανική', 'Νέος'],
      };

      const customerTagNames = tagMappings[customer.category] || ['Λιανική'];
      for (const tagName of customerTagNames) {
        const tag = allTags.find(t => t.name === tagName);
        if (tag) {
          await db.insert(customerTags).values({
            id: `ct_${nanoid()}`,
            customerId,
            tagId: tag.id,
            createdAt: new Date(),
          }).onConflictDoNothing();
        }
      }
    }

    // Create leads
    for (const lead of sampleLeads) {
      await db.insert(leads).values({
        id: `lead_${nanoid()}`,
        orgId,
        firstName: lead.firstName,
        lastName: lead.lastName,
        company: lead.company,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        status: lead.status,
        score: lead.score,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();
    }

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully!',
      counts: {
        customers: sampleCustomers.length,
        tags: sampleTags.length,
        leads: sampleLeads.length,
      },
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    return NextResponse.json(
      { error: 'Failed to seed database', details: String(error) },
      { status: 500 }
    );
  }
}

