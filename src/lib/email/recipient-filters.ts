export interface RecipientFilters {
  cities: string[];
  tags: string[];
  segments: string[];
  categories: string[];
  customerIds: string[];
  rawEmails: string[];
}

export const EMPTY_RECIPIENT_FILTERS: RecipientFilters = {
  cities: [],
  tags: [],
  segments: [],
  categories: [],
  customerIds: [],
  rawEmails: [],
};

const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function dedupeTrimmedStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (typeof item !== 'string') continue;
    const next = item.trim();
    if (!next) continue;
    if (seen.has(next)) continue;
    seen.add(next);
    out.push(next);
  }

  return out;
}

export function normalizeRawEmails(values: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const email of dedupeTrimmedStrings(values)) {
    const normalized = email.toLowerCase();
    if (!SIMPLE_EMAIL_REGEX.test(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }

  return out;
}

export function normalizeRecipientFiltersClient(value: unknown): RecipientFilters {
  if (!value || typeof value !== 'object') return { ...EMPTY_RECIPIENT_FILTERS };
  const source = value as Record<string, unknown>;
  return {
    cities: dedupeTrimmedStrings(source.cities),
    tags: dedupeTrimmedStrings(source.tags),
    segments: dedupeTrimmedStrings(source.segments),
    categories: dedupeTrimmedStrings(source.categories),
    customerIds: dedupeTrimmedStrings(source.customerIds),
    rawEmails: normalizeRawEmails(source.rawEmails),
  };
}

export function hasRecipientSelection(filters: RecipientFilters): boolean {
  return (
    filters.cities.length > 0 ||
    filters.tags.length > 0 ||
    filters.segments.length > 0 ||
    filters.categories.length > 0 ||
    filters.customerIds.length > 0 ||
    filters.rawEmails.length > 0
  );
}

export function parseManualEmailsInput(input: string): { valid: string[]; invalid: string[] } {
  const tokens = input
    .split(/[\s,;\n\r\t]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    const email = token.toLowerCase();
    if (!SIMPLE_EMAIL_REGEX.test(email)) {
      invalid.push(token);
      continue;
    }
    if (!seen.has(email)) {
      seen.add(email);
      valid.push(email);
    }
  }

  return { valid, invalid };
}
