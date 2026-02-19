import { defineConfig, devices } from '@playwright/test';

const e2ePort = Number(process.env.E2E_PORT || 3000);
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: e2eBaseUrl,
    trace: 'on-first-retry',
    storageState: './tests/.tmp/e2e.storageState.json',
  },
  globalSetup: './tests/e2e/global-setup.ts',
  webServer: {
    command: `node ./node_modules/next/dist/bin/next dev -p ${e2ePort}`,
    url: e2eBaseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: 'file:./tests/.tmp/e2e.db',
      DATABASE_AUTH_TOKEN: '',
      AUTH_SECRET: 'test',
      NEXTAUTH_SECRET: 'test',
      NEXTAUTH_URL: e2eBaseUrl,
      AUTH_ALLOWED_EMAILS: 'test@example.com',
      DEFAULT_ORG_ID: 'org_kktires',
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: '2525',
      SMTP_SECURE: 'false',
      SMTP_USER: 'test@example.com',
      SMTP_PASS: 'test-password',
      SMTP_FROM: 'test@example.com',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
