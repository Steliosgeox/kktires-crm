import { buildAddressString, normalizeAddressForCacheKey } from '../src/server/maps/geocode-utils';

describe('geocode utils', () => {
  it('buildAddressString builds a stable address string with Greece default', () => {
    const s = buildAddressString({
      street: '  Patision 10 ',
      postalCode: ' 104 34 ',
      city: ' Αθήνα ',
      state: null,
      country: null,
    });

    expect(s).toBe('Patision 10, 104 34, Αθήνα, Greece');
  });

  it('normalizeAddressForCacheKey lowercases, removes diacritics and normalizes whitespace/comma spacing', () => {
    const raw = '  Patision  10 ,   Αθήνα  ';
    const norm = normalizeAddressForCacheKey(raw);
    expect(norm).toBe('patision 10, αθηνα');
  });
});

