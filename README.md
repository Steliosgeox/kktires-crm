# KK Tires CRM (Next.js + NextAuth + Drizzle + Turso)

This is a Next.js App Router CRM with an Outlook-style email/campaign UI. The backend uses:

- **Auth**: NextAuth v5 (Google OAuth)
- **DB**: Drizzle ORM + SQLite/libSQL (Turso recommended for production)
- **Email sending**: Gmail API (`gmail.send`) and/or SMTP (for non-Gmail mailboxes like Roundcube)
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
- `npm run typecheck`
- `npm test`

## Deploy On Vercel

### Required Environment Variables

Set these in Vercel Project Settings:

- `DATABASE_URL` (use Turso/libSQL in production, not a local file)
- `DATABASE_AUTH_TOKEN` (required for Turso)
- `NEXTAUTH_URL` (your public URL, e.g. `https://crm.example.com`)
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- (Optional, for Roundcube/webmail login + sending) `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `AUTH_ALLOWED_EMAILS` (comma-separated allowlist; non-allowlisted users are denied at sign-in)
- `EMAIL_TRACKING_SECRET` (signs tracking links/pixels)
- `OAUTH_TOKEN_ENCRYPTION_KEY` (base64-encoded 32 bytes; encrypts OAuth tokens at rest)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (only if you use the Map page)
- `GOOGLE_GEOCODING_API_KEY` (recommended, server-side; used to backfill customer coordinates)

### Email Job Processing (Vercel Cron)

Campaign sends are enqueued via authenticated endpoints and processed by a cron route:

- `vercel.json` config schedules `GET /api/cron/email-jobs` every minute.
- The processor sends emails in chunks to stay within serverless time limits.

Optional knobs:

- `EMAIL_CRON_TIME_BUDGET_MS` (default `8000`)
- `EMAIL_CRON_MAX_JOBS` (default `5`)
- `EMAIL_JOB_MAX_ITEMS_PER_RUN` (default `50`)
- `EMAIL_JOB_CONCURRENCY` (default `4`)
- `EMAIL_JOB_YIELD_DELAY_MS` (default `0`)
- `EMAIL_JOB_LOCK_TIMEOUT_MS` (default `900000` = 15 minutes)

Optional protection:

- `CRON_SECRET`: if set, `/api/cron/email-jobs` requires `Authorization: Bearer <CRON_SECRET>` (or the `x-vercel-cron` header).

### Customer Geocoding Backfill (Vercel Cron)

- `vercel.json` also schedules `GET /api/cron/geocode-customers` hourly.
- This fills in missing `customers.latitude/longitude` via Google Geocoding (cached in `geocode_cache`).

## Notes

- Vercel’s filesystem is ephemeral: do not use `file:./something.db` in production.
- Tracking URLs require a correct `NEXTAUTH_URL` so links/pixels point at the deployed domain.
- If `OAUTH_TOKEN_ENCRYPTION_KEY` changes, previously stored encrypted tokens cannot be decrypted.
