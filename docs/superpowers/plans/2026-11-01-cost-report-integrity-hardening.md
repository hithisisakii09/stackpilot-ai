# Phase 3.8 — Subscription cost report integrity hardening (2026-11-01)

## Why
Audit of the existing buyer tools found a meaningful consistency gap: `plainTextCostReport(comparison)` checks two provenance flags but **trusts every subtotal, total, difference and lower-cost conclusion** supplied by its caller. In contrast, the newer hosting and migration exporters independently recompute values and reject altered reports. A future component passing a stale, mutated or forged comparison object could publish incorrect financial guidance, even without a network call. Fix before adding more pages.

## Technical contract
- `compareSubscriptionCosts` keeps its existing currency, months, arithmetic and output fields but adds a closed, copy-by-value `input` snapshot of the exact permitted user-entered values (no vendor name/URL), so reports can independently recompute cost results. Accept previously supported strings/numbers. Do not modify callers.
- `plainTextCostReport` refuses unknown/new result fields, missing or malformed input snapshots, forged trust flags, modified monthly/total amounts, wrong lower-cost selection, wrong difference, wrong period/currency, and stale input changed after original calculation. Build an expected result from `compareSubscriptionCosts(result.input)`; strictly compare every field in both options and metadata, and only render after validation. No vendor pricing or affordability claims.
- Preserve currency support INR/USD/EUR/GBP, integer minor-units, horizon 1–60, seats 1–1000; no change to math or existing UX, no dependencies.
- A frozen or copied input protects report integrity *relative to the snapshot*; it is NOT external verification of prices, user identity or vendor quotes. Document this distinction in tests/code.

## Test-first implementation and verification
1. Plan here. Add `tests/cost-report-integrity.test.mjs` first and verify RED GitHub build for mutated results, forged lower-cost, hidden fields, stale input, dataSource approvals and input-copy changes. Baseline tests must still pass.
2. Minimal changes to `src/lib/cost-comparison.mjs`: deterministic input snapshot, recursive strict schema and numeric/structural equality against recomputed canonical results. No JSON string comparisons that allow extra undefined fields or getters. Report remains stable for valid input.
3. Verify 3 GitHub Actions workflows, 22+ static routes, Netlify private Deploy Preview provider status, existing desktop/mobile Chromium QA and npm audit. New tests only check logic; Chromium continues to cover buyer form and stale-state.
4. Comment on draft PR #1 with actual test runs and separate hosted owner UAT blockers. Do NOT merge or publish.

## Boundaries
Zero budget, delegated spend ₹0. No main merge, production unlocking/indexing, Netlify account changes, vendor claims approval, brand/publication, affiliate activation, external scripts, tokens, external server calls or Vercel recreation. Apply gstack review/QA and Superpowers TDD RED→GREEN and verification guidance manually, without installing any external tooling.
