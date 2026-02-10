import {
  buildClickUrl,
  buildOpenPixelUrl,
  buildUnsubscribeUrl,
  safeEqual,
  signTrackingValue,
} from '../src/server/email/tracking';

const ORIGINAL_NEXTAUTH_URL = process.env.NEXTAUTH_URL;
const ORIGINAL_SECRET = process.env.EMAIL_TRACKING_SECRET;

afterEach(() => {
  if (ORIGINAL_NEXTAUTH_URL === undefined) delete process.env.NEXTAUTH_URL;
  else process.env.NEXTAUTH_URL = ORIGINAL_NEXTAUTH_URL;

  if (ORIGINAL_SECRET === undefined) delete process.env.EMAIL_TRACKING_SECRET;
  else process.env.EMAIL_TRACKING_SECRET = ORIGINAL_SECRET;
});

describe('Email Tracking Signing', () => {
  it('builds a signed open pixel url', () => {
    process.env.NEXTAUTH_URL = 'https://crm.example.com';
    process.env.EMAIL_TRACKING_SECRET = 'test-secret';

    const url = buildOpenPixelUrl({ campaignId: 'camp_1', recipientId: 'rcpt_1' });
    expect(url).toBeTruthy();

    const u = new URL(url!);
    expect(u.pathname).toBe('/api/email/tracking');
    expect(u.searchParams.get('cid')).toBe('camp_1');
    expect(u.searchParams.get('rid')).toBe('rcpt_1');

    const sig = u.searchParams.get('sig');
    expect(sig).toBeTruthy();

    const expected = signTrackingValue('open|camp_1|rcpt_1');
    expect(expected).toBeTruthy();
    expect(safeEqual(expected!, sig!)).toBe(true);
  });

  it('builds a signed click url', () => {
    process.env.NEXTAUTH_URL = 'https://crm.example.com';
    process.env.EMAIL_TRACKING_SECRET = 'test-secret';

    const dest = 'https://kktires.gr/offers?x=1';
    const url = buildClickUrl({ campaignId: 'camp_2', recipientId: 'rcpt_2', destinationUrl: dest });
    expect(url).toBeTruthy();

    const u = new URL(url!);
    expect(u.pathname).toBe('/api/email/click');
    expect(u.searchParams.get('cid')).toBe('camp_2');
    expect(u.searchParams.get('rid')).toBe('rcpt_2');
    expect(u.searchParams.get('u')).toBe(dest);

    const sig = u.searchParams.get('sig');
    const expected = signTrackingValue(`click|camp_2|rcpt_2|${dest}`);
    expect(safeEqual(expected!, sig!)).toBe(true);
  });

  it('builds a signed unsubscribe url', () => {
    process.env.NEXTAUTH_URL = 'https://crm.example.com';
    process.env.EMAIL_TRACKING_SECRET = 'test-secret';

    const url = buildUnsubscribeUrl({ campaignId: 'camp_3', recipientId: 'rcpt_3' });
    expect(url).toBeTruthy();

    const u = new URL(url!);
    expect(u.pathname).toBe('/api/unsubscribe');
    expect(u.searchParams.get('cid')).toBe('camp_3');
    expect(u.searchParams.get('rid')).toBe('rcpt_3');

    const sig = u.searchParams.get('sig');
    const expected = signTrackingValue('unsub|camp_3|rcpt_3');
    expect(safeEqual(expected!, sig!)).toBe(true);
  });
});
