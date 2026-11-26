# Milestone 2 — Evidence-Safe Product Comparison Foundation

Date: 2026-11-05. Scope: draft PR #8 only. Owner authorized development, not merging, release, spending, editorial approval or affiliate activation.

## Problem and threat model
The three static comparison matrices contained unsourced, specific vendor claims. A page-level disclaimer alone could not prevent readers from mistaking a row for an authenticated fact. Research candidates must never be promoted to verified buyer advice.

## Incremental implementation
1. Add a failing Node regression test for each pair, requiring a stable row ID, `unverified` status, `approved:false`, null source/date, and vendor-specific questions instead of raw unsourced assertions.
2. Fail closed at the `getComparisonPair` presentation boundary. Preserve the original matrix as internal candidate notes only; do not expose it through the rendered matrix. Make returned rows fresh objects.
3. Show row-level evidence status and claim ID in the accessible table.
4. Preserve pair routes, neutral CSV worksheets, affiliate nulls, noindex, restrictive CSP, private Netlify preview and ₹0 budget.

## Verification and limits
GitHub Actions must run `npm test` (including data validation, Astro build and release preflight), Chromium desktop/mobile QA, and operations safety. A red CI observation on the test-only commit should precede green on the implementation head. Exact SHA and results must be checked; do not claim success from an unobserved run.

This is a fail-closed first increment, not an authenticated approval workflow. The original candidate text remains in source for future human review, and the current code does not authorize anyone to approve it. Follow-up work should introduce a separately reviewed claim-evidence ledger and a trustworthy approval workflow before any verified statements are displayed.

## Release gates
PR #8 remains draft. Do not merge, change main, unlock production, remove noindex, activate affiliate URLs, approve vendor claims, spend, or alter PR #9.
