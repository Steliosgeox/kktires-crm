import { db } from '@/lib/db';
import { customerTags, customers, segments } from '@/lib/db/schema';
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
} from 'drizzle-orm';

export interface RecipientFilters {
  cities: string[];
  tags: string[];
  segments: string[];
  categories: string[];
}

function isMissingColumnError(error: unknown, columnName: string): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /no such column/i.test(message) && message.toLowerCase().includes(columnName.toLowerCase());
}

export function normalizeRecipientFilters(input: unknown): RecipientFilters {
  const obj = (input && typeof input === 'object') ? (input as Record<string, unknown>) : {};
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') as string[] : []);

  return {
    cities: arr(obj.cities),
    tags: arr(obj.tags),
    segments: arr(obj.segments),
    categories: arr(obj.categories),
  };
}

function getCustomerColumn(field: string) {
  // Keep this mapping intentionally small and explicit.
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

  const value = cond.value as any;

  switch (operator) {
    case 'equals':
      return eq(column as any, value);
    case 'notEquals':
      return ne(column as any, value);
    case 'contains':
      return like(column as any, `%${String(value)}%`);
    case 'startsWith':
      return like(column as any, `${String(value)}%`);
    case 'greaterThan':
      return typeof value === 'number' ? gt(column as any, value) : null;
    case 'lessThan':
      return typeof value === 'number' ? lt(column as any, value) : null;
    case 'greaterOrEqual':
      return typeof value === 'number' ? gte(column as any, value) : null;
    case 'lessOrEqual':
      return typeof value === 'number' ? lte(column as any, value) : null;
    default:
      return null;
  }
}

function buildSegmentExpression(filters: any) {
  const logic = filters?.logic === 'or' ? 'or' : 'and';
  const conditionsRaw = Array.isArray(filters?.conditions) ? filters.conditions : [];
  const conds = conditionsRaw.map(buildSegmentCondition).filter(Boolean) as any[];
  if (conds.length === 0) return null;
  return logic === 'or' ? or(...conds) : and(...conds);
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

async function buildRecipientWhere(
  orgId: string,
  filters: RecipientFilters,
  options?: { includeUnsubscribedFilter?: boolean }
) {
  const whereParts: any[] = [
    eq(customers.orgId, orgId),
    sql`${customers.email} IS NOT NULL`,
  ];

  if (options?.includeUnsubscribedFilter !== false) {
    whereParts.push(sql`(${customers.unsubscribed} = 0 OR ${customers.unsubscribed} IS NULL)`);
  }

  if (filters.cities.length > 0) {
    whereParts.push(inArray(customers.city, filters.cities));
  }

  if (filters.categories.length > 0) {
    whereParts.push(inArray(customers.category, filters.categories));
  }

  if (filters.tags.length > 0) {
    const ids = await getCustomerIdsForTags(orgId, filters.tags);
    if (ids.length === 0) return [sql`1=0`];
    whereParts.push(inArray(customers.id, ids));
  }

  if (filters.segments.length > 0) {
    const selectedSegments = await db.query.segments.findMany({
      where: (s, { and, eq, inArray }) => and(eq(s.orgId, orgId), inArray(s.id, filters.segments)),
    });

    const segmentExprs = selectedSegments
      .map((s) => buildSegmentExpression(s.filters))
      .filter(Boolean) as any[];

    if (segmentExprs.length === 0) return [sql`1=0`];

    whereParts.push(or(...segmentExprs));
  }

  return whereParts;
}

export async function countRecipients(orgId: string, rawFilters: unknown): Promise<number> {
  const filters = normalizeRecipientFilters(rawFilters);
  const runCount = async (includeUnsubscribedFilter: boolean) => {
    const whereParts = await buildRecipientWhere(orgId, filters, { includeUnsubscribedFilter });
    const [result] = await db
      .select({ count: sql<number>`count(DISTINCT ${customers.id})` })
      .from(customers)
      .where(and(...whereParts));

    return result?.count || 0;
  };

  try {
    return await runCount(true);
  } catch (error) {
    if (isMissingColumnError(error, 'unsubscribed')) {
      // Backward compatibility for older DBs missing customers.unsubscribed.
      return runCount(false);
    }
    throw error;
  }
}

export async function selectRecipients(
  orgId: string,
  rawFilters: unknown
): Promise<
  Array<{
    id: string;
    firstName: string;
    lastName: string | null;
    company: string | null;
    city: string | null;
    phone: string | null;
    mobile: string | null;
    email: string;
  }>
> {
  const filters = normalizeRecipientFilters(rawFilters);
  const runSelect = async (includeUnsubscribedFilter: boolean) => {
    const whereParts = await buildRecipientWhere(orgId, filters, { includeUnsubscribedFilter });
    const rows = await db
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

    return rows.filter((r) => !!r.email) as any;
  };

  try {
    return await runSelect(true);
  } catch (error) {
    if (isMissingColumnError(error, 'unsubscribed')) {
      // Backward compatibility for older DBs missing customers.unsubscribed.
      return runSelect(false);
    }
    throw error;
  }
}
