# Operations Runbook

## Goals
- Keep production availability high.
- Detect regressions before deploy.
- Recover quickly with a known rollback path.

## Pre-merge Gates
- Required checks in CI:
  - `npm run quality:lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
  - `npm run quality:react-doctor`
- Require CODEOWNER review for:
  - `src/app/api/**`
  - `src/lib/db/**`
  - `drizzle/**`
  - `src/auth.ts`

## Release Checklist
1. Confirm `main` is green in GitHub Actions.
2. Confirm no high/critical vulnerabilities (`npm run audit:gate`).
3. Deploy to preview and run smoke flow:
   - Login
   - Customers list + create + edit
   - Email compose + send test
   - `/api/health`
4. Promote to production.

## Incident Triage
1. Check uptime and error rate first.
2. Hit `/api/health` and verify DB/auth/required env state.
3. Check recent deploy + merged PRs.
4. Roll back if customer impact is ongoing.
5. Open incident issue with timeline + root cause + follow-up actions.

## Rollback
1. Re-deploy previous stable Vercel build.
2. If schema changed, validate backward compatibility before rollback.
3. Re-run smoke checklist after rollback.

## Weekly Maintenance
- Review open warnings against `quality/quality-budgets.json`.
- Reduce warning budgets when warning count drops.
- Rotate secrets and validate `.env.example` parity with production requirements.
- Review dependency upgrades and security alerts.
