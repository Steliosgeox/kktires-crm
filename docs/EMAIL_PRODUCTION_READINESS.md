# Email Production Readiness

Last updated: 2026-03-10

This document is the operational checklist and reliability map for the campaign system. It is intentionally practical.

## What The App Guarantees Now

### Recipient safety

- An empty recipient selection no longer resolves to all customers.
- Send preflight rejects campaigns with no explicit recipient selection.
- Send preflight rejects campaigns whose selection resolves to zero valid email recipients.
- Final recipient delivery uses unique normalized email addresses, not raw record count.

### Campaign state safety

- Sent and sending campaigns are locked at the API layer, not only in the UI.
- The editor still allows viewing historical content and recipients, but not mutating delivery history.
- Campaign duplication now fetches the full campaign record and clones recipients, assets, and signature selection.

### Queue safety

- Jobs are persisted in DB.
- Due jobs are claimed with locking.
- Stale `processing` jobs can be reclaimed.
- Missing recipient snapshots and missing job items are rebuilt when recoverable.
- Sent campaigns are finalized from recipient state, not only from optimistic counters.

## What The App Cannot Guarantee

These are outside application control:

- Recipient mailbox existence
- Recipient domain DNS/MX health
- SMTP provider uptime
- Remote throttling and spam reputation decisions
- User mailbox filtering after acceptance

The correct production goal is not “100% guaranteed delivery.” The correct goal is:

1. prevent accidental sends
2. fail fast when the app already knows a send is invalid
3. preserve trustworthy delivery state
4. make retries explicit and safe

## Required Production Dependencies

Must be configured:

- `DATABASE_URL`
- `DATABASE_AUTH_TOKEN`
- `CRON_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

Strongly recommended:

- `SMTP_FROM`
- `EMAIL_TRACKING_SECRET`
- `BLOB_READ_WRITE_TOKEN`

Queue tuning:

- `EMAIL_CRON_TIME_BUDGET_MS`
- `EMAIL_CRON_MAX_JOBS`
- `EMAIL_JOB_MAX_ITEMS_PER_RUN`
- `EMAIL_JOB_CONCURRENCY`
- `EMAIL_JOB_LOCK_TIMEOUT_MS`

## Required Runtime Paths

At least one of these must be running correctly:

- Vercel/serverless cron hitting `/api/cron/email-jobs`
- background worker via `npm run worker:email`

If neither runs, campaigns will queue but never progress.

## Pre-Launch Checklist

### Database

- Run migrations and confirm `Pending migrations: none`
- Confirm `email_jobs`, `email_job_items`, `campaign_recipients`, `email_assets`, and `campaign_assets` exist
- Confirm latest schema hardening migration is present in `__drizzle_migrations`

### SMTP

- Validate credentials with a real staging inbox
- Confirm `SMTP_FROM` aligns with the authenticated mailbox/domain
- Confirm SPF/DKIM/DMARC on the sending domain outside the app

### Cron/worker

- Trigger `/api/cron/email-jobs` with valid cron auth and confirm a 200 response
- Verify at least one queued job can move to `processing` and then `completed`
- Confirm stale-job recovery settings match deployment model

### UI/UX

- Draft recipient preview opens and lists actual recipients
- Sent recipient drawer can copy one-by-one and copy-all
- Recipient selector counts are understood:
  - selected customer records
  - duplicate customer emails
  - manual emails that collapse into selected customer emails
  - unique final email count for actual delivery

## Regression Tests That Matter Most

- `tests/process-jobs.test.ts`
- `tests/job-queue.test.ts`
- `tests/api.test.ts`

Most important assertions:

- empty selection does not send to all customers
- send preflight blocks invalid campaigns
- sent campaigns cannot be edited through the API

Current status on 2026-03-10:

- `tests/process-jobs.test.ts`: passing
- `tests/job-queue.test.ts`: passing
- `tests/api.test.ts`: passing

## Incident Triage Order

If a campaign “did not send”:

1. inspect `email_jobs` status
2. inspect `campaign_recipients` counts by status
3. inspect SMTP readiness/configuration
4. verify cron/worker execution
5. inspect specific failed recipient addresses and domains

If recipient counts look wrong:

1. compare selected customer count vs unique final email count
2. check duplicate customer emails
3. check manual emails already represented by selected customers
4. check customers with missing email addresses

## Current Known Non-App Risks

- The repo has older historical docs that should not be treated as the current source of truth.
- External deliverability still depends on sender-domain reputation and DNS records.
- Old production diagnostic scripts should never hold live secrets in source-controlled code or configs.
