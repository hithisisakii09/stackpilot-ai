# Milestone 2 increment: public-build research leakage guard
Date: 2026-11-05. Scope: private Draft PR #8 only; no changes to main or owner approval gates.

## Rationale
The new private review-packet tooling intentionally retains raw, unverified vendor assertions and internal editorial review details. Those must never be shipped as HTML, JavaScript, JSON, CSS, or other browser-delivered text—even if the public comparison page visually substitutes neutral copy. Static access control and noindex are not substitutes for ensuring private research content stays out of built assets.

## Plan
1. Test-first: design a pure audit that rejects raw candidate comparison values, escaped HTML/JS variants, internal review fields and accidentally emitted private research JSON filenames. It must inspect **all emitted text assets**, not a fixed route list; preserve normal neutral comparison copy and official external links. Do not include the sensitive assertion content in violation messages.
2. Implement `src/lib/internal-research-leak-audit.mjs`, with bounded normalization and fail-closed input validation; do not add packages or remote calls.
3. Integrate into the existing `scripts/release-preflight.mjs` scan across the generated `dist/` tree. Keep the existing output shape, append an `internalResearch` count/violations, exit nonzero if leaked. Existing `npm test` already invokes release preflight after building.
4. Verify GitHub Actions validation, browser acceptance and safety/operations on the exact final SHA. Disclose test-first RED run evidence only if observed; intermediate GitHub workflows may cancel as later commits arrive.

## Threats / limitations
This is defense-in-depth text scanning, not a formal noninterference proof. Split strings, compressed assets or transformed content can evade plain-text matches; authenticated reviewer authority and private-build segregation remain separate gates. No raw candidate text may appear in audit error logs.

## Preserved gates
₹0 spend, private Netlify preview, no production promotion, no merging, no affiliate activation, no contracts, no external communication, no owner approval claims.
