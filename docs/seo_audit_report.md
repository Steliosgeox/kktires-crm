# SEO Audit Report — aerofren-next
**Reviewed by:** Senior Dev Review (Antigravity)
**Date:** 12 Μαρτίου 2026
**Verdict:** ✅ Solid foundation — 1 real bug, 3 minor issues, 3 confirmations needed from you

---

## 🔴 BUGS (must fix before push)

### BUG 1 — [sitemap.ts](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/src/app/sitemap.ts): hardcoded `baseUrl` diverges from `SITE_URL` constant
**File:** [sitemap.ts](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/src/app/sitemap.ts) — Line 15

The sitemap uses a **locally hardcoded** `"https://aerofren.gr"` string, but the rest of the codebase (layout, schemas, pages) all import `SITE_URL` from [aerofren.ts](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/src/lib/constants/aerofren.ts). If you ever change the domain, the sitemap will silently break while everything else updates correctly.

```diff
- import { RESOURCE_GUIDE_SLUGS } from "@/lib/constants/aerofren";
+ import { RESOURCE_GUIDE_SLUGS, SITE_URL } from "@/lib/constants/aerofren";

  export default function sitemap(): MetadataRoute.Sitemap {
-   const baseUrl = "https://aerofren.gr";
    ...
-     url: `${baseUrl}/products/${category.slug}`,
+     url: `${SITE_URL}/products/${category.slug}`,
    ...
-     url: baseUrl,
+     url: SITE_URL,
```
Every `baseUrl` in that file → replace with `SITE_URL`. Simple find-and-replace.

---

## 🟡 MINOR ISSUES (low risk but worth fixing)

### ISSUE 2 — [OrganizationSchema.tsx](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/src/lib/schema/OrganizationSchema.tsx): LinkedIn `sameAs` is a placeholder URL
**File:** [OrganizationSchema.tsx](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/src/lib/schema/OrganizationSchema.tsx) — Line 79

```ts
"sameAs": [
  "https://www.linkedin.com/company/aerofren",  // ← Does this page actually exist?
],
```

**Action needed from you:** Go check that this LinkedIn URL is live and real. If AEROFREN doesn't have a LinkedIn page, either create one or **remove the `sameAs` array entirely**. A broken `sameAs` URL in structured data is worse than no `sameAs` at all — Google can detect it and it hurts E-E-A-T.

```diff
- "sameAs": [
-   "https://www.linkedin.com/company/aerofren",
- ],
```

---

### ISSUE 3 — [OrganizationSchema.tsx](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/src/lib/schema/OrganizationSchema.tsx): `numberOfEmployees` range is a guess
**File:** [OrganizationSchema.tsx](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/src/lib/schema/OrganizationSchema.tsx) — Lines 73–77

```ts
"numberOfEmployees": {
  "@type": "QuantitativeValue",
  "minValue": 10,
  "maxValue": 50,
},
```

**Action needed from you:** Is this accurate? If AEROFREN is a small family business with 3–5 people, having `10–50` in the schema is factually wrong. Google cross-references this with other sources. Either correct it or remove the field.

---

### ISSUE 4 — [PersonSchema.tsx](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/src/lib/schema/PersonSchema.tsx): Founder name hardcoded (not from constants)
**File:** [PersonSchema.tsx](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/src/lib/schema/PersonSchema.tsx) — Line 8

```ts
"name": "Βασίλειος Κουτελίδης",
"alternateName": "Vassilios Koutelidis",
```

This is fine if the name is correct. **Confirm:** Is "Βασίλειος Κουτελίδης" the correct founder name, and is the English transliteration ("Vassilios" not "Vasileios") intentional? This shows up in Google's Knowledge Graph so accuracy matters. No code change needed if it's correct.

---

## ✅ CONFIRMED GOOD — No action needed

| File | What's correct |
|------|----------------|
| [aerofren.ts](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/src/lib/constants/aerofren.ts) | Perfect single source of truth. Phone E164, hours, address, IDs — all wired correctly. |
| [layout.tsx](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/src/app/layout.tsx) | `metadataBase` set, `lang="el"` correct, fake hreflang removed, `GOOGLE_SITE_VERIFICATION` via env ✅ |
| [OrganizationSchema.tsx](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/src/lib/schema/OrganizationSchema.tsx) | `@graph` structure, `GeoCoordinates`, `OpeningHoursSpecification` — all correct schema.org markup. |
| [WebsiteSchema.tsx](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/src/lib/schema/WebsiteSchema.tsx) | Clean. Removed the false `SearchAction` correctly. |
| [catalog-taxonomy.ts](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/src/data/catalog-taxonomy.ts) | Solid. Every subcategory has `seoTitle`, `seoDescription`, `canonicalPath`, `faqsEl` — good SEO structure. |
| [[category]/page.tsx](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/src/app/(main)/products/%5Bcategory%5D/page.tsx) | Canonical set, OG images correct, [generateStaticParams](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/src/app/%28main%29/products/%5Bcategory%5D/page.tsx#28-31) + `dynamicParams = false` = correct SSG. |
| [[subcategory]/page.tsx](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/src/app/(main)/products/%5Bcategory%5D/%5Bsubcategory%5D/page.tsx) | Cross-referencing parent/child slug in metadata generation is correct. `FaqSchema` wired properly. |
| [GoogleAnalytics.tsx](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/src/components/analytics/GoogleAnalytics.tsx) | Cookie-gated GA4, `ga-disable-` flag, `anonymize_ip: true` — GDPR compliant. |
| [analytics.ts](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/src/lib/analytics.ts) | Clean typed lead event system. |
| [TrackedLink.tsx](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/src/components/analytics/TrackedLink.tsx) | Correctly fires only after navigation is not prevented. `prefetch=false` default is good. |
| `OG image` `/images/hero-fittings.jpg` | **File exists** in `/public` ✅ |
| [.env.example](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/.env.example) | Both `NEXT_PUBLIC_GA_MEASUREMENT_ID` and `GOOGLE_SITE_VERIFICATION` documented ✅ |

---

## 📋 Manual Checklist Before Going Live

- [ ] Fix [sitemap.ts](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/src/app/sitemap.ts) — replace all `baseUrl` with `SITE_URL` (BUG 1)
- [ ] Verify LinkedIn URL at `linkedin.com/company/aerofren` (ISSUE 2)
- [ ] Confirm `numberOfEmployees` range is accurate (ISSUE 3)
- [ ] Confirm founder name "Βασίλειος Κουτελίδης" is correct (ISSUE 4)
- [ ] Add `NEXT_PUBLIC_GA_MEASUREMENT_ID` to Vercel/production env
- [ ] Add `GOOGLE_SITE_VERIFICATION` to Vercel/production env
- [ ] Submit `https://aerofren.gr/sitemap.xml` in Google Search Console
- [ ] Validate structured data with [schema.org validator](https://validator.schema.org/) after deploy

---

## Summary

The SEO implementation is **well-engineered**. The central [aerofren.ts](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/src/lib/constants/aerofren.ts) constants file is the right pattern, and the AI wired it consistently across schemas, metadata, and content. The only real **code bug** is the hardcoded `baseUrl` in [sitemap.ts](file:///c:/Users/Stelios/.gemini/antigravity/playground/fiery-meteoroid/aerofren-next/src/app/sitemap.ts) — everything else is either correct or needs a quick factual confirmation from you.
