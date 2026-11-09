# Milestone 2 — Fail-closed assessment of worksheet placeholders and hostile cells

Date: 2026-11-05. Only existing private Draft PR #8 / `feature/phase-2-product-readiness`.

## Engineering review / risk

The offline `research:hubspot-worksheet-check` accepts a human-filled CSV with a bounded source excerpt. Plan, region, permissions and limitations already reject leading spreadsheet formula triggers, but excerpts currently reach `hashEvidenceExcerpt` without checking formula-prefixed or invisible bidi/zero-width characters. A locally entered formula-like excerpt can survive structural checks; accidentally opening an edited CSV in spreadsheet software could execute it **before** the validator is run. In addition, values such as `N/A`, `TBD`, `pending` or `not checked` currently count as complete source scope, inflating the number of **self-reported** observations. No source has actually been inspected here.

## Test-first approach

1. RED tests covering excerpt cells beginning `=+−@` formula triggers, whitespace/zero-width-prefixed formulas, invisible bidi overrides and internal control characters; also check plan, region, permissions, limitations and source URL cannot carry bidi/format controls. Reject without ever echoing the dangerous or private input.
2. RED tests for unresolved/manual-placeholder values `N/A`, `TBD`, `pending`, `not checked`, `not documented`, `unknown`, `none`, `?`, `-`, even when the row declares `OBSERVED-UNVERIFIED`. Such rows must remain `PARTIAL-LOCAL-NOTES`, with explicit missing field codes and `reportedObservations=0`.
3. GREEN minimal change to existing `src/lib/hubspot-manual-worksheet-check.mjs` to reject unsafe manual strings and classify placeholder text as missing. Keep syntactically valid genuine excerpts, quoted commas/quotes and all current fail-closed source/date/CSV guards working.
4. Document safe local CSV editing (trusted text editor, not automatically opening untrusted CSV), scope placeholders and how to identify unresolved evidence. Do not add new source records, reports, permissions or dependencies.
5. Verify the exact final SHA with Node tests, `check:data`, Astro static-build/preflight, safety/ops, Chromium desktop/mobile and private Netlify status.

## Invariants / release locks

All 36 comparison claims remain private, unverified and unauthorized. Research records and current signed editorial decisions remain unchanged; no reviewer approval, protected preview unlock, affiliate activation, spend (₹0), production publication, public indexing or merge. CSV can still be fabricated—this validates syntax and completeness only, **not provenance or a human's truthfulness**. The policy is defense in depth, not a guarantee that other spreadsheet programs cannot execute unexpected formulas.
