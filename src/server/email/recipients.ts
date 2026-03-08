import { db } from '@/lib/db';
import {
  customerTags,
  customers,
  emailSuppressions,
  segmentCustomers,
  segments,
  unsubscribes,
} from '@/lib/db/schema';
import {
  and,
  eq,
  gt,
  gte,
  inArray,
  like,
  lt,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

export interface RecipientFilters {
  cities: string[];
  tags: string[];
  segments: string[];
  categories: string[];
  customerIds: string[];
  rawEmails: string[];
}

export type ResolvedRecipient = {
  customerId: string | null;
  recipientSource: 'customer' | 'manual_email';
  displayName: string | null;
  email: string;
  firstName: string;
  lastName: string | null;
  company: string | null;
  city: string | null;
  phone: string | null;
  mobile: string | null;
};

type CustomerRecipientRow = {
  id: string;
  firstName: string;
  lastName: string | null;
  company: string | null;
  city: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
};

const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isMissingColumnError(error: unknown, columnName: string): boolean {
  const parts: string[] = [];
  if (error instanceof Error) {
    parts.push(error.message);
    if (error.cause instanceof Error) parts.push(error.cause.message);
    else if (error.cause) parts.push(String(error.cause));
  } else {
    parts.push(String(error ?? ''));
  }
  const message = parts.join(' | ');
  return /no such column/i.test(message) && message.toLowerCase().includes(columnName.toLowerCase());
}

function isMissingTableError(error: unknown, tableName: string): boolean {
  const parts: string[] = [];
  if (error instanceof Error) {
    parts.push(error.message);
    if (error.cause instanceof Error) parts.push(error.cause.message);
    else if (error.cause) parts.push(String(error.cause));
  } else {
    parts.push(String(error ?? ''));
  }
  const message = parts.join(' | ');
  return /no such table/i.test(message) && message.toLowerCase().includes(tableName.toLowerCase());
}

function dedupeStrings(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of input) {
    if (typeof value !== 'string') continue;
    const next = value.trim();
    if (!next) continue;
    if (!seen.has(next)) {
      seen.add(next);
      out.push(next);
    }
  }
  return out;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeRawEmails(input: unknown): string[] {
  const values = dedupeStrings(input);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const email = normalizeEmail(raw);
    if (!SIMPLE_EMAIL_REGEX.test(email)) continue;
    if (!seen.has(email)) {
      seen.add(email);
      out.push(email);
    }
  }
  return out;
}

export function normalizeRecipientFilters(input: unknown): RecipientFilters {
  const obj = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  return {
    cities: dedupeStrings(obj.cities),
    tags: dedupeStrings(obj.tags),
    segments: dedupeStrings(obj.segments),
    categories: dedupeStrings(obj.categories),
    customerIds: dedupeStrings(obj.customerIds),
    rawEmails: normalizeRawEmails(obj.rawEmails),
  };
}

function getCustomerColumn(field: string) {
  switch (field) {
    case 'firstName':
      return customers.firstName;
    case 'lastName':
      return customers.lastName;
    case 'company':
      return customers.company;
    case 'email':
      return customers.email;
    case 'phone':
      return customers.phone;
    case 'mobile':
      return customers.mobile;
    case 'city':
      return customers.city;
    case 'country':
      return customers.country;
    case 'category':
      return customers.category;
    case 'afm':
      return customers.afm;
    case 'doy':
      return customers.doy;
    case 'revenue':
      return customers.revenue;
    case 'isVip':
      return customers.isVip;
    case 'isActive':
      return customers.isActive;
    case 'lifecycleStage':
      return customers.lifecycleStage;
    case 'leadSource':
      return customers.leadSource;
    case 'leadScore':
      return customers.leadScore;
    default:
      return null;
  }
}

function buildSegmentCondition(cond: { field?: unknown; operator?: unknown; value?: unknown }) {
  const field = typeof cond.field === 'string' ? cond.field : null;
  const operator = typeof cond.operator === 'string' ? cond.operator : null;
  if (!field || !operator) return null;

  const column = getCustomerColumn(field);
  if (!column) return null;

  const value = cond.value as unknown;

  switch (operator) {
    case 'equals':
      return eq(column as never, value as never);
    case 'notEquals':
      return ne(column as never, value as never);
    case 'contains':
      return typeof value === 'string' ? like(column as never, `%${value}%`) : null;
    case 'startsWith':
      return typeof value === 'string' ? like(column as never, `${value}%`) : null;
    case 'greaterThan':
      return typeof value === 'number' ? gt(column as never, value) : null;
    case 'lessThan':
      return typeof value === 'number' ? lt(column as never, value) : null;
    case 'greaterOrEqual':
      return typeof value === 'number' ? gte(column as never, value) : null;
    case 'lessOrEqual':
      return typeof value === 'number' ? lte(column as never, value) : null;
    default:
      return null;
  }
}

