# Exact-SHA private preview UAT case worksheet — 2026-11-01

## Motivation
The existing GitHub Actions private-preview artifact contains a trustworthy build manifest and untested route listing, but a human reviewer still has to invent test cases, choose status labels and translate the route list into an actionable UAT record. Address this last-mile problem **without claiming that GitHub performed authenticated Netlify UAT**.

## Scope
- Extend `src/lib/preview-uat-packet.mjs` with `buildPrivatePreviewUatCases(packet)` and `formatPrivatePreviewUatWorksheetCsv(packet)`.
- Produce one baseline signed-in route smoke case per emitted static HTML path (no dynamically guessed routes), plus defined cases for key tools, privacy and anonymous access. Cover current functionality: homepage advisor category matches, comparison negative inputs, requirements CSV, CRM seat arithmetic, software costs, SEO audit scope, hosting cutover gates, backup drill, research/disclosure/privacy pages, HTTP headers, Netlify private visibility and publish lock, billing/analytics review.
- All generated cases reference exact SHA and built route asset hash when applicable; `result:UNTESTED`, `evidence:NOT_COLLECTED`, `releaseAuthorized:false`. No credentials, cookies, IPs, names or other sensitive values.
- CSV has fixed column headers and machine-safe quoted cells; never allows an injected arbitrary formula or URL. It is an **empty manual checklist**, not a report claiming any test passed.
- Pure model reuses `formatPrivatePreviewUatPacketMarkdown` verification for packet shape, then rejects disallowed path/status/identifier; deterministic order, no mutation.
- `scripts/create-private-preview-package.mjs` additionally writes `artifacts/private-preview/uat-cases.csv`. Existing private GitHub Actions artifact retention three days. Keep unmodified build/report JSON and Markdown to avoid breaking existing workflows. No dependencies or network requests.
- `tests/preview-uat-cases.test.mjs` added **before implementation** for route coverage, exact SHA, specific owner scenarios, no PASS or publication, deterministic output, tamper rejection, source code integration. Observe RED CI, then implement.
- Run full `npm test` via GitHub CI (unit, validation, Astro, preflight), safety/ops artifact packager, Chromium desktop/mobile and Netlify provider deploy-preview status for exact head; distinguish provider SUCCESS from authenticated remote UAT.

## Safety and gstack/Superpowers review
Think→Plan→Build→Review→Test→Ship→Reflect. Human (not CI) is evidence collector; a generated case list is not authorization. A malicious actor might attach forged PASS evidence, so the artifact must contain zero result-entry automation and never import reviewer edits into release settings. Do not alter Netlify account, main, draft PR state, DNS, brand, legal, analytics, partner links or payment. Budget ₹0, owner-approved launch still NO-GO. Upstream reference methodologies read: garrytan/gstack QA, obra/superpowers TDD and verification-before-completion; apply manually and report exact commits.
