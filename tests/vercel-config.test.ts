import { readFile } from 'node:fs/promises';
import path from 'node:path';

describe('vercel.json cron configuration', () => {
  it('contains required cron schedules for email and geocode jobs', async () => {
    const configPath = path.join(process.cwd(), 'vercel.json');
    const raw = await readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw) as {
      crons?: Array<{ path?: string; schedule?: string }>;
    };

    expect(Array.isArray(parsed.crons)).toBe(true);
    const crons = parsed.crons || [];

    expect(
      crons.some((cron) => cron.path === '/api/cron/email-jobs' && cron.schedule === '* * * * *')
    ).toBe(true);
    expect(
      crons.some((cron) => cron.path === '/api/cron/geocode-customers' && cron.schedule === '0 * * * *')
    ).toBe(true);
  });
});

