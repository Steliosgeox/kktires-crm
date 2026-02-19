# KK Tires CRM (Next.js + NextAuth + Drizzle + Turso)

This is a Next.js App Router CRM with an Outlook-style email/campaign UI. The backend uses:

- **Auth**: NextAuth v5 (Google OAuth)
- **DB**: Drizzle ORM + SQLite/libSQL (Turso recommended for production)
- **Email sending**: SMTP only (campaign/direct send path)
- **Background sending**: **Vercel Cron** + DB-backed job queue (no long-running worker)

## Local Development

1. Create `.env.local` from `.env.example`.
2. Run migrations:
   - `npm run db:migrate`
3. Start:
   - `npm run dev`

Useful checks:
- `npm run audit:stubs` (finds dead clicks/placeholder routes/alert/confirm usage)
- `npm run lint`
- `npm run quality:lint` (fails if ESLint warning budget regresses)
- `npm run quality:react-doctor` (fails if React Doctor score/warnings regress)
- `npm run quality:gate` (lint + React Doctor budgets)
- `npm run typecheck`
- `npm test`
- `npm run baseline:collect` (captures route/test/lint/vulnerability baseline under `test-results/baseline`)
- `npm run verify:all` (baseline + lint + typecheck + unit + e2e + build + security audit gate)

Operational docs:
- `docs/operations-runbook.md`
- `docs/react-doctor-100-plan.md`

## Deploy On Vercel

### Required Environment Variables

Set these in Vercel Project Settings:

- `DATABASE_URL` (use Turso/libSQL in production, not a local file)
- `DATABASE_AUTH_TOKEN` (required for Turso)
- `NEXTAUTH_URL` (your public URL, e.g. `https://crm.example.com`)
- `NEXTAUTH_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (required for email sending)
- `BLOB_READ_WRITE_TOKEN` (required for composer image/file uploads and SMTP attachments)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (optional, only if you use Google OAuth sign-in)
- `AUTH_ALLOWED_EMAILS` (comma-separated allowlist; non-allowlisted users are denied at sign-in)
- `EMAIL_TRACKING_SECRET` (signs tracking links/pixels)
- `OAUTH_TOKEN_ENCRYPTION_KEY` (base64-encoded 32 bytes; encrypts OAuth tokens at rest)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (only if you use the Map page)
- `GOOGLE_GEOCODING_API_KEY` (recommended, server-side; used to backfill customer coordinates)

### Email Job Processing (External Scheduler)

Campaign sends are enqueued via authenticated endpoints and processed by a cron route:

- Schedule `GET /api/cron/email-jobs` every minute from an external scheduler (for example, cron-job.org).
- The processor sends emails in chunks to stay within serverless time limits.
- In production, set `CRON_SECRET` and include it in one of these ways:
- `Authorization: Bearer <CRON_SECRET>` header (preferred).
- `x-cron-secret: <CRON_SECRET>` header.
- Query string fallback: `?cron_secret=<CRON_SECRET>`.

Optional knobs:

- `EMAIL_CRON_TIME_BUDGET_MS` (default `8000`)
- `EMAIL_CRON_MAX_JOBS` (default `5`)
- `EMAIL_JOB_MAX_ITEMS_PER_RUN` (default `50`)
- `EMAIL_JOB_CONCURRENCY` (default `4`)
- `EMAIL_JOB_YIELD_DELAY_MS` (default `0`)
- `EMAIL_JOB_LOCK_TIMEOUT_MS` (default `900000` = 15 minutes)
- `EMAIL_ASSET_CLEANUP_ENABLED` (default `1`, marks orphan composer assets as deleted)
- `EMAIL_ASSET_CLEANUP_HOURS` (default `24`)
- `EMAIL_ASSET_CLEANUP_LIMIT` (default `200`)

Optional protection:

- `CRON_SECRET`: required in production for cron endpoints.

### Customer Geocoding Backfill (External Scheduler)

- Schedule `GET /api/cron/geocode-customers` hourly from the same external scheduler.
- This fills in missing `customers.latitude/longitude` via Google Geocoding (cached in `geocode_cache`).

### cron-job.org Setup (Exact)

Create two jobs:

1. Email queue processor (every minute):
- URL: `https://<your-domain>/api/cron/email-jobs?cron_secret=<CRON_SECRET>`
- Method: `GET`
- Schedule: `* * * * *`

2. Geocode backfill (hourly):
- URL: `https://<your-domain>/api/cron/geocode-customers?cron_secret=<CRON_SECRET>`
- Method: `GET`
- Schedule: `0 * * * *`

If your cron-job.org tier supports custom headers, use header auth instead of query params:
- `Authorization: Bearer <CRON_SECRET>`

## Notes

- Vercel’s filesystem is ephemeral: do not use `file:./something.db` in production.
- Tracking URLs require a correct `NEXTAUTH_URL` so links/pixels point at the deployed domain.
- If `OAUTH_TOKEN_ENCRYPTION_KEY` changes, previously stored encrypted tokens cannot be decrypted.
