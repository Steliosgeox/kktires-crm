import { defineConfig, devices } from '@playwright/test';

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
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    storageState: './tests/.tmp/e2e.storageState.json',
  },
  globalSetup: './tests/e2e/global-setup.ts',
  webServer: {
    command: 'npm run dev -- -p 3000',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: 'file:./tests/.tmp/e2e.db',
      DATABASE_AUTH_TOKEN: '',
      AUTH_SECRET: 'test',
      NEXTAUTH_SECRET: 'test',
      NEXTAUTH_URL: 'http://127.0.0.1:3000',
      AUTH_ALLOWED_EMAILS: 'test@example.com',
      DEFAULT_ORG_ID: 'org_kktires',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

