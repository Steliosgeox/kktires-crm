# Email Hardening + Recipient List Drawer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 7 confirmed bugs in the email system and add a slide-over drawer that shows recipients for sent/sending campaigns with copy-to-clipboard support.

**Architecture:** Bug fixes are surgical edits to existing files; the new UI is a single new `CampaignRecipientsDrawer` component wired into the existing `OutlookEditor` recipient-count badge. No DB migrations needed — all required columns already exist.

**Tech Stack:** Next.js 15 App Router, TypeScript, Drizzle ORM, Turso/LibSQL, React, Tailwind CSS, existing glass-card UI primitives, `npm run lint` + `npm run typecheck` + `npm run test` for validation.

---

## Task 1: Fix `campaign-analytics.tsx` — stats always null (Bug 1 + Bug 7)

**Files:**
- Modify: `src/components/email/campaign-analytics.tsx:65-66` (wrong `data.campaign`) and lines 106-110 (fake device breakdown)

**Step 1: Fix the stats fetch — `data.campaign` → `data`**

In `campaign-analytics.tsx`, find the block:
```ts
if (statsRes.ok) {
  const data = await statsRes.json();
  setStats(data.campaign);   // ← WRONG: API returns campaign fields at root
}
```
Change to:
```ts
if (statsRes.ok) {
  const data = await statsRes.json();
  setStats(data);
}
```

**Step 2: Remove the hardcoded device breakdown**

Lines 106-110 define fake data:
```ts
const deviceBreakdown = {
  desktop: 45,
  mobile: 48,
  tablet: 7,
};
```
Remove the entire `deviceBreakdown` object and the entire "Device Breakdown" `<GlassCard>` block (the `<div className="grid gap-6 md:grid-cols-2">` section containing Monitor/Smartphone/Globe bars). Replace that grid with just the "Best Time to Send" card rendered full-width (remove the outer two-column grid, keep only the `bestHour` card).

**Step 3: Typecheck**
```bash
npm run typecheck
```
Expected: 0 errors

**Step 4: Commit**
```bash
git add src/components/email/campaign-analytics.tsx
git commit -m "fix(email): analytics stats always null + remove fake device breakdown"
```

---

## Task 2: Fix `finalizeCampaignIfDone` — bounceCount never updated (Bug 2)

**Files:**
- Modify: `src/server/email/process-jobs.ts:246-289`

**Step 1: Understand current code**

`finalizeCampaignIfDone` currently sets `sentCount` and `totalRecipients` but never `bounceCount`. It queries `failed` recipient count but only uses it for logging.

**Step 2: Add bounceCount to the campaign update**

Find the `db.update(emailCampaigns).set({...})` call in `finalizeCampaignIfDone`. Change it from:
```ts
await db
  .update(emailCampaigns)
  .set({
    status,
    sentAt: now,
    totalRecipients: total,
    sentCount: sent,
    updatedAt: now,
  })
  .where(eq(emailCampaigns.id, job.campaignId))
  .catch(() => undefined);
```
To:
```ts
await db
  .update(emailCampaigns)
  .set({
    status,
    sentAt: now,
    totalRecipients: total,
    sentCount: sent,
    bounceCount: failed,   // ← add this line
    updatedAt: now,
  })
  .where(eq(emailCampaigns.id, job.campaignId))
  .catch(() => undefined);
```

**Step 3: Typecheck**
```bash
npm run typecheck
```
Expected: 0 errors

**Step 4: Commit**
```bash
git add src/server/email/process-jobs.ts
git commit -m "fix(email): bounceCount never written on campaign finalization"
```

---

## Task 3: Fix `retry/route.ts` — N+1 inserts + no active-job guard (Bugs 3 + 4)

**Files:**
- Modify: `src/app/api/campaigns/[id]/retry/route.ts`

**Step 1: Add active-job guard before creating a new retry job**

