# KK Tires CRM Codebase Index

Last updated: 2026-03-10

This file is the repo index for production work. It is not a full line-by-line inventory; it is the shortest useful map of where the important logic lives and what must be checked before deployment.

## Read Order

1. `docs/ARCHITECTURE_CURRENT.md`
2. `docs/EMAIL_PRODUCTION_READINESS.md`
3. `docs/CODEBASE_INDEX.md`

## Top-Level Directories

### App and UI

- `src/app`: Next.js App Router pages and API routes
- `src/components`: feature UI, shared UI, and providers
- `src/styles`: shared styling fragments

### Business and server logic

- `src/server/authz.ts`: org/session access control
- `src/server/api/http.ts`: normalized API error responses
- `src/server/email/*`: queueing, recipient resolution, SMTP transport, tracking, assets
- `src/server/maps/*`: geocoding and map helpers

### Data

- `src/lib/db/schema.ts`: Drizzle schema and relations
- `src/lib/db/index.ts`: DB client bootstrap and runtime guard
- `drizzle/*.sql`: schema migrations

### Tooling and operations

- `scripts/migrate-production.mjs`: production migration runner
- `scripts/fix-fk-references.mjs`: post-migration FK repair helper for LibSQL rebuild edge-cases
- `tests/*`: unit/integration coverage
- `tests/e2e/*`: Playwright browser checks

## High-Risk Production Paths

### Email campaign lifecycle

- `src/app/api/campaigns/route.ts`
- `src/app/api/campaigns/[id]/route.ts`
- `src/app/api/campaigns/[id]/send/route.ts`
- `src/app/api/campaigns/[id]/retry/route.ts`
- `src/app/api/campaigns/[id]/recipients/route.ts`

### Email runtime

- `src/server/email/job-queue.ts`
- `src/server/email/process-jobs.ts`
- `src/server/email/recipients.ts`
- `src/server/email/transport.ts`
- `src/server/email/smtp.ts`
- `src/server/email/tracking.ts`
- `src/server/email/assets.ts`

### Email UI

- `src/app/(dashboard)/email/page.tsx`
- `src/components/email/outlook-editor.tsx`
- `src/components/email/outlook-recipient-drawer.tsx`
- `src/components/email/recipient-preview-drawer.tsx`
- `src/components/email/campaign-recipients-drawer.tsx`

## Current Email Safety Invariants

- Empty recipient selection does not expand to all customers.
- Send/schedule actions are blocked when resolved recipient count is zero.
- Send preflight requires a non-empty subject.
- Sent and sending campaigns are immutable through the API.
- Draft duplication copies full campaign content, recipients, signature, and assets.
- Final delivery uses unique normalized recipient emails, not raw selected record count.

## Environment Inventory

### Required

- `DATABASE_URL`
- `DATABASE_AUTH_TOKEN`
- `AUTH_SECRET` or `NEXTAUTH_SECRET`
- `CRON_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

### Strongly recommended

- `SMTP_FROM`
- `EMAIL_TRACKING_SECRET`
- `BLOB_READ_WRITE_TOKEN`

### Queue tuning

- `EMAIL_CRON_TIME_BUDGET_MS`
- `EMAIL_CRON_MAX_JOBS`
- `EMAIL_JOB_MAX_ITEMS_PER_RUN`
- `EMAIL_JOB_CONCURRENCY`
- `EMAIL_JOB_LOCK_TIMEOUT_MS`
- `EMAIL_JOB_YIELD_DELAY_MS`

## Validation Snapshot

Validated on 2026-03-10:

- `npm run typecheck`
- `npm run build`
- `npm test -- tests/api.test.ts`
- `npm test -- tests/job-queue.test.ts`
- `npm test -- tests/process-jobs.test.ts`
- `react-doctor`

Observed state:

- TypeScript: passing
- Build: passing
- Targeted API/email tests: passing
- React Doctor: score `80/100`

## Remaining Backlog

These are not hidden. They are the main non-zero cleanup items still visible after this pass.

### Accessibility and rendering

- React Doctor still reports one project-level reduced-motion error, despite existing reduced-motion CSS and a motion provider wrapper. This likely needs either broader motion-library configuration or acceptance that the tool is using a coarse heuristic.
- `useSearchParams()` pages still need local Suspense boundaries:
  - `src/app/login/page.tsx`
  - `src/app/(dashboard)/customers/page.tsx`
  - `src/app/(dashboard)/leads/page.tsx`
  - `src/app/(dashboard)/tasks/page.tsx`
  - `src/app/(dashboard)/settings/page.tsx`

### UI quality

- Several large pages/components still need decomposition and keyboard/accessibility cleanup.
- Some list views still use array indexes as keys.
- Some labels are still not associated with controls.

### Security and hygiene

- `src/app/layout.tsx` still uses inline scripts through `dangerouslySetInnerHTML`.
- There are many dead-code and unused-export warnings worth pruning before a later stabilization pass.
- Tests and a few dashboard files still contain `any` usage that is warning-only today.

## Launch Recommendation

For the email/campaign system specifically, the app is materially safer than before this pass. For whole-app polish, the remaining work is mostly accessibility, ergonomics, and dead-code cleanup rather than known send-path correctness issues.
