# Phase 2 — Canonical comparison links and neutral advisor navigation

Date: 2026-11-06. Work only in existing Draft PR #8 (`feature/phase-2-product-readiness`). Owner spend limit ₹0.

## Scope and code-review finding
An open PR #8 review documented that `recommend-explainability.mjs` constructs comparison slugs by alphabetical order, but the static routes in `COMPARISON_PAIRS` are ordered `hubspot-vs-pipedrive`, `semrush-vs-ahrefs`, and `kinsta-vs-cloudways`. The latter two currently yield non-generated links. The richer explainability module also contains unsourced workflow-fit prose and is **not** imported into the homepage. Do **not** connect that prose to public/private-preview browser assets as if independently substantiated.

## Test first (RED → GREEN)
1. Add tests asserting all six products have the correct canonical routes in both product directions and each route matches one defined static comparison pair. Reject unsupported/mismatched peer IDs rather than inventing a route.
2. Add a **public-safe** route metadata helper containing **only** product IDs and existing static pair slugs, not the raw `COMPARISON_PAIRS.matrix` or any vendor claims; tests compare the helper's tiny registry with the pair catalog so route drift fails CI.
3. Fix `explainRecommendation` to use the safe helper. Do not change verification tiers or give any editorial approval. Tests verify all six `comparePeerUrl` values.
4. Wire the safe helper (not the unreviewed rich explainability copy) into the homepage category-advisor results: link to each product profile and correct peer comparison. Links are neutral navigation and do not imply suitability, endorsements, verification, ranking or affiliate status.
5. Extend browser acceptance for all three categories; assert links resolve to actual static routes, remain unranked, and continue showing caveats.
6. Run exact-SHA tests, private-research leakage/prelaunch validation, Astro build, safety/operations, desktop/mobile Chromium acceptance and Netlify Deploy Preview status. Report no owner-authenticated UAT or vendor review unless actually performed.

## Explicit constraints
No remote source browsing, evidence/approval register writes, publication, public launch, affiliate activation, spending, account access, new dependencies, main merge or change to Netlify protection. Raw unverified comparison assertions stay private. All 36 vendor cells remain unverified and production NO-GO.
