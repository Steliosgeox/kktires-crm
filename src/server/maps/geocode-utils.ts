export type AddressParts = {
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
};

export function buildAddressString(parts: AddressParts): string {
  const pieces = [
    parts.street,
    parts.postalCode,
    parts.city,
    parts.state,
    parts.country || 'Greece',
  ]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean);

  return pieces.join(', ');
}

export function normalizeAddressForCacheKey(address: string): string {
  return address
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ');
}
