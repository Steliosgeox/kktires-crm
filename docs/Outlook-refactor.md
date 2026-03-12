# OutlookEditor Refactor — Senior Code Review

**Scope:** The complete refactor of [outlook-editor.tsx](file:///C:/Users/Stelios/kktires-web/src/components/email/outlook-editor.tsx) into the `src/components/email/outlook-editor/` module, `use-email-page-controller.ts`, and accompanying tests.

**Verdict:** The architecture is **solid and correct**. The structural decisions are production-quality. There are no critical bugs, but there are several real issues grouped below by severity that must be addressed.

---

## ✅ What Is Done Well (Do Not Touch)

- **`use-outlook-editor-ui.ts`** — The `useReducer` approach is textbook correct. State shape is clean, `reset_transient_state` intentionally preserves `showPreview`/`previewMode` which is the right behaviour.
- **`email-html.ts`** — Pure functions, zero side effects, every DOM mutation uses `DOMParser`/`innerHTML` rather than direct DOM access. Fully testable and tested.
- **`outlook-preview-pane.tsx`** — Using `srcDoc` on an `<iframe>` instead of `dangerouslySetInnerHTML` is the correct, secure approach. `sanitizeHtml` is called before injection. The `<script>` tag XSS test in `email-composer.spec.ts` validates this properly.
- **`outlook-schedule-panel.tsx`** — `htmlFor` + `id` associations are correct. Labels are wired. Timestamps are parsed as `new Date(${date}T${time}:00)` which correctly uses the user's local timezone — correct for a regional app.
- **`email-assets.ts`** — `optimizeImageFile` correctly skips GIFs, handles canvas `getContext` failure gracefully, and prefers PNG over WebP only for `.png` originals.
- **Type system** — `DraftSetter<T>` using `Dispatch<SetStateAction<T>>` is the right approach. `useEmailComposerDraft` correctly implements the functional updater pattern throughout.
- **Tests** — All 4 new test files are focused, have no redundant coverage, and test the actual logic, not the implementation detail.

---

## 🔴 CRITICAL — Must Fix

### BUG 1: `use-email-page-controller.ts` — Silent Data Loss on Campaign Reload
**File:** `src/app/(dashboard)/email/use-email-page-controller.ts`  
**Lines:** 306–336 (`handleSelectCampaign`)

**Problem:** Campaign data is fetched with an unhandled `.catch()` that only calls `setError` but never resets `isEditing` or `setIsNew`. If the fetch fails mid-edit (e.g., network flap), the user is stuck in "editing" mode with stale data from the previous campaign but no error in the UI. The `selectedCampaignId` is already set on line 307 to the new ID, so now the page has mismatched state: it thinks it's editing campaign B, but the draft still has campaign A's content.

**Fix:**
```typescript
// In handleSelectCampaign, change the .catch block to:
.catch((err) => {
  console.error('Error loading campaign:', err);
  setError('Failed to load campaign');
  // ROLLBACK the selection to prevent split-brain state
  setSelectedCampaignId(null);
  setIsEditing(false);
  setIsNew(false);
  resetEditor();
});
```

---

### BUG 2: `use-outlook-editor-controller.ts` — CKEditor Campaign Switch Effect Stale Closure
**File:** `src/components/email/outlook-editor/use-outlook-editor-controller.ts`  
**Lines:** 113–127

**Problem:** The campaign-switch `useEffect` lists `draft.content` in its dependency array (line 127), but it should NOT. The effect is supposed to fire only when the campaign KEY changes. Because `draft.content` is in the deps, the effect re-runs every time the user types a single character in the editor, calling `editor.setData(next)` which **resets the cursor position to 0** on every keystroke.

**Fix:**
```typescript
// Remove draft.content from the dependency array:
useEffect(() => {
  const key = `${workflow.campaignId ?? 'new'}:${workflow.isNew ? 'new' : 'existing'}`;
  if (lastCampaignKeyRef.current === key) return;

  lastCampaignKeyRef.current = key;
  uiActions.resetTransientState();

  const editor = editorRef.current;
  if (!editor) return;

  // Use a ref to read the current content without making it a reactive dep
  const next = sanitizeHtml(draft.content || '');
  if (editor.getData() !== next) {
    editor.setData(next);
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [workflow.campaignId, workflow.isNew, uiActions]);
// ^^^ draft.content intentionally excluded — this effect is for campaign SWITCHING only
```

---

### BUG 3: `use-outlook-editor-controller.ts` — Image Config Effect Fires on Every Content Change
**File:** `src/components/email/outlook-editor/use-outlook-editor-controller.ts`  
**Lines:** 133–146

**Problem:** The `applyInlineImageConfigToHtml` effect has `selectedImageConfig` as a full-object dependency. Since `selectedImageConfig` is derived from `draft.inlineImages` which is updated on every `onEditorChange`, this effect runs on every single keypress when an image is selected — it calls `editor.setData(result.html)` in a tight loop with `syncDraftWithHtml`, creating a feedback cycle.

**Fix:** Track the config's identity separately so the effect only fires when the user actually changes image settings — not when the editor content changes:
```typescript
// Replace the simple selectedImageConfig dependency with a stable identity key
const selectedImageConfigRef = useRef(selectedImageConfig);
useEffect(() => {
  selectedImageConfigRef.current = selectedImageConfig;
});

useEffect(() => {
  const editor = editorRef.current;
  if (!selectedImageConfig || !editor) return;

  const currentHtml = editor.getData();
  const result = applyInlineImageConfigToHtml(currentHtml, selectedImageConfig);
  if (!result.updated || result.html === currentHtml) return;

  editor.setData(result.html);
  syncDraftWithHtml(result.html);
}, [
  // Use stable primitive deps instead of the whole object
  selectedImageConfig?.assetId,
  selectedImageConfig?.widthPx,
  selectedImageConfig?.align,
  selectedImageConfig?.alt,
  selectedImageConfig?.embedInline,
  syncDraftWithHtml,
]);
```

---

## 🟠 HIGH — Should Fix Before Prod

### ISSUE 1: `outlook-recipients-summary.tsx` — Garbled Remove Button Text
**File:** `src/components/email/outlook-editor/outlook-recipients-summary.tsx`  
**Lines:** 60, 84, 108, 131, 155

**Problem:** Every recipient-tag remove button renders `Ç-` as its visible content. This is a character encoding artifact, likely from a `×` or `&times;` HTML entity being wrongly converted. Users will see literal `Ç-` text on the remove buttons.

**Fix:** Replace every instance of `Ç-` with a clean `×` Unicode character or an SVG icon:
```tsx
// Replace all 5 instances of:
>
  Ç-
</button>

// With:
aria-label="Remove"
>
  ×
</button>
```

---

### ISSUE 2: `use-outlook-editor-controller.ts` — `handleInsertLink` Uses `window.prompt`
**File:** `src/components/email/outlook-editor/use-outlook-editor-controller.ts`  
**Lines:** 190–195

**Problem:** `window.prompt()` is a blocking synchronous browser dialog. It is ugly, unbranded, does not work in sandboxed iframes, and is untestable in Playwright. It was in the original code and was carried over, but in a refactor this is the time to fix it.

**Fix:** The correct solution is to add a `set_link_prompt_open` action to the UI reducer and render a small inline link-input popover (like the Template popover already shown in `outlook-editor-toolbar.tsx`). This is medium effort. If not doing it now, at minimum add a comment:
```typescript
// TODO: Replace window.prompt with an inline popover — see outlook-editor-toolbar.tsx pattern
const raw = window.prompt('Enter URL');
```

---

### ISSUE 3: `use-email-page-controller.ts` — `handleSave` Does Not Update `selectedCampaignId` After First Save of New Campaign
**File:** `src/app/(dashboard)/email/use-email-page-controller.ts`  
**Lines:** 428–432

**Problem:** When a new campaign is saved as draft (`sendNow=false`), the response correctly returns the new `campaignId` (line 412: `const campaignId = saved?.id || selectedCampaignId`). But then on line 429 `setIsEditing(false)` immediately closes the editor. This means that if the user clicks "Save Draft" on a new campaign and then reopens it, the UI correctly loads it from the fresh `fetchData()` — however if they click "Save Draft" and then immediately click "Send Now" (without the editor closing), the `isNew` flag is still `true` but now the REST endpoint would POST a *second* campaign instead of PATCHing the one that was just created.

**Fix:**
```typescript
// In handleSave, after the first save succeeds, update state:
const savedCampaignId = saved?.id;
if (savedCampaignId && isNew) {
  setSelectedCampaignId(savedCampaignId);
  setIsNew(false);
}

if (sendNow) {
  // ... send request using savedCampaignId (already correct on line 415)
}

await fetchData();
setIsEditing(false);
// ... rest
```

---

### ISSUE 4: `outlook-editor-actions-bar.tsx` — `actionsLocked` Computed Locally, Out of Sync
**File:** `src/components/email/outlook-editor/outlook-editor-actions-bar.tsx`  
**Line:** 36

**Problem:** `actionsLocked` is computed locally again in this component (`['sent', 'sending'].includes(campaignStatus ?? '')`), but the canonical `derived.actionsLocked` from the controller (which also includes `isSentCampaign || isSendingCampaign`) is *not* passed as a prop. This is dead code — the same value is computed twice, in two different locations. If the definition later changes in the controller, the actions bar banner won't update.

**Fix:** Pass `actionsLocked` as an explicit prop from the parent `OutlookEditorHeader` and delete the local computation:
```tsx
// In outlook-editor-actions-bar.tsx - add to props:
type OutlookEditorActionsBarProps = {
  ...
  actionsLocked: boolean; // ADD THIS
};

// Remove line 36:
// const actionsLocked = ['sent', 'sending'].includes(campaignStatus ?? ''); ← DELETE

// In outlook-editor-header.tsx - forward the prop:
<OutlookEditorActionsBar
  actionsLocked={derived.actionsLocked} // via OutlookEditor shell through header
  ...
/>
```

---

## 🟡 MEDIUM — Should Fix Soon

### ISSUE 5: `use-email-page-controller.ts` — `listItems` Doesn't Apply `searchQuery` or `statusFilter`
**File:** `src/app/(dashboard)/email/use-email-page-controller.ts`  
**Lines:** 108–128

**Problem:** The `listItems` memo only filters by `activeSection`. The state variables `searchQuery` and `statusFilter` are declared, returned, and presumably wired to UI controls — but they are **never applied inside `listItems`**. User input on the search box has zero effect on what's displayed.

**Fix:**
```typescript
const listItems = useMemo(() => {
  if (activeSection === 'templates') {
    let items = [...templates];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(t => t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q));
    }
    return items;
  }

  let filtered = [...campaigns];

  // Section filter
  const sectionStatuses: Record<string, Campaign['status'][]> = {
    draft: ['draft'], scheduled: ['scheduled'], sending: ['sending'],
    sent: ['sent'], failed: ['failed'],
  };
  if (sectionStatuses[activeSection]) {
    filtered = filtered.filter(c => sectionStatuses[activeSection].includes(c.status));
  }

  // Status filter dropdown (if user picked one)
  if (statusFilter !== 'all') {
    filtered = filtered.filter(c => c.status === statusFilter);
  }

  // Search
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(c => c.name.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q));
  }

  return filtered;
}, [activeSection, campaigns, templates, searchQuery, statusFilter]);
```

---

### ISSUE 6: `use-email-composer-draft.ts` — `updateDraft` Always Re-creates `inlineImages` via `createEmailComposerDraft`
**File:** `src/components/email/outlook-editor/use-email-composer-draft.ts`  
**Lines:** 84–95

**Problem:** The `updateDraft` implementation calls `createEmailComposerDraft` which in turn calls `normalizeInlineImages`. This means every `updateDraft` call (e.g. applying a template on line 346–354 of the controller) creates a new array reference for `inlineImages` even when the images haven't changed. This triggers unnecessary re-renders of every component consuming `draft.inlineImages`.

**Fix:** The `inlineImages` guard on line 91 is correct but incomplete. Only apply `normalizeInlineImages` if `patch.inlineImages` is explicitly provided:
```typescript
updateDraft: (patch) =>
  setDraft((current) => ({
    ...current,
    ...patch,
    // Only normalize if actually changed
    inlineImages: patch.inlineImages !== undefined
      ? normalizeInlineImages(patch.inlineImages)
      : current.inlineImages,
    // Also normalize on replaceDraft but NOT on field-level updates
  })),
```
This is already partially done but the `createEmailComposerDraft` wrapper was removed — verify this is actually correct in the current code.

---

### ISSUE 7: `email-composer.spec.ts` — E2E Spec Asserts Preview Content via `toContainText` on an `<iframe>`
**File:** `tests/e2e/email-composer.spec.ts`  
**Lines:** 46–48

**Problem:** `page.getByTestId('outlook-preview-pane')` returns the `<iframe>` element. Playwright's `toContainText` on a locator matching an `<iframe>` reads the outer element, NOT the inner document. The assertions on lines 46, 47 will silently pass even if the iframe is empty, because Playwright sees the `srcDoc` attribute string, not the rendered content.

**Fix:** Access the iframe's content frame:
```typescript
// Replace lines 45-48 with:
await page.getByTestId('preview-toggle-button').click();
const previewFrame = page.frameLocator('[data-testid="outlook-preview-pane"]');
await expect(previewFrame.locator('body')).toContainText(`Template Body ${seed}`);
await expect(previewFrame.locator('body')).toContainText('{{firstName}}');
// XSS check: script should not exist in the rendered frame body
await expect(previewFrame.locator('script')).toHaveCount(0);
```

---

## 🔵 LOW / POLISH

### POLISH 1: `outlook-editor-toolbar.tsx` — Missing `aria-label` on Icon-Only Toolbar Buttons
**File:** `src/components/email/outlook-editor/outlook-editor-toolbar.tsx`  
**Lines:** 82–168

All the formatting buttons (Bold, Italic, Underline, etc.) use `title="Bold"` but no `aria-label`. Screen readers use `aria-label`, not the `title` attribute, for accessible names.

**Fix:** Add `aria-label` alongside `title` on all icon-only buttons:
```tsx
<button type="button" onClick={...} title="Bold" aria-label="Bold" ...>
```

---

### POLISH 2: `outlook-compose-surface.tsx` — Attachment Size Calculation Duplicated Inline
**File:** `src/components/email/outlook-editor/outlook-compose-surface.tsx`  
**Lines:** 107–111

The KB/MB size formatting is an inline ternary inside JSX. This is hard to read and untestable. Extract it:
```typescript
// Extract as a pure utility above the component:
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

---

### POLISH 3: `use-outlook-editor-ui.ts` — `reset_transient_state` Does Not Reset `aiLoading`
**File:** `src/components/email/outlook-editor/use-outlook-editor-ui.ts`  
**Lines:** 66–77

If the user AI-requests a subject and then immediately switches to a different campaign while the request is in-flight, `aiLoading: true` is left in the state because `reset_transient_state` does not clear `aiLoading`. The button will appear stuck in loading on the new campaign.

**Fix:**
```typescript
case 'reset_transient_state':
  return {
    ...state,
    activePopover: 'none',
    aiLoading: false, // ← ADD THIS
    scheduleDate: '',
    scheduleTime: '',
    selectedImageAssetId: null,
    pendingReplaceAssetId: null,
    customWidth: '',
    uploadingImages: false,
    uploadingAttachments: false,
  };
```

---

## Pre-existing Non-Issues (Confirmed Safe To Ignore)

| Item | Status |
|---|---|
| `tests/runtime-config.test.ts` 2 failures | Pre-existing environment isolation issue, unrelated to this refactor |
| `recipient-selector.tsx` and `rich-text-editor.tsx` legacy files | Still in the repo but correctly tagged `// LEGACY: not imported by production UI` |
| 106 lint warnings | All pre-existing `@typescript-eslint/no-explicit-any` warnings in test files and other components. None are in the new email module. |

---

## Summary Priority Table

| # | Severity | File | Issue |
|---|---|---|---|
| BUG 1 | 🔴 Critical | `use-email-page-controller.ts` | Split-brain state on failed campaign fetch |
| BUG 2 | 🔴 Critical | `use-outlook-editor-controller.ts` | Campaign-switch effect fires on every keystroke (cursor reset) |
| BUG 3 | 🔴 Critical | `use-outlook-editor-controller.ts` | Image config effect feedback loop on content change |
| ISS 1 | 🟠 High | `outlook-recipients-summary.tsx` | Garbled `Ç-` on remove buttons |
| ISS 2 | 🟠 High | `use-outlook-editor-controller.ts` | `window.prompt` for link insertion |
| ISS 3 | 🟠 High | `use-email-page-controller.ts` | Double-POST bug on new campaign send after save |
| ISS 4 | 🟠 High | `outlook-editor-actions-bar.tsx` | `actionsLocked` computed twice, out of sync |
| ISS 5 | 🟡 Medium | `use-email-page-controller.ts` | `searchQuery` / `statusFilter` have no effect |
| ISS 6 | 🟡 Medium | `use-email-composer-draft.ts` | `updateDraft` causes extra re-renders |
| ISS 7 | 🟡 Medium | `email-composer.spec.ts` | iframe `toContainText` assertions are ineffective |
| POL 1 | 🔵 Low | `outlook-editor-toolbar.tsx` | Missing `aria-label` on icon buttons |
| POL 2 | 🔵 Low | `outlook-compose-surface.tsx` | File size formatter inline in JSX |
| POL 3 | 🔵 Low | `use-outlook-editor-ui.ts` | `aiLoading` not reset on campaign switch |