After the `failedRecipients` query (line ~48), before resetting recipients, add:
```ts
// Guard: do not create a second job if one is already active
const activeJob = await db.query.emailJobs.findFirst({
  where: (j, { and: wa, eq: we, inArray: wi }) =>
    wa(we(j.campaignId, campaignId), wi(j.status, ['queued', 'processing'])),
});
if (activeJob) {
  return NextResponse.json({
    message: 'A job is already active for this campaign',
    jobId: activeJob.id,
    failedCount: failedRecipients.length,
    requestId,
  });
}
```

**Step 2: Replace the N+1 loop with a batched insert**

Remove the entire `for (const recipient of failedRecipients)` loop. Replace with:
```ts
// Batch insert job items (100 per transaction chunk to stay within SQLite param limits)
const itemRows = failedRecipients.map((recipient) => ({
  id: `ji_${nanoid()}`,
  jobId,
  campaignId,
  recipientId: recipient.id,
  status: 'pending' as const,
  sentAt: null,
  errorMessage: null,
  createdAt: now,
  updatedAt: now,
}));

await db.transaction(async (tx) => {
  for (let i = 0; i < itemRows.length; i += 100) {
    await tx.insert(emailJobItems).values(itemRows.slice(i, i + 100));
  }
});
```

**Step 3: Typecheck**
```bash
npm run typecheck
```
Expected: 0 errors

**Step 4: Commit**
```bash
git add src/app/api/campaigns/[id]/retry/route.ts
git commit -m "fix(email): retry route — batch inserts + guard against duplicate active job"
```

---

## Task 4: Fix `auto-heal.ts` — campaign_recipients not covered (Bug 5)

**Files:**
- Modify: `src/server/db/auto-heal.ts`

**Step 1: Add `CAMPAIGN_RECIPIENTS_COLUMNS` constant**

After the existing `CAMPAIGN_ASSETS_COLUMNS` constant (around line 134), add:
```ts
const CAMPAIGN_RECIPIENTS_COLUMNS: ColumnDef[] = [
  { name: 'id', type: 'text' },
  { name: 'campaign_id', type: 'text' },
  { name: 'customer_id', type: 'text' },
  { name: 'email', type: 'text' },
  { name: 'recipient_source', type: 'text', defaultValue: "'customer'" },
  { name: 'display_name', type: 'text' },
  { name: 'status', type: 'text', defaultValue: "'pending'" },
  { name: 'sent_at', type: 'integer' },
  { name: 'error_message', type: 'text' },
  { name: 'failure_category', type: 'text' },
  { name: 'failure_reason_detailed', type: 'text' },
  { name: 'bounce_type', type: 'text' },
  { name: 'attempt_count', type: 'integer', defaultValue: '0' },
  { name: 'last_attempt_at', type: 'integer' },
  { name: 'next_retry_at', type: 'integer' },
  { name: 'mx_valid', type: 'integer' },
  { name: 'dns_checked_at', type: 'integer' },
  { name: 'email_normalized', type: 'text' },
  { name: 'domain', type: 'text' },
];
```

**Step 2: Add `campaign_recipients` to `healEmailCampaignSchema`**

In the `healEmailCampaignSchema` function, add the campaign_recipients heal call. After the `email_campaigns` heal call, add:
```ts
// campaign_recipients — add any missing columns (e.g. recipient_source, display_name from migration 0009)
actions.push(...await addMissingColumns('campaign_recipients', CAMPAIGN_RECIPIENTS_COLUMNS));
```

**Step 3: Typecheck**
```bash
npm run typecheck
```
Expected: 0 errors

**Step 4: Commit**
```bash
git add src/server/db/auto-heal.ts
git commit -m "fix(email): auto-heal now covers campaign_recipients columns"
```

---

## Task 5: Fix recipients API — missing `displayName` for manual recipients (Bug 6)

**Files:**
- Modify: `src/app/api/campaigns/[id]/recipients/route.ts:60-80`

**Step 1: Add `displayName` to the select and return a computed `name` field**

