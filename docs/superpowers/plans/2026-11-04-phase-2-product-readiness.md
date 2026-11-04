# Plan: Phase 2 Autonomous Product Readiness — Commercial Viability & Recommendation Depth

**Date:** 2026-11-04  
**Branch:** `feature/phase-2-product-readiness`  
**Author:** Autonomous Engineering Session  
**Operating Policy:** ₹0 INR/month budget, delegated spend ₹0, no production promotion, no affiliate activation, candidate-only vendor status.

---

## 1. Problem Statement & Strategic Objective

StackPilot AI has successfully verified its MVP operational baseline through PR #1 and PR #7 (all CI green, 468/468 tests passing, owner manual UAT passed on Deploy Preview 7, clean merge to `main@1672461`). However, to progress toward a commercially viable SaaS discovery and recommendation platform, several functional and structural gaps must be resolved:

1. **Recommendation Explainability Depth:** The recommendation engine (`src/lib/recommend.mjs`) provides only coarse category matching with generic caveats. It does not provide actionable workflow nuance, architectural differentiation between candidates, or explain *why* specific criteria are verified or pending.
2. **Head-to-Head Comparison Architecture:** While `/compare/` offers an interactive dropdown and category tables, SaaS buyers overwhelmingly search for direct pairwise comparisons (e.g. "HubSpot vs Pipedrive", "Semrush vs Ahrefs", "Kinsta vs Cloudways"). Static, shareable, indexable-ready comparison routes do not exist.
3. **Structured Data (Schema.org) Absence:** Emitted HTML routes lack Schema.org JSON-LD metadata (`SoftwareApplication`, `Product`, `FAQPage`, `BreadcrumbList`), leaving the platform unprepared for future rich search snippets.
4. **Internal Cross-Linking Silos:** Software profile pages (`/software/[id]/`) do not cross-link to relevant decision calculators (`/tools/crm-seat-audit/`, `/tools/seo-audit-scope/`, `/tools/hosting-cutover-gates/`) or peer comparisons, breaking buyer exploration journeys.
5. **Pre-Monetization Rigor:** Transparent affiliate qualification criteria, vendor claim verification standards, and FTC/ASIC/UK ASA compliance protocols must be codified before any commercial application.

---

## 2. Proposed Architecture & Safe Enhancements

### Component 1: Recommendation Explainability & Intent Matching (`src/lib/recommend-explainability.mjs`)
- Add deterministic workflow criteria evaluation for each category (sales/CRM, SEO, hosting).
- Provide neutral, multi-dimensional assessment breakdown:
  - Primary architectural paradigm (e.g., All-in-one CRM suite vs focused sales pipeline CRM; All-in-one search marketing suite vs raw backlink index; Managed enterprise container hosting vs flexible multi-cloud VPS).
  - Explicit rationale for why team-size/budget filters are deferred while pricing claims remain unverified.
  - Transparent verification tiering (Tier 0: Unreviewed candidate; Tier 1: Sourced lead; Tier 2: Verified claim).
- Keep sorting strictly alphabetical by product name; affiliate status strictly excluded.

### Component 2: Dedicated Pairwise Comparison Infrastructure (`src/lib/comparison-pairs.mjs` & `src/pages/compare/[slug].astro`)
- Generate deterministic pairwise comparisons for natural category rivals:
  - `hubspot-vs-pipedrive` (CRM)
  - `semrush-vs-ahrefs` (SEO)
  - `kinsta-vs-cloudways` (Hosting)
- Generate static HTML routes `/compare/[slug]/` via Astro `getStaticPaths()`.
- Enforce strict prelaunch safety:
  - `<meta name="robots" content="noindex, nofollow" />`
  - WCAG 2.1 AA landmark navigation and skip-links.
  - No external scripts, no external stylesheets, no affiliate links.
  - Neutral side-by-side feature and governance matrices.
  - Downloadable vendor questioning worksheet (CSV) with formula injection protections.

### Component 3: Schema.org Structured Data Generator (`src/lib/structured-data.mjs`)
- Pure utility generating valid JSON-LD graphs for:
  - `SoftwareApplication` / `Product` on software profiles.
  - `FAQPage` on comparison and guide pages.
  - `BreadcrumbList` across all multi-level routes.
- Sanitized against script tags and JSON injection.
- Zero external runtime libraries.

### Component 4: High-Intent Cross-Linking & Navigation Architecture
- Update `/software/[id].astro` to link to category peer comparisons and relevant decision tools.
- Update `/compare/index.astro` to feature direct links to dedicated pairwise comparisons.
- Update `/pages/index.astro` advisor output to include internal software profile links.

---

## 3. Files Changed / Added

| File | Type | Description |
|---|---|---|
| `docs/superpowers/plans/2026-11-04-phase-2-product-readiness.md` | New | This plan document |
| `src/lib/recommend-explainability.mjs` | New | Recommendation explainability & workflow intent matching |
| `src/lib/comparison-pairs.mjs` | New | Dedicated pairwise comparison dataset & matrix builder |
| `src/lib/structured-data.mjs` | New | Schema.org JSON-LD structured data generators |
| `src/pages/compare/[slug].astro` | New | Dedicated static head-to-head comparison routes |
| `src/pages/software/[id].astro` | Edit | Add pairwise comparison links, decision tool links, and JSON-LD |
| `src/pages/compare/index.astro` | Edit | Feature dedicated pairwise comparison links and JSON-LD |
| `src/pages/index.astro` | Edit | Add internal profile links in advisor results |
| `scripts/check-build.mjs` | Edit | Audit new pairwise comparison routes for brand and noindex |
| `tests/recommend-explainability.test.mjs` | New | Tests for recommendation explainability engine |
| `tests/comparison-pairs.test.mjs` | New | Tests for pairwise comparison data and validation |
| `tests/structured-data.test.mjs` | New | Tests for JSON-LD generation and escaping |

---

## 4. TDD & Verification Sequence

1. **RED:** Write test files `tests/recommend-explainability.test.mjs`, `tests/comparison-pairs.test.mjs`, and `tests/structured-data.test.mjs`. Execute `node --test` to confirm failures.
2. **GREEN:** Implement `src/lib/recommend-explainability.mjs`, `src/lib/comparison-pairs.mjs`, `src/lib/structured-data.mjs`, `src/pages/compare/[slug].astro`, and update Astro templates.
3. **REFACTOR & INTEGRATE:** Update `scripts/check-build.mjs`.
4. **VERIFY:**
   - `node --test --test-concurrency=1 tests/*.test.mjs` (All tests green)
   - `node scripts/validate.mjs` (0 violations)
   - `npm run build` (Build all 28 static routes)
   - `node scripts/check-build.mjs` (All 28 routes pass smoke check)
   - `node scripts/release-preflight.mjs` (Release preflight 0 violations)
   - `npm audit --omit=dev --audit-level=high` (0 vulnerabilities)
5. **COMMIT & PUSH:** Push branch `feature/phase-2-product-readiness` and open Draft PR.
