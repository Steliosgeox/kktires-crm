export const CUSTOMER_CATEGORIES = [
  'retail',
  'wholesale',
  'fleet',
  'garage',
  'vip',
  'premium',
  'standard',
  'basic',
] as const;

export type CustomerCategory = (typeof CUSTOMER_CATEGORIES)[number];

export const DEFAULT_CUSTOMER_CATEGORY: CustomerCategory = 'wholesale';

export const CUSTOMER_CATEGORY_LABELS: Record<CustomerCategory, string> = {
  retail: 'Λιανική',
  wholesale: 'Χονδρική',
  fleet: 'Στόλος',
  garage: 'Συνεργείο',
  vip: 'VIP',
  premium: 'Premium',
  standard: 'Standard',
  basic: 'Basic',
};

export const CUSTOMER_CATEGORY_COLORS: Record<CustomerCategory, string> = {
  retail: '#14b8a6',
  wholesale: '#3b82f6',
  fleet: '#6366f1',
  garage: '#f97316',
  vip: '#eab308',
  premium: '#a855f7',
  standard: '#64748b',
  basic: '#94a3b8',
};

const CATEGORY_SYNONYMS: Record<string, CustomerCategory> = {
  retail: 'retail',
  lianiki: 'retail',
  λιανικη: 'retail',
  λιανικης: 'retail',

  wholesale: 'wholesale',
  xondriki: 'wholesale',
  χονδρικη: 'wholesale',
  χονδρικης: 'wholesale',
  b2b: 'wholesale',
  partner: 'wholesale',
  συνεργατης: 'wholesale',
  government: 'wholesale',
  δημοσιο: 'wholesale',

  fleet: 'fleet',
  στολος: 'fleet',
  taxi: 'fleet',

  garage: 'garage',
  συνεργειο: 'garage',
  garaz: 'garage',
  γκαραζ: 'garage',

  vip: 'vip',

  premium: 'premium',

  standard: 'standard',
  τυπικη: 'standard',

  basic: 'basic',
  βασικη: 'basic',
};

function normalizeValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\u0370-\u03ff ]/g, '')
    .trim();
}

export function isCustomerCategory(value: string): value is CustomerCategory {
  return (CUSTOMER_CATEGORIES as readonly string[]).includes(value);
}

export function normalizeCustomerCategory(input: unknown): CustomerCategory | null {
  if (typeof input !== 'string') return null;
  const normalized = normalizeValue(input);
  if (!normalized) return null;

  if (isCustomerCategory(normalized)) {
    return normalized;
  }

  return CATEGORY_SYNONYMS[normalized] ?? null;
}

export function getCustomerCategoryLabel(category: string | null | undefined): string {
  if (!category) return CUSTOMER_CATEGORY_LABELS[DEFAULT_CUSTOMER_CATEGORY];
  const normalized = normalizeCustomerCategory(category);
  if (!normalized) return category;
  return CUSTOMER_CATEGORY_LABELS[normalized];
}

export function getCustomerCategoryColor(category: string | null | undefined): string {
  const normalized = normalizeCustomerCategory(category ?? '');
  return CUSTOMER_CATEGORY_COLORS[normalized ?? DEFAULT_CUSTOMER_CATEGORY];
}
