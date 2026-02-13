import { readFile } from 'node:fs/promises';
import path from 'node:path';

describe('vercel.json cron configuration', () => {
  it('does not declare built-in Vercel crons (external scheduler mode)', async () => {
    const configPath = path.join(process.cwd(), 'vercel.json');
    const raw = await readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    expect(Object.prototype.hasOwnProperty.call(parsed, 'crons')).toBe(false);
  });
});