function buildSegmentExpression(filters: unknown) {
  const payload = filters as { logic?: unknown; conditions?: unknown };
  const logic = payload?.logic === 'or' ? 'or' : 'and';
  const conditionsRaw = Array.isArray(payload?.conditions) ? payload.conditions : [];
  const conditions = conditionsRaw
    .map((cond) => buildSegmentCondition(cond as never))
    .filter((cond): cond is SQL => cond !== null);
  if (conditions.length === 0) return null;
  return logic === 'or' ? or(...conditions) : and(...conditions);
}

async function getCustomerIdsForTags(orgId: string, tagIds: string[]): Promise<string[]> {
  if (tagIds.length === 0) return [];
  const rows = await db
    .selectDistinct({ id: customers.id })
    .from(customers)
    .innerJoin(customerTags, eq(customerTags.customerId, customers.id))
    .where(and(eq(customers.orgId, orgId), inArray(customerTags.tagId, tagIds)));
  return rows.map((r) => r.id);
}

async function getCustomerIdsForSegments(
  orgId: string,
  segmentIds: string[],
  includeUnsubscribedFilter: boolean
): Promise<string[]> {
  if (segmentIds.length === 0) return [];

  const selectedSegments = await db.query.segments.findMany({
    where: (s, { and: whereAnd, eq: whereEq, inArray: whereInArray }) =>
      whereAnd(whereEq(s.orgId, orgId), whereInArray(s.id, segmentIds)),
  });

  const ids = new Set<string>();

  for (const segment of selectedSegments) {
    const segmentExpr = buildSegmentExpression(segment.filters);
    if (!segmentExpr) continue;

    const whereParts: any[] = [
      eq(customers.orgId, orgId),
      sql`${customers.email} IS NOT NULL`,
      segmentExpr,
    ];

    if (includeUnsubscribedFilter) {
      whereParts.push(sql`(${customers.unsubscribed} = 0 OR ${customers.unsubscribed} IS NULL)`);
    }

    const rows = await db.select({ id: customers.id }).from(customers).where(and(...whereParts));
    for (const row of rows) ids.add(row.id);
  }

  const staticMembers = await db
    .selectDistinct({ customerId: segmentCustomers.customerId })
    .from(segmentCustomers)
    .innerJoin(segments, eq(segments.id, segmentCustomers.segmentId))
    .where(and(eq(segments.orgId, orgId), inArray(segmentCustomers.segmentId, segmentIds)));

  for (const member of staticMembers) ids.add(member.customerId);
  return Array.from(ids);
}

async function fetchCustomersByIds(
  orgId: string,
  customerIds: string[],
  includeUnsubscribedFilter: boolean
): Promise<CustomerRecipientRow[]> {
  if (customerIds.length === 0) return [];
  const whereParts: any[] = [
    eq(customers.orgId, orgId),
    inArray(customers.id, customerIds),
    sql`${customers.email} IS NOT NULL`,
  ];
  if (includeUnsubscribedFilter) {
    whereParts.push(sql`(${customers.unsubscribed} = 0 OR ${customers.unsubscribed} IS NULL)`);
  }
  return db
    .select({
      id: customers.id,
      firstName: customers.firstName,
      lastName: customers.lastName,
      company: customers.company,
      city: customers.city,
      phone: customers.phone,
      mobile: customers.mobile,
      email: customers.email,
    })
    .from(customers)
    .where(and(...whereParts));
}

async function fetchFilterCustomers(
  orgId: string,
  filters: RecipientFilters,
  includeUnsubscribedFilter: boolean
): Promise<CustomerRecipientRow[]> {
  const hasFilterCriteria =
    filters.cities.length > 0 ||
    filters.tags.length > 0 ||
    filters.segments.length > 0 ||
    filters.categories.length > 0;
  const hasManualCriteria = filters.customerIds.length > 0 || filters.rawEmails.length > 0;
  const includeAllCustomersByDefault = !hasFilterCriteria && !hasManualCriteria;

  if (!hasFilterCriteria && !includeAllCustomersByDefault) return [];

  const whereParts: any[] = [eq(customers.orgId, orgId), sql`${customers.email} IS NOT NULL`];
  if (includeUnsubscribedFilter) {
    whereParts.push(sql`(${customers.unsubscribed} = 0 OR ${customers.unsubscribed} IS NULL)`);
  }

  if (hasFilterCriteria && filters.cities.length > 0) {
    whereParts.push(inArray(customers.city, filters.cities));
  }

  if (hasFilterCriteria && filters.categories.length > 0) {
    whereParts.push(inArray(customers.category, filters.categories));
  }

  if (hasFilterCriteria && filters.tags.length > 0) {
    const ids = await getCustomerIdsForTags(orgId, filters.tags);
    if (ids.length === 0) return [];
    whereParts.push(inArray(customers.id, ids));
  }

  if (hasFilterCriteria && filters.segments.length > 0) {
    const ids = await getCustomerIdsForSegments(orgId, filters.segments, includeUnsubscribedFilter);
    if (ids.length === 0) return [];
    whereParts.push(inArray(customers.id, ids));
  }

  return db
    .select({
      id: customers.id,
      firstName: customers.firstName,
      lastName: customers.lastName,
      company: customers.company,
      city: customers.city,
      phone: customers.phone,
      mobile: customers.mobile,
      email: customers.email,
    })
    .from(customers)
    .where(and(...whereParts));
}

