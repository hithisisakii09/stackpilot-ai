# Research Evidence Ledger Implementation Plan

> **For agentic workers:** Use Superpowers TDD and verification, and gstack engineering review / QA. Execute task by task with actual RED and GREEN evidence.

**Goal:** Build a read-only, auditable research lead ledger that cannot be confused with approved claims or vendor pricing.

**Architecture:** Static JSON stores candidate source leads linked to existing product records. A pure validator enforces unapproved state, HTTPS source membership, strict dates and structured status. An Astro research page and CLI expose review needs without changing ranking or product verification. No new runtime dependencies.

**Tech Stack:** Node.js 22, Astro 7, Node built-in test runner, GitHub Actions Chromium QA.

**Spec:** `docs/product-evidence-contract.md`; `AGENTS.md`.

## Global constraints
- Development branch and draft PR only; no merge / production / affiliate activation / public indexing.
- No scraped claims, invented prices or fictitious approval; `status` must remain `candidate`.
- No network calls, account data or side effects in the ledger validator.
- Existing catalog remains the authoritative set of product IDs and candidate source URLs.

## Review focus
1. Unknown product ID — reject.
2. Source URL from a different vendor's entry — reject rather than launder evidence.
3. Future or impossible recorded-on date — reject.
4. Approved status or claimed editor approval — reject; future release approval requires authenticated review.
5. Duplicate ID or source lead — reject.
6. User-supplied markup and external URLs — render as text, never as raw HTML.

## Task 1 — Pure evidence lead validator

**Files:** create `tests/evidence-ledger.test.mjs`, `src/lib/evidence-ledger.mjs`; create `src/data/evidence-leads.json`.

**Interface:** `validateEvidenceLeads(leads, products, {today?:'YYYY-MM-DD'})` returns count, throws for invalid input; `buildEvidenceReviewQueue(leads, products, opts)` returns read-only review items.

- [ ] Write tests first covering each review focus and pure audit result.
- [ ] Run the test and verify expected RED.
- [ ] Implement smallest pure Node compatible module and six unapproved source leads.
- [ ] Run the test and full suite, confirm GREEN.

## Task 2 — Research workbench and CI

**Files:** create `src/pages/research/index.astro`, `scripts/evidence-report.mjs`; modify `scripts/validate.mjs`, `scripts/check-build.mjs`, `package.json`, `scripts/browser-acceptance.mjs`.

- [ ] Add failing route expectation to build/browser smoke checks.
- [ ] Build static non-indexed research workbench; do not label claims 'verified'.
- [ ] Validate ledger during `npm run check:data` and provide read-only `npm run research:evidence`.
- [ ] Verify CI; inspect desktop/mobile accessibility, protect from unsafe outbound links.

## Task 3 — Review and release gates

- [ ] Check CI and browser screenshots on exact head SHA.
- [ ] Update draft PR with evidence and blockers.
- [ ] Keep production, affiliate and editorial approval gates in force.
