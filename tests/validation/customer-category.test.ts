import {
  DEFAULT_CUSTOMER_CATEGORY,
  getCustomerCategoryColor,
  getCustomerCategoryLabel,
  normalizeCustomerCategory,
} from '@/lib/customers/category';

describe('customer category normalization', () => {
  it('normalizes Greek and English category values', () => {
    expect(normalizeCustomerCategory('Χονδρική')).toBe('wholesale');
    expect(normalizeCustomerCategory('λιανική')).toBe('retail');
    expect(normalizeCustomerCategory('fleet')).toBe('fleet');
    expect(normalizeCustomerCategory('Συνεργείο')).toBe('garage');
    expect(normalizeCustomerCategory('VIP')).toBe('vip');
  });

  it('maps known synonyms', () => {
    expect(normalizeCustomerCategory('Taxi')).toBe('fleet');
    expect(normalizeCustomerCategory('partner')).toBe('wholesale');
    expect(normalizeCustomerCategory('Δημόσιο')).toBe('wholesale');
  });

  it('returns null for unknown category values', () => {
    expect(normalizeCustomerCategory('unknown')).toBeNull();
    expect(normalizeCustomerCategory('')).toBeNull();
    expect(normalizeCustomerCategory(undefined)).toBeNull();
  });

  it('uses wholesale defaults for display helpers', () => {
    expect(DEFAULT_CUSTOMER_CATEGORY).toBe('wholesale');
    expect(getCustomerCategoryLabel(undefined)).toBe('Χονδρική');
    expect(getCustomerCategoryColor(undefined)).toBeTruthy();
  });
});