async function getBlockedEmailSet(orgId: string, emails: string[]): Promise<Set<string>> {
  const blocked = new Set<string>();
  if (emails.length === 0) return blocked;

  try {
    const suppressionRows = await db
      .select({ email: emailSuppressions.email })
      .from(emailSuppressions)
      .where(and(eq(emailSuppressions.orgId, orgId), inArray(emailSuppressions.email, emails)));
    for (const row of suppressionRows) {
      if (row.email) blocked.add(normalizeEmail(row.email));
    }
  } catch (error) {
    if (!isMissingTableError(error, 'email_suppressions')) throw error;
  }

  try {
    const unsubRows = await db
      .select({ email: unsubscribes.email })
      .from(unsubscribes)
      .where(and(eq(unsubscribes.orgId, orgId), inArray(unsubscribes.email, emails)));
    for (const row of unsubRows) {
      if (row.email) blocked.add(normalizeEmail(row.email));
    }
  } catch (error) {
    if (!isMissingTableError(error, 'unsubscribes')) throw error;
  }

  try {
    const unsubCustomers = await db
      .select({ email: customers.email })
      .from(customers)
      .where(
        and(
          eq(customers.orgId, orgId),
          inArray(customers.email, emails),
          eq(customers.unsubscribed, true)
        )
      );
    for (const row of unsubCustomers) {
      if (row.email) blocked.add(normalizeEmail(row.email));
    }
  } catch (error) {
    if (!isMissingColumnError(error, 'unsubscribed')) throw error;
  }

  return blocked;
}

async function resolveRecipientsInternal(
  orgId: string,
  rawFilters: unknown,
  includeUnsubscribedFilter: boolean
): Promise<ResolvedRecipient[]> {
  const filters = normalizeRecipientFilters(rawFilters);

  const filterCustomers = await fetchFilterCustomers(orgId, filters, includeUnsubscribedFilter);
  const explicitCustomers = await fetchCustomersByIds(orgId, filters.customerIds, includeUnsubscribedFilter);
  const blockedRaw = await getBlockedEmailSet(orgId, filters.rawEmails);

  const recipientsByEmail = new Map<string, ResolvedRecipient>();

  const addCustomerRows = (rows: CustomerRecipientRow[]) => {
    for (const row of rows) {
      const email = row.email ? normalizeEmail(row.email) : '';
      if (!email || !SIMPLE_EMAIL_REGEX.test(email)) continue;
      if (recipientsByEmail.has(email)) continue;

      recipientsByEmail.set(email, {
        customerId: row.id,
        recipientSource: 'customer',
        displayName: row.company || `${row.firstName} ${row.lastName || ''}`.trim() || null,
        email,
        firstName: row.firstName,
        lastName: row.lastName,
        company: row.company,
        city: row.city,
        phone: row.phone,
        mobile: row.mobile,
      });
    }
  };

  addCustomerRows(filterCustomers);
  addCustomerRows(explicitCustomers);

  for (const email of filters.rawEmails) {
    const normalized = normalizeEmail(email);
    if (!SIMPLE_EMAIL_REGEX.test(normalized)) continue;
    if (blockedRaw.has(normalized)) continue;
    if (recipientsByEmail.has(normalized)) continue;

    recipientsByEmail.set(normalized, {
      customerId: null,
      recipientSource: 'manual_email',
      displayName: null,
      email: normalized,
      firstName: '',
      lastName: null,
      company: null,
      city: null,
      phone: null,
      mobile: null,
    });
  }

  return Array.from(recipientsByEmail.values()).sort((a, b) => a.email.localeCompare(b.email));
}

export async function countRecipients(orgId: string, rawFilters: unknown): Promise<number> {
  try {
    const recipients = await resolveRecipientsInternal(orgId, rawFilters, true);
    return recipients.length;
  } catch (error) {
    if (isMissingColumnError(error, 'unsubscribed')) {
      // Backward compatibility for older DBs missing customers.unsubscribed.
      const recipients = await resolveRecipientsInternal(orgId, rawFilters, false);
      return recipients.length;
    }
    throw error;
  }
}

export async function selectRecipients(orgId: string, rawFilters: unknown): Promise<ResolvedRecipient[]> {
  try {
    return await resolveRecipientsInternal(orgId, rawFilters, true);
  } catch (error) {
    if (isMissingColumnError(error, 'unsubscribed')) {
      // Backward compatibility for older DBs missing customers.unsubscribed.
      return resolveRecipientsInternal(orgId, rawFilters, false);
    }
    throw error;
  }
}
