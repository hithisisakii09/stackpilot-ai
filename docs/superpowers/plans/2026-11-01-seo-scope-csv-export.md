# Phase 3 — SEO audit planner CSV export and privacy-accurate copy
**Date:** 2026-11-01 · **Status:** private development only · **Release: NO-GO**

## Goal and customer benefit
Let buyers save the existing browser-only SEO scope worksheet as an offline, machine-readable CSV. The CSV must distinguish their hypothetical page cap from a verified vendor crawl allowance. Also correct privacy copy so it does not imply Netlify hosting-layer Web Analytics is absent.

## Contract and files
- `src/lib/seo-audit-scope.mjs`: add pure `formatSeoAuditScopeCsv(result)`, accepting only a result consistent with `planSeoAuditScope`, rejecting tampering or falsified approvals.
- `tests/seo-audit-scope-csv.test.mjs`: test deterministic UTF-8 CSV, explicit UNVERIFIED/UNKNOWN fields, no formulas, stable column count, reject tampered `includedPages`, `crawlCredits`, missing fields, altered `status`. UI-state assertions and accurate privacy wording.
- `src/pages/tools/seo-audit-scope/index.astro`: local Blob download `stackpilot-seo-audit-scope.csv`, disabled before calculation or after input/change/reset/error; reuse validated result, not editable output text. Privacy copy distinguishes browser-only inputs from previously enabled hosting-level Netlify Web Analytics (review pending).
- `scripts/browser-acceptance.mjs`: desktop browser download contents and filename, stale disabled after toggles and invalid input; mobile download and accessibility regression.
- `docs/superpowers/plans/2026-11-01-seo-scope-csv-export.md`: this plan.

## Safe output
CSV columns: `metric,value,verification_status`. Known metrics are fixed, internally authored labels. Values are bounded nonnegative integers, yes/no, or known fixed status words; no raw user strings, URLs, dates, company names, or worksheet metadata. CRLF; deterministic. Rows include counts, included/excluded pages, cap/remaining/excess, scope status, and `provider_crawl_credits,,UNKNOWN`. All numeric planning rows must say `User-entered only`, and vendor allowance `UNVERIFIED`.

## TDD and QA
1. Write tests, commit, inspect an actual RED build with expected failures.
2. Implement the minimum pure CSV converter; reuse model validation.
3. Add UI and browser tests; reject stale export and unapproved claims.
4. Review diff for formula injection, requests/analytics misunderstandings, invalid inputs, memory leaks, and release controls.
5. Verify exact-SHA GitHub unit/build/data/static-release checks, browser mobile/desktop/axe, ops workflow, and Netlify Deploy Preview status separately.
6. Record final SHA and run IDs in draft PR #1; do not merge or publish.

## Absolute gates
₹0 monthly / ₹0 delegated spend; no new paid packages, partner applications, account changes, affiliate activation, contracts, auto publishing unlock, public SEO indexing, production deployment or `main` merge. Netlify hosting access/billing and exact-sha authenticated hosted browser UAT still require independent verification. Do not imply the absence of Netlify server-side page-visit analytics.
