# KK Tires CRM - App Audit (Reality Map)

Last updated: 2026-02-11

This document is the working inventory of what exists in the codebase today, what is wired, what is stubbed, and what "done" means for each area.

## Baseline (Current Truth)

Local commands (Windows) require Node on PATH:

```bat
set PATH=C:\Users\Stelios\AppData\Local\nvm\v24.11.1;%PATH%
```

Observed baseline status:
- `npm run lint`: passes (warnings remain; scripts are ignored; `no-explicit-any` is downgraded to warnings; `react-hooks/purity` disabled due to false positives).
- `npm run build`: compiles, but fails during Next.js data collection if `DATABASE_URL` is missing. (Local `.env.local` currently has `DATABASE_URL=`.)
- `npm test`: includes DB-backed API route tests (Settings + Lead conversion) using a migrated SQLite file under `tests/.tmp`.

CI:
- GitHub Actions workflow: `.github/workflows/ci.yml` runs migrate + lint + typecheck + unit tests + build.
- Playwright E2E: `npm run test:e2e` (requires `npx playwright install`).

## Routes (App Router)

All routes are under `src/app/(dashboard)` (the `(dashboard)` group does not appear in the URL).

Dashboard pages:
- `/` -> `src/app/(dashboard)/page.tsx`
- `/customers` -> `src/app/(dashboard)/customers/page.tsx`
- `/leads` -> `src/app/(dashboard)/leads/page.tsx`
- `/tags` -> `src/app/(dashboard)/tags/page.tsx`
- `/segments` -> `src/app/(dashboard)/segments/page.tsx`
- `/import` -> `src/app/(dashboard)/import/page.tsx`
- `/export` -> `src/app/(dashboard)/export/page.tsx`
- `/email` -> `src/app/(dashboard)/email/page.tsx`
- `/email/automations` -> `src/app/(dashboard)/email/automations/page.tsx`
- `/email/templates/new` -> `src/app/(dashboard)/email/templates/new/page.tsx`
- `/map` -> `src/app/(dashboard)/map/page.tsx`
- `/statistics` -> `src/app/(dashboard)/statistics/page.tsx`
- `/tasks` -> `src/app/(dashboard)/tasks/page.tsx`
- `/settings` -> `src/app/(dashboard)/settings/page.tsx`
- `/migrate` -> `src/app/(dashboard)/migrate/page.tsx` (admin-ish)

Auth pages:
- `/login` -> `src/app/login/...` (see `src/app/api/auth/[...nextauth]/route.ts` for Auth routes)

## API Routes (App Router)

Top-level API namespaces under `src/app/api`:
- `ai/*`
- `auth/*`
- `automations/*`
- `campaigns/*`
- `cron/*`
- `customers/*`
- `debug/*`
- `email/*`
- `health/*`
- `integrations/*`
- `leads/*`
- `migrate/*`
- `recipients/*`
- `seed/*`
- `segments/*`
- `signatures/*`
- `statistics/*`
- `tags/*`
- `tasks/*`
- `templates/*`
- `unsubscribe/*`

## Known P0 Broken/Stubbed UX

App Shell:
- Header avatar falls back to `"User"` causing wrong initials.
- Header dropdown items “Προφίλ” / “Ρυθμίσεις” were no-ops.
- Command palette used `/dashboard/...` routes which 404.
- Notifications + mobile menu toggles existed but no panel/menu was rendered.
- Theme state was duplicated across two stores, causing drift.

Settings:
- Save buttons were no-ops.
- Inputs used `defaultValue` only (no persistence).

Email:
- `/email` data fetch ignored non-OK responses (campaigns could appear as empty with no error).
- Editor content could go stale when switching campaigns.
- Toolbar buttons were clickable but did nothing.
- Outlook sidebar had tools that didn’t map to real views/routes.
- `vercel.json` cron schedule was daily, too infrequent for email job processing.

Map:
- Customers without coords would not show; no durable geocoding pipeline/backfill.

Tasks/Leads:
- CRUD incomplete; visible controls were stubs.
