# React Doctor 100/100 Plan

## Current Baseline
- Full-project baseline (from latest full scan): score `81`, warnings `312`, files with findings `102`.
- Current changed-files quality gate: score `97`, warnings `14`, files with findings `8`.

## Target Dates
1. **By February 26, 2026**
- Eliminate all accessibility warnings (`label` association, non-semantic click targets, autofocus misuse).
- Target full-project warnings: `<= 250`.

2. **By March 12, 2026**
- Remove all `useSearchParams`/redirect architecture warnings in route-level pages.
- Replace all index keys in UI rendering paths.
- Target full-project warnings: `<= 150`.

3. **By March 31, 2026**
- Refactor oversized pages/components (`settings`, `email`, `customers`, `map`) into smaller feature slices.
- Consolidate related state with `useReducer` where warnings indicate state coupling.
- Target full-project warnings: `<= 50`.

4. **By April 15, 2026**
- Resolve remaining dead code + unused exports/types.
- Reach `100/100` and `0 warnings`.

## Enforcement Rules
- No PR can increase:
  - ESLint warning count beyond `quality/quality-budgets.json`.
  - React Doctor warning count beyond `quality/quality-budgets.json`.
- Any warning reduction must be followed by budget tightening in the same PR.
- CODEOWNER review required for API, auth, DB, and migration changes.

## Weekly Cadence
1. Run:
- `npm run quality:gate`
- `npm run typecheck`
- `npm run build`
2. Pick top 2 warning categories by volume.
3. Merge only after warning budget is reduced.

## Ownership
- Primary owner: `@Steliosgeox` (see `.github/CODEOWNERS`).
- When new maintainers join, replace individual owner with team aliases and keep protected paths unchanged.
