# KK Tires CRM Architecture

Last updated: 2026-03-10

This document is the current working architecture map for the application. It is narrower and more up to date than the older large audit documents in `docs/ARCHITECTURAL_MAP.md` and `docs/app-audit.md`, which are still useful as historical reference but no longer reflect every recent email and schema hardening change.

## Scope

This repo is a multi-tenant CRM built on:

- Next.js 16 App Router
- React 19
- Drizzle ORM on libSQL/Turso
- NextAuth v5 beta
- Nodemailer SMTP delivery
- Vercel Blob for email assets

The main production domains are:

1. Authentication and org scoping
2. CRM data management
3. Email campaigns and delivery jobs
4. Import/export and reporting
5. Maps/geocoding and territory tools

## Top-Level Runtime Shape

### Frontend

- `src/app/(dashboard)/*`: authenticated pages
- `src/components/*`: feature and shared UI
- `src/lib/*`: client-safe helpers, stores, DB client wiring, validation

### Backend

- `src/app/api/*`: route handlers
- `src/server/*`: business logic, authz, cron auth, email pipeline, DB auto-heal helpers
- `src/worker/email-worker.ts`: long-running polling worker for non-serverless environments

### Persistence

- `src/lib/db/schema.ts`: Drizzle schema and relations
- `drizzle/*.sql`: migrations
- Turso/libSQL in production
- SQLite/libSQL file databases in tests

## Module Map

### Auth and tenancy

Key files:

- `src/auth.ts`
- `src/server/authz.ts`
- `src/lib/db/schema.ts`

Invariants:

- Business data is scoped by `orgId`
- Auth/session data is global user data
- API routes derive org scope from session, not from request body

### CRM data

Key files:

- `src/app/api/customers/*`
- `src/app/api/leads/*`
- `src/app/api/tags/*`
- `src/app/api/segments/*`
- `src/app/api/tasks/*`

Important schema decisions now enforced:

- Org-scoped uniqueness for customer and lead emails
- Org-scoped uniqueness for tag, segment, template, signature, and custom-field names
- Unique join rows for `customer_tags`, `customer_custom_values`, and `segment_customers`
- Historical user-owned records use `onDelete: 'set null'` where ownership belongs to the org, not the employee

### Email campaign editor and UX

Key files:

- `src/app/(dashboard)/email/page.tsx`
- `src/components/email/outlook-editor.tsx`
- `src/components/email/outlook-list.tsx`
- `src/components/email/outlook-sidebar.tsx`
- `src/components/email/outlook-recipient-drawer.tsx`
- `src/components/email/recipient-preview-drawer.tsx`
- `src/components/email/campaign-recipients-drawer.tsx`

Current behavior:

- Drafts and unsent campaigns use live recipient preview
- Sent/sending/failed campaigns use stored delivery snapshots
- Sent and sending campaigns are action-locked in the UI
- Campaign duplication now clones the full campaign payload, not just name/subject

### Email delivery pipeline

Key files:

- `src/app/api/campaigns/[id]/send/route.ts`
- `src/app/api/campaigns/[id]/retry/route.ts`
- `src/app/api/cron/email-jobs/route.ts`
- `src/server/email/job-queue.ts`
- `src/server/email/process-jobs.ts`
- `src/server/email/recipients.ts`
- `src/server/email/transport.ts`
- `src/server/email/smtp.ts`
- `src/server/email/assets.ts`
- `src/server/email/tracking.ts`

Flow:

1. Campaign is created or edited through `/api/campaigns`
2. Send/schedule hits `/api/campaigns/[id]/send`
3. `enqueueCampaignSend` performs preflight and inserts an `email_jobs` row
4. Cron or worker claims due jobs
5. `processDueEmailJobs` snapshots recipients, builds job items, personalizes content, injects tracking, and sends through SMTP
6. Campaign status and per-recipient delivery state are updated in DB

Important safety invariants now in code:

