# Affiliate research backlog freshness and terminal discovery states — Implementation Plan

> **For agentic workers:** execute this plan task-by-task with test-first changes and exact-SHA verification. Keep PR #1 draft and unmerged.

**Goal:** Stop the daily advisory backlog from repeating affiliate research already reviewed on 2026-11-04, while retaining a dated future recheck and a truthful no-public-program-found state for Ahrefs.

**Architecture:** Add a separate `lastReviewedOn` field to affiliate research intake; keep `sourceLoggedOn` as original source-intake provenance. Add a non-approval state `no-public-program-found` for a reviewed vendor with no located public registration page. Make the operating backlog schedule eligibility/status refresh only after the configured review age, with unresolved discovery still prioritized.

**Tech Stack:** Existing Node.js ESM, JSON intake, node:test, pure JavaScript validators and read-only CLI. No dependencies, APIs or account actions.

**Spec:** `docs/affiliate-eligibility/2026-11-04-primary-source-refresh.md`, `docs/affiliate-monetization-readiness.md`, and `docs/current-operational-state.md`.

## Global Constraints
- Monthly budget ₹0; delegated spend ₹0.
- No accounts, applications, outreach, contracts, accepted terms, referral URLs or commissions.
- `affiliateUrl` and `trackingUrl` remain null; all applications and acceptances remain false/zero.
- Vendor source intake date and last review date are separate; neither is a vendor's last-updated date.
- `no-public-program-found` means no public registration was located at review time; it does not rule out private arrangements or guarantee future status.
- Owner-only release, editorial, legal and identity gates remain unchanged.
- Work only on `feature/phase-1-1-recommendation-engine`; never merge or change main/Netlify settings.

## Review Focus
- Missing or future `lastReviewedOn` must fail closed rather than suppress a due research task.
- An unlocated public program must not be represented as a confirmed affiliate offer or acceptance.
- A recently reviewed program must not be requeued on every daily run.
- An aged review must re-enter the queue deterministically after the configured threshold.
- Input order and source objects must remain unchanged; no application, contract, link, spend or earnings fields can be asserted.

---

### Task 1: Affiliate intake review provenance and no-public-program state

**Files:**
- Modify: `src/lib/affiliate-readiness.mjs`
- Modify: `src/data/affiliate-programs.json`
- Test: `tests/affiliate-backlog-freshness.test.mjs`

**Interfaces:**
- Consumes: current affiliate candidate records and product catalog.
- Produces: validated `lastReviewedOn`; research states `candidate`, `program-discovery-needed`, and `no-public-program-found`; actions include `recheck-program-status`.

- [ ] Write tests for accepted reviewed candidates, no-public-program-found, malformed review dates, and immutable zero-approval queue output.
- [ ] Run tests and verify the expected RED failure against the existing strict schema.
- [ ] Add `lastReviewedOn` validation and the explicit no-public-program-found state without changing application or tracking authorization.
- [ ] Add 2026-11-04 review dates to the six records; retain `sourceLoggedOn` as 2026-10-31; set Ahrefs to no-public-program-found, null program URL, and recheck-program-status.
- [ ] Run the focused test and full Node suite; confirm GREEN.

### Task 2: Freshness-aware deterministic operating backlog

**Files:**
- Modify: `src/lib/operating-backlog.mjs`
- Test: `tests/affiliate-backlog-freshness.test.mjs`
- Modify if needed: `tests/operating-backlog.test.mjs`

**Interfaces:**
- Consumes: validated affiliate queue rows with `lastReviewedOn`.
- Produces: no duplicate daily rechecks; P40 unresolved public-program discovery; P50 stale candidate eligibility recheck; P60 stale no-public-program status recheck; advisory-only output.

- [ ] Add tests that same-day review produces no affiliate recheck tasks.
- [ ] Add tests that a review older than 90 days re-enters the correct queue, while the exact boundary remains deterministic.
- [ ] Run focused tests and verify RED before implementation.
- [ ] Implement date-age comparison using the supplied `today` and existing `staleAfterDays` threshold.
- [ ] Preserve owner gates, zero-spend policy, source refresh priorities, stable ordering and no mutation.
- [ ] Run focused tests, `npm test`, `npm run partners:queue -- --json`, and `npm run ops:backlog -- --json`; inspect complete outputs.
- [ ] Review changed files for state laundering, fabricated approvals and accidental activation; verify exact-SHA GitHub build, operations artifact, Chromium and Netlify status.
- [ ] Update draft PR #1 and issues #3/#5 with exact evidence. Do not merge, publish, activate affiliates or change provider settings.
