# 2026-11-05 — Historical HubSpot export research crosswalk (private)

## Scope
Work on Draft PR #8 only; no new live vendor inspection is possible. Reconcile **already recorded, dated** first-party research notes against the four atomic questions in `comparison-hubspot-vs-pipedrive-05` without pretending the notes are new authenticated source captures. Preserve ₹0 spend, private preview, unmerged main, and production NO-GO.

## Inputs and decision boundary
- `src/data/research-claims.json` has the unapproved `hubspot-doc-claim-1` candidate.
- `docs/growth/2026-11-02-crm-exit-evidence-and-ethical-distribution.md` contains 2026-11-02 source observations explicitly labeled as vendor-authored statements, not tested behavior.
- `docs/editorial-drafts/2026-11-03-plan-scoped-vendor-evidence-review.md` preserves 2026-11-03 archival notes; not an authenticated editorial review.
- `docs/phase-2-product-readiness/2026-11-05-first-claim-manual-evidence-pilot.md` defines the four independent questions and the private worksheet.
- `src/data/comparison-source-proposals.json` and `src/data/comparison-evidence-captures.json` are both empty at this checkpoint.

## Work
1. Create a static, private archival crosswalk containing for each of the four predicates: dated historical research context, what that context does **not** establish, and the exact human inspection questions.
2. Prevent historical notes from being misrepresented as current, verified, copied vendor excerpts, source proposal IDs, or account-level evidence. Explicitly distinguish CRM API availability from automatic/scheduled/bidirectional data synchronization.
3. Link the crosswalk from the existing first-claim pilot and original research issue #6; no duplicate issue, speculative source, or automatic proposal/capture.
4. Since this is docs-only, verify exact-SHA GitHub build/tests, safety, Chromium, and Netlify private preview after the commit. No source, data, policy, or public route changes.

## Release controls
All 36 comparison claim cells remain **UNVERIFIED**; all four subquestions remain **NEEDS-EVIDENCE**. Independent human source inspection and authenticated review are blocked on actual human action. No publication, deployment settings change, indexing, affiliate activation, outreach, paid service, merge, or approval.
