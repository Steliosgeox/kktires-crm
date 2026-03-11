# Frontend Refactor Plan

Last updated: 2026-03-10

This plan is based on:

- direct code review of the current frontend
- the current architecture docs
- recent email/campaign hardening work
- current `react-doctor` output

It is intentionally practical and ordered by risk and user impact.

## Audit Principles

The goal is not “change everything.” The goal is:

1. remove UI that lies to the user
2. fix interaction paths that can silently fail or confuse
3. reduce fragile component complexity
4. unify duplicated frontend patterns
5. only then do polish and cleanup

## Priority 0: Email UI Safety And Trust

These are the first frontend changes to make.

### 1. Refactor the email editor shell

Files:

- `src/components/email/outlook-editor.tsx`
- `src/app/(dashboard)/email/page.tsx`

Why:

- `outlook-editor.tsx` is very large and mixes recipient summary, scheduling, asset management, AI helpers, preview, inline image editing, signature selection, and send/save actions in one component.
- It now depends on a restored CKEditor integration, but parent-driven HTML mutation for inline images and editor orchestration is still complex and hard to validate.
- It still uses `dangerouslySetInnerHTML` for preview rendering.

Concrete refactor:

- Split into focused subcomponents:
  - `CampaignHeaderFields`
  - `CampaignRecipientsSummary`
  - `CampaignToolbar`
  - `CampaignAssetsBar`
  - `CampaignPreviewPane`
  - `CampaignSignaturePicker`
  - `CampaignSendActions`
- Move editor state transitions into a reducer so save/send/schedule/preview/image-edit state is not scattered.
- Centralize all “actions locked” logic in one selector so sent/sending campaigns cannot drift into partially enabled UI states.

What-if risk today:

- a future tweak to one button can accidentally re-enable an action for sent or sending campaigns
- editor-only bugs are hard to isolate because the component owns too much unrelated state

### 2. Make list actions keyboard-safe and mobile-safe

Files:

- `src/components/email/outlook-list.tsx`
- `src/components/email/outlook-layout.tsx`

Why:

- `outlook-list.tsx` uses clickable `div` rows and hover-only actions.
- The context menu is positioned from raw mouse coordinates and can render off-screen.
- The resize handle in `outlook-layout.tsx` is mouse-only and uses a hardcoded sidebar width.

Concrete refactor:

- Replace clickable row `div`s with semantic `button` or `article + button` structure.
- Replace the ad hoc context menu with a positioned menu component that clamps to viewport.
- Provide visible non-hover actions on smaller screens.
- Replace the hardcoded `240` sidebar width in `outlook-layout.tsx` with the same source of truth as the CSS variable.
- Add touch support or a mobile fallback for the resizable list.

What-if risk today:

- actions are effectively hidden on touch devices
- keyboard users cannot operate the list cleanly
- context menu can appear partially outside the viewport

### 3. Finish the recipient UX normalization

Files:

- `src/components/email/outlook-recipient-drawer.tsx`
- `src/components/email/recipient-preview-drawer.tsx`
- `src/components/email/campaign-recipients-drawer.tsx`
- `src/app/api/recipients/count/route.ts`
- `src/app/api/recipients/preview/route.ts`

Why:

- the count mismatch is now explained correctly, but the UI still depends on the user understanding the difference between selected records and unique delivery emails
- the selector and preview are still separate mental models

Concrete refactor:

- Add a single “selection summary” block shared across the selector and preview:
  - selected customers
  - selected customers without email
  - duplicate customer emails
  - manual emails
  - final unique delivery emails
- Add an always-visible preview CTA next to the selected-recipient count, not only in drawers.
- Add explicit empty states in Greek for:
  - no selected recipients
  - selected recipients but zero valid emails
  - duplicates collapsing the send count

What-if risk today:

- users still think “selected count” and “actual delivery count” are supposed to be identical

### 4. Remove or formalize legacy email UI paths

Files:

- `src/components/email/recipient-selector.tsx`
- `src/components/email/rich-text-editor.tsx`
- `src/components/email/campaign-analytics.tsx`

Why:

- these files are currently reported as unused and represent alternate UX patterns for the same domain
- unused email UI creates maintenance confusion and raises the chance of fixing the wrong component

Concrete refactor:

- either delete them if truly dead
- or document exactly where they belong and wire them in intentionally

Rule:

- if a component is not routed or imported by production UI, it should not stay in the email feature folder indefinitely

## Priority 1: Remove Fake UI And Stubbed Actions

These are high-trust problems across the app.

### 5. Replace disabled “Not implemented yet” actions

Files:

- `src/app/(dashboard)/tasks/page.tsx`
- `src/app/(dashboard)/leads/page.tsx`
- `src/app/(dashboard)/map/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`

Known examples:

- disabled filter buttons in tasks, leads, and map
- disabled photo/API key/export/delete-account actions in settings

Why:

- disabled controls shown as if they are real product features reduce trust
- users cannot tell whether the feature is intentionally unavailable, permission-gated, or broken

Concrete refactor:

- choose one of three outcomes for each stub:
  - implement it
  - hide it
  - replace it with an explicit “coming soon” informational panel, not a dead button

Rule:

- no production screen should expose a dead action without explanatory UI

### 6. Normalize integrations UX

File:

- `src/app/(dashboard)/settings/page.tsx`

Why:

- Gmail has real behavior
- Google Calendar and Maps are displayed as integrations but are marked disabled
- API keys are shown but not implemented

Concrete refactor:

- split “active integrations” from “future integrations”
- stop rendering inactive integrations as actionable rows if they are not actually supported
- remove `any` casts in integration rendering and type the integration model properly

## Priority 2: Fix Rendering, Navigation, And Accessibility Debt

### 7. Wrap `useSearchParams` pages in local Suspense boundaries

Files:

- `src/app/login/page.tsx`
- `src/app/(dashboard)/customers/page.tsx`
- `src/app/(dashboard)/leads/page.tsx`
- `src/app/(dashboard)/tasks/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`

Why:

- current pages bail to client rendering more than necessary
- this is a real rendering quality issue, not just style advice

### 8. Replace client-redirect effects where possible

Files:

- `src/app/login/page.tsx`
- `src/app/(dashboard)/customers/page.tsx`
- `src/app/(dashboard)/leads/page.tsx`
- `src/app/(dashboard)/tasks/page.tsx`

Why:

- redirecting from effects creates visible UI churn and race-y transitions

### 9. Fix form accessibility in high-use flows

Files:

- `src/components/email/outlook-editor.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/customers/page.tsx`
- `src/app/(dashboard)/leads/page.tsx`
- `src/app/(dashboard)/tasks/page.tsx`
- `src/components/email/template-builder.tsx`

Why:

- several controls still do not have proper label association
- this affects keyboard, screen reader, and test reliability

## Priority 3: Simplify Large Feature Pages

### 10. Break down oversized dashboard pages

High-value targets:

- `src/app/(dashboard)/email/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/customers/page.tsx`
- `src/app/(dashboard)/leads/page.tsx`
- `src/app/(dashboard)/tasks/page.tsx`
- `src/app/(dashboard)/map/page.tsx`

Why:

- these pages hold too much state and too many responsibilities
- future bugs become harder to localize

Concrete refactor pattern:

- page-level container
- data hooks
- pure presentational sections
- typed action handlers
- explicit loading/error/empty states per section

## Priority 4: Template And Automation Builders

### 11. Harden template builder

Files:

- `src/app/(dashboard)/email/templates/new/page.tsx`
- `src/components/email/template-builder.tsx`

Why:

- current builder uses broad `any` shapes
- HTML generation is separate from the main email composer model
- this creates a second email authoring system with different capabilities and different safety expectations

Concrete refactor:

- define a typed template block schema
- sanitize block content before HTML generation
- decide whether this builder is strategic or temporary
- if strategic, share asset/signature/preview conventions with the main composer

### 12. Harden automation builder

Files:

- `src/app/(dashboard)/email/automations/page.tsx`
- `src/components/email/automation-builder.tsx`

Why:

- current save path still uses `any[]`
- automation UX should not go to production with loosely typed node data and minimal failure feedback

## Priority 5: Dead Code, Consistency, And Hygiene

### 13. Remove unused files and exports in deliberate passes

Examples already surfaced:

- unused email components
- unused helper files and exports reported by `react-doctor`

Rule:

- remove dead code in small reviewed batches
- do not combine dead-code deletion with behavior refactors in the same PR

### 14. Standardize shared interaction patterns

Cross-app conventions to enforce:

- no hover-only critical actions
- no non-semantic clickable containers
- consistent empty state language in Greek
- consistent save/sending/loading button states
- consistent error toasts for async failures

## Delivery Plan

### Wave 1: Email UX stabilization

Scope:

- `outlook-editor`
- `outlook-list`
- `outlook-layout`
- recipient drawers
- remove or formalize legacy email UI files

Exit criteria:

- no dead controls in email flow
- keyboard-safe list interactions
- one coherent recipient mental model
- smaller editor composition

### Wave 2: Settings, Tasks, Leads, Map trust cleanup

Scope:

- remove or replace disabled stub controls
- typed integration rows
- search/filter UX cleanup

Exit criteria:

- no fake buttons on primary screens

### Wave 3: Rendering and accessibility pass

Scope:

- `useSearchParams` Suspense boundaries
- redirect cleanup
- label associations
- keyboard roles

Exit criteria:

- major React Doctor rendering/accessibility warnings reduced materially

### Wave 4: Builder consolidation

Scope:

- template builder
- automation builder
- dead email subfeatures

Exit criteria:

- one intentional story for authoring and automation, not several partial ones

## Recommended Execution Style

Do not try to refactor the whole frontend in one shot.

Use this sequence:

1. email UX and interaction safety
2. dead/stubbed controls on user-facing screens
3. accessibility and rendering cleanup
4. builder consolidation and dead-code removal

Each wave should end with:

- `typecheck`
- `lint`
- `build`
- focused Vitest coverage
- Playwright smoke coverage for touched screens

## Trust Standard

You should not trust a UI because it “looks modern.”  
You should trust it because:

- the action is real
- the state is explicit
- the counts match the actual backend behavior
- keyboard and mouse paths both work
- the component boundary is small enough to reason about