Find the `db.select({...})` call. Add `displayName: campaignRecipients.displayName` to the select fields:
```ts
const recipients = await db
  .select({
    id: campaignRecipients.id,
    email: campaignRecipients.email,
    displayName: campaignRecipients.displayName,   // ← add
    status: campaignRecipients.status,
    errorMessage: campaignRecipients.errorMessage,
    sentAt: campaignRecipients.sentAt,
    customerId: campaignRecipients.customerId,
    firstName: customers.firstName,
    lastName: customers.lastName,
    company: customers.company,
  })
  .from(campaignRecipients)
  .leftJoin(customers, eq(customers.id, campaignRecipients.customerId))
  .where(and(...conditions))
  .limit(limit);
```

Then, before the `return NextResponse.json(...)`, compute a resolved `name` for each recipient:
```ts
const resolvedRecipients = recipients.map((r) => ({
  ...r,
  name:
    r.firstName && r.lastName
      ? `${r.firstName} ${r.lastName}`.trim()
      : r.firstName || r.displayName || null,
}));
```

And return `resolvedRecipients` instead of `recipients`:
```ts
return NextResponse.json({
  campaignId,
  campaignName: campaign.name,
  campaignStatus: campaign.status,
  summary,
  recipients: resolvedRecipients,
  requestId,
});
```

**Step 2: Typecheck**
```bash
npm run typecheck
```
Expected: 0 errors

**Step 3: Commit**
```bash
git add src/app/api/campaigns/[id]/recipients/route.ts
git commit -m "fix(email): recipients API now includes displayName for manual recipients"
```

---

## Task 6: Build `CampaignRecipientsDrawer` component

**Files:**
- Create: `src/components/email/campaign-recipients-drawer.tsx`

**Step 1: Create the component**

```tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Copy, Check, Users, Search, Loader2 } from 'lucide-react';
import { toast } from '@/lib/stores/ui-store';

interface Recipient {
  id: string;
  email: string;
  name: string | null;
  status: 'pending' | 'sent' | 'failed' | 'bounced';
  sentAt: string | null;
  errorMessage: string | null;
}

interface RecipientSummary {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  bounced: number;
}

interface CampaignRecipientsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName: string;
}

type StatusFilter = 'all' | 'sent' | 'failed' | 'pending' | 'bounced';

export function CampaignRecipientsDrawer({
  isOpen,
  onClose,
  campaignId,
  campaignName,
}: CampaignRecipientsDrawerProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [summary, setSummary] = useState<RecipientSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !campaignId) return;
    setLoading(true);
    setError(null);
    setRecipients([]);
    setSummary(null);
    setStatusFilter('all');
    setSearch('');

    fetch(`/api/campaigns/${campaignId}/recipients?limit=500`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((data) => {
        setRecipients(data.recipients || []);
        setSummary(data.summary || null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Αποτυχία φόρτωσης παραληπτών');
      })
      .finally(() => setLoading(false));
  }, [isOpen, campaignId]);

  const filtered = useMemo(() => {
    let list = recipients;
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.email.toLowerCase().includes(q) ||
          (r.name && r.name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [recipients, statusFilter, search]);

  const handleCopy = async () => {
    const emails = filtered.map((r) => r.email).join(', ');
    try {
      await navigator.clipboard.writeText(emails);
      setCopied(true);
      toast.success('Αντιγράφηκαν', `${filtered.length} email αντιγράφηκαν`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Αποτυχία', 'Δεν ήταν δυνατή η αντιγραφή');
    }
  };

  const statusLabel: Record<StatusFilter, string> = {
    all: 'Όλοι',
    sent: 'Εστάλησαν',
    failed: 'Αποτυχία',
    pending: 'Αναμονή',
    bounced: 'Bounce',
  };

  const statusColor: Record<string, string> = {
    sent: 'text-emerald-400 bg-emerald-500/10',
    failed: 'text-red-400 bg-red-500/10',
    pending: 'text-amber-400 bg-amber-500/10',
    bounced: 'text-orange-400 bg-orange-500/10',
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg z-50 flex flex-col shadow-2xl"
        style={{ background: 'var(--outlook-bg, #1a1a2e)', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-400" />
            <div>
              <p className="text-sm font-semibold text-white">Παραλήπτες</p>
              <p className="text-xs text-white/40 truncate max-w-[200px]">{campaignName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {filtered.length > 0 && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ background: 'rgba(6,182,212,0.12)', color: '#22d3ee' }}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Αντιγράφηκε!' : `Αντιγραφή ${filtered.length}`}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Summary pills */}
        {summary && (
          <div className="flex gap-2 px-5 py-3 border-b border-white/[0.05] flex-wrap">
            {([['all', 'Όλοι', summary.total, 'text-white/60'],
               ['sent', 'Εστάλησαν', summary.sent, 'text-emerald-400'],
               ['failed', 'Αποτυχία', summary.failed, 'text-red-400'],
               ['pending', 'Αναμονή', summary.pending, 'text-amber-400'],
               ['bounced', 'Bounce', summary.bounced, 'text-orange-400'],
            ] as [StatusFilter, string, number, string][])
              .filter(([, , count]) => count > 0 || _ === 'all')
              .map(([key, label, count, color]) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                    statusFilter === key
                      ? 'border-white/20 bg-white/[0.08]'
                      : 'border-transparent hover:bg-white/[0.04]'
                  } ${color}`}
                >
                  <span>{label}</span>
                  <span className="opacity-70">{count}</span>
                </button>
              ))}
          </div>
        )}

        {/* Search */}
        <div className="px-5 py-3 border-b border-white/[0.05]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <input
              type="text"
              placeholder="Αναζήτηση email ή ονόματος..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-white placeholder-white/30 outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 text-cyan-400 animate-spin" />
            </div>
          )}

          {error && !loading && (
            <div className="px-5 py-8 text-center text-red-400 text-sm">{error}</div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="px-5 py-12 text-center text-white/30 text-sm">
              {search || statusFilter !== 'all' ? 'Δεν βρέθηκαν αποτελέσματα' : 'Δεν υπάρχουν παραλήπτες'}
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <ul className="divide-y divide-white/[0.04]">
              {filtered.map((r) => (
                <li key={r.id} className="flex items-start gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex-1 min-w-0">
                    {r.name && (
                      <p className="text-sm font-medium text-white truncate">{r.name}</p>
                    )}
                    <p className={`text-xs truncate ${r.name ? 'text-white/50' : 'text-sm text-white'}`}>
                      {r.email}
                    </p>
                    {r.errorMessage && (
                      <p className="text-xs text-red-400/70 mt-0.5 truncate" title={r.errorMessage}>
                        {r.errorMessage}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[r.status] || 'text-white/50 bg-white/5'}`}>
                      {statusLabel[r.status as StatusFilter] || r.status}
                    </span>
                    {r.sentAt && (
                      <span className="text-[10px] text-white/30">
                        {new Date(r.sentAt).toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-white/[0.05] text-xs text-white/30 text-center">
            {filtered.length} από {recipients.length} παραλήπτες
          </div>
        )}
      </div>
    </>
  );
}
```

**Note:** The `_ === 'all'` reference in the filter above is a bug in the plan template — in the actual JSX, remove the `.filter` and just render all 5 pills (zero counts render naturally as small numbers). The corrected filter call is:
```ts
.filter(([key, , count]) => count > 0 || key === 'all')
```

**Step 2: Typecheck**
```bash
npm run typecheck
```
Expected: 0 errors

**Step 3: Commit**
```bash
git add src/components/email/campaign-recipients-drawer.tsx
git commit -m "feat(email): add CampaignRecipientsDrawer component"
```

---

## Task 7: Wire the drawer into OutlookEditor + email/page.tsx

**Files:**
- Modify: `src/components/email/outlook-editor.tsx` (add prop + recipient-count badge click)
- Modify: `src/app/(dashboard)/email/page.tsx` (add drawer state + render)

### Part A: OutlookEditor

**Step 1: Add prop to interface**

In `OutlookEditorProps` (around line 67), add:
```ts
onOpenRecipientsDrawer?: () => void;
campaignStatus?: string | null;
```

**Step 2: Destructure the prop**

In the function signature, add `onOpenRecipientsDrawer` and `campaignStatus` to the destructured props.

**Step 3: Make recipient count badge clickable for sent/sending/failed campaigns**

Find the JSX where `totalRecipients` (or `recipientCount`) is displayed as a number near the recipient filter section. The badge currently looks something like:
```tsx
<span>{totalRecipients} παραλήπτες</span>
```

Wrap it in a button when the campaign has been sent/sending/failed:
```tsx
{onOpenRecipientsDrawer && ['sent', 'sending', 'failed'].includes(campaignStatus || '') ? (
  <button
    type="button"
    onClick={onOpenRecipientsDrawer}
    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-xs underline-offset-2 hover:underline transition-colors"
    title="Δείτε τη λίστα παραληπτών"
  >
    <Users className="h-3.5 w-3.5" />
    {totalRecipients} παραλήπτες
  </button>
) : (
  <span className="text-xs text-white/40">{totalRecipients} παραλήπτες</span>
)}
```

Import `Users` from lucide-react at the top if not already imported.

### Part B: email/page.tsx

**Step 1: Add state for the recipients drawer**

After the existing `showRecipientDrawer` state (line ~99), add:
```ts
const [showRecipientsViewDrawer, setShowRecipientsViewDrawer] = useState(false);
```

**Step 2: Derive the selected campaign's status**

```ts
const selectedCampaign = useMemo(
  () => campaigns.find((c) => c.id === selectedCampaignId) ?? null,
  [campaigns, selectedCampaignId]
);
```

**Step 3: Pass props to OutlookEditor**

Add to the `<OutlookEditor ... />` JSX:
```tsx
onOpenRecipientsDrawer={
  selectedCampaignId && ['sent', 'sending', 'failed'].includes(selectedCampaign?.status || '')
    ? () => setShowRecipientsViewDrawer(true)
    : undefined
}
campaignStatus={selectedCampaign?.status ?? null}
```

**Step 4: Import and render `CampaignRecipientsDrawer`**

Add import:
```ts
import { CampaignRecipientsDrawer } from '@/components/email/campaign-recipients-drawer';
```

Add the drawer after the existing `<OutlookRecipientDrawer ... />`:
```tsx
{selectedCampaignId && (
  <CampaignRecipientsDrawer
    isOpen={showRecipientsViewDrawer}
    onClose={() => setShowRecipientsViewDrawer(false)}
    campaignId={selectedCampaignId}
    campaignName={campaignName}
  />
)}
```

**Step 5: Typecheck**
```bash
npm run typecheck
```
Expected: 0 errors

**Step 6: Lint**
```bash
npm run lint
```
Expected: 0 errors

**Step 7: Commit**
```bash
git add src/components/email/campaign-recipients-drawer.tsx \
        src/components/email/outlook-editor.tsx \
        src/app/\(dashboard\)/email/page.tsx
git commit -m "feat(email): wire CampaignRecipientsDrawer into email page — click recipient count to view list"
```

---

## Task 8: Triple-validate and push

**Step 1: Full validation suite**
```bash
npm run lint && npm run typecheck && npm run test
```
Expected: lint 0 errors, tsc 0 errors, 3 pre-existing test failures (DB not available in test env — documented in MEMORY.md), all others pass.

**Step 2: Push to main**
```bash
git push
```

**Step 3: Verify Vercel deployment**

Check the Vercel dashboard that the build succeeds. The migration guard (`assertNoBrokenFkReferences`) runs on deploy — confirm no FK errors in build logs.

---

## Summary of Changes

| Task | Files | Type |
|------|-------|------|
| 1 | `campaign-analytics.tsx` | Bug fix (P1) |
| 2 | `process-jobs.ts` | Bug fix (P1) |
| 3 | `retry/route.ts` | Bug fix (P2) |
| 4 | `auto-heal.ts` | Bug fix (P2) |
| 5 | `recipients/route.ts` | Bug fix (P2) |
| 6 | `campaign-recipients-drawer.tsx` | New component |
| 7 | `outlook-editor.tsx`, `email/page.tsx` | Feature wiring |
| 8 | — | Validation + push |
