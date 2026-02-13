import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
    coverage: {
      enabled: false,
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'test-results/coverage',
      // Enforce strong coverage on the hardened, high-risk server routes first.
      include: [
        'src/app/api/customers/route.ts',
        'src/app/api/customers/export/route.ts',
        'src/app/api/email/send/route.ts',
        'src/app/api/campaigns/[id]/send/route.ts',
        'src/app/api/cron/email-jobs/route.ts',
        'src/app/api/health/route.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 75,
        statements: 80,
        branches: 70,
      },
    },
  },
});
