# Phase 2.6 — Vendor-Source Claim Candidates Implementation Plan

> **For agentic workers:** Use Superpowers test-driven-development, verification-before-completion, and gstack engineering review and QA. No external skills are claimed installed merely by reading their public reference files.

**Goal:** Convert six verified-to-exist first-party vendor documentation pages into specific, *unapproved* claim candidates, so agents can prepare editor-review packets and future evidence freshness checks without publishing vendor claims or inventing endorsement.

**Architecture:** A JSON source-candidate ledger and a pure Node validator. Every product has one candidate with vendor-scoped HTTPS evidence, explicit caveat and recorded access date. A CLI and the existing operations report present internal data only; the static website and catalog remain untouched.

**Tech Stack:** Node 22.23.4 and its built-in test runner, Astro 7 static, GitHub Actions, no new npm dependencies.

**Spec:** `AGENTS.md`, `docs/editorial-drafts/2026-10-31-comparison-briefs.md`, `docs/roadmap-to-launch.md`, `config/operating-policy.json`.

## Global Constraints
- ₹0 cash budget and delegated spending, no account actions, partner applications, public publication or Netlify settings changes.
- Source pages are **vendor statements**, not independent testing, editorial approval, price warranties or product-fit endorsement.
- Recorded access date cannot be treated as proof a page is still accurate.
- Vendor content is paraphrased conservatively, never quoted at length; original URLs included for editorial review.
- This data is not exposed on new public routes and must not modify `verified`, `pricing`, `affiliateUrl` or partner status fields.

## Review Focus
1. Cross-vendor evidence attribution: reject unknown IDs, foreign domains and redirect/referral links.
2. Date and freshness: reject invalid or future dates, flag stale records for review without self-approving updates.
3. False approval: reject editor names, verified status, partner endorsements, commission, marketing or price guarantees.
4. Malformed claims: reject empty, oversized or unsupported fields; ensure caveats are meaningful.
5. Nonmutation and stable ordering: deterministic CLI and read-only operations report.

### Task 1 — Candidate validator TDD
**Create:** `tests/research-claims.test.mjs`, `src/lib/research-claims.mjs`, `src/data/research-claims.json`.
**Interface:** `validateResearchClaims(claims, products, {today?})` and `buildResearchClaimReviewQueue(claims,products,{today?,staleAfterDays?})`.
- [ ] Write failing unit tests for all five review focus cases.
- [ ] Check GitHub Actions RED before implementation; record exact failure.
- [ ] Add six constrained vendor-source claim drafts and pure validator.
- [ ] Recheck tests GREEN.

### Task 2 — Read-only reporting
**Create:** `scripts/research-claims-report.mjs`, `tests/research-claims-cli.test.mjs`.
**Modify:** `scripts/validate.mjs`, `scripts/ops-report.mjs`, `package.json`.
- [ ] Validate ledger in `npm run check:data`.
- [ ] Add `npm run research:claims -- --json` for internal editorial intake.
- [ ] Add `vendorClaimIntake` summary in `ops:report`, with *zero approved claims*.
- [ ] No vendor text moves into published pages.

### Task 3 — Review and handoff
- [ ] Verify CI Node tests, Astro static build, existing browser QA and Netlify private preview status.
- [ ] Update draft PR, research issue #4 and operator instructions with exact commit and safety holds.
- [ ] Do not merge or publish, remove noindex, spend money or activate affiliate links.