- Empty recipient selection is not treated as “all customers”
- Send preflight rejects campaigns with no explicit selection
- Send preflight rejects campaigns whose selection resolves to zero valid recipient emails
- Sent and sending campaigns are immutable at the API layer

### Assets and attachments

Key files:

- `src/app/api/email/assets/upload/route.ts`
- `src/server/email/assets.ts`

Behavior:

- Assets are stored in Vercel Blob
- Campaign-to-asset linkage is stored in DB
- Inline images can be embedded as CID or referenced by URL
- Orphan cleanup runs from the cron path when enabled

## Dependency Inventory

### Core runtime

- `next@16.1.6`
- `react@19.2.4`
- `react-dom@19.2.4`

### Database/auth

- `drizzle-orm@0.45.1`
- `@libsql/client@0.17.0`
- `drizzle-kit@0.31.9`
- `next-auth@5.0.0-beta.30`
- `@auth/drizzle-adapter@1.11.1`

### Email

- `nodemailer@7.0.7`
- `@vercel/blob@2.2.0`

### UI/state

- `lucide-react`
- `swr`
- `zustand`
- `react-hook-form`
- `framer-motion`
- `recharts`
- `@ckeditor/ckeditor5-react`
- `ckeditor5`
- `@xyflow/react`

### Validation/testing/tooling

- `zod`
- `vitest`
- `@playwright/test`
- `typescript`
- `eslint`

## Production Dependencies

Minimum required configuration for the email system:

- `DATABASE_URL`
- `DATABASE_AUTH_TOKEN`
- `AUTH_SECRET` or `NEXTAUTH_SECRET`
- `CRON_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM` recommended
- `EMAIL_TRACKING_SECRET`

Optional but production-relevant:

- `BLOB_READ_WRITE_TOKEN`
- `EMAIL_CRON_TIME_BUDGET_MS`
- `EMAIL_CRON_MAX_JOBS`
- `EMAIL_JOB_MAX_ITEMS_PER_RUN`
- `EMAIL_JOB_CONCURRENCY`
- `EMAIL_JOB_LOCK_TIMEOUT_MS`
- `EMAIL_ASSET_CLEANUP_*`

## Current Reliability Posture

Strong:

- DB-backed email queue with claim/recovery logic
- Cron and worker execution models both supported
- Recipient de-duplication by normalized email
- Org-scoped suppression/unsubscribe checks during selection
- Schema hardening around uniqueness and historical foreign keys
- Fast-fail send preflight before queue insertion

Still inherently external:

- SMTP availability
- DNS/MX correctness of recipient domains
- Remote mailbox acceptance
- Spam filtering, throttling, and reputation

No application can guarantee that every email will be delivered every time. The correct target is: fail safely, make failures explicit, preserve history, and make retries/operator decisions deterministic.

## Validation Commands

The local environment in this workspace does not have `node` on PATH by default. The working binaries are under:

- `C:\Users\Stelios\AppData\Local\nvm\v24.11.1\`

Useful commands:

```bat
C:\Users\Stelios\AppData\Local\nvm\v24.11.1\npm.cmd run typecheck
C:\Users\Stelios\AppData\Local\nvm\v24.11.1\npm.cmd run lint
C:\Users\Stelios\AppData\Local\nvm\v24.11.1\npm.cmd test -- --runInBand
C:\Users\Stelios\AppData\Local\nvm\v24.11.1\npm.cmd run build
```

Local development currently defaults to webpack via `npm run dev` because CKEditor/Turbopack compatibility is still under investigation. Use `npm run dev:turbo` only to reproduce or debug that issue.

## Files To Read First For Email Incidents

1. `src/server/email/job-queue.ts`
2. `src/server/email/process-jobs.ts`
3. `src/server/email/recipients.ts`
4. `src/server/email/smtp.ts`
5. `src/app/api/campaigns/[id]/send/route.ts`
6. `src/app/api/campaigns/[id]/retry/route.ts`
7. `src/app/api/cron/email-jobs/route.ts`
8. `src/components/email/*drawer*.tsx`
