# SaaS SLA Buyer Checklist — Research and Development Plan

> **For agentic workers:** This is a documentation-only research task. Use the repository's gstack and Superpowers review/verification workflow. If implementation code is later proposed, apply superpowers:test-driven-development first; do not add production code under this plan.

**Goal:** Prepare one original, source-anchored, unpublished buyer guide that helps small businesses evaluate SaaS uptime, support, migration and service-credit commitments without confusing marketing percentages with contract eligibility.

**Architecture:** Add a dated research brief containing the evidence ledger, qualitative keyword hypotheses, competitor/alternative scan, unpublished article, distribution preparation and measurement baseline. Keep the work on an isolated development branch and reuse the existing buyer tools without changing routes, application behavior, tracking or catalog records.

**Tech Stack:** Markdown documentation; existing GitHub Actions validation, Chromium acceptance and operations workflows.

**Spec:** `docs/growth/2026-11-07-saas-sla-buyer-checklist.md`

## Global Constraints

- Base branch: `main@1672461bea5fa09e01965c5e8bdd4819852b06fd`; do not modify or merge main.
- Branch: `growth/saas-sla-buyer-checklist-2026-11-07`.
- Monthly and delegated spending remain ₹0.
- No publication, indexing, production promotion, provider setting change, new account, paid tool, external post, outreach, tracking or affiliate action.
- Do not change `config/operating-policy.json`, the six-product claim ledger, source-intake dates, affiliate records or owner gates.
- Preserve `robots.txt`, noindex, CSP, security headers, private preview and automatic-publishing lock.
- Vendor terms are evidence candidates, not editorial approvals, legal advice, customer-specific commitments or independent product tests.
- Use UNKNOWN for missing traffic, rankings, conversions, region-specific applicability and contract evidence.

## Review Focus

1. **Scope drift:** Do not duplicate the TCO, usage-meter, seat-billing, CRM export or renewal/cancellation guides. This guide is limited to uptime definitions, exclusions, support response, service-credit process and incident evidence.
2. **False equivalence:** Do not compare vendor percentages without preserving each definition, measurement window, eligible product, plan and exclusion.
3. **Contract versus marketing:** Prefer current first-party legal terms. Label product marketing, status pages and help-center service-request timeframes accurately.
4. **Regional and channel limits:** Preserve jurisdiction-specific terms, reseller handling, order-form overrides and data-center-local maintenance. Mark India-specific eligibility UNKNOWN when not verified.
5. **Remedy overstatement:** Distinguish credits from refunds, support response from resolution, migration SLA from uptime SLA, and monitoring evidence from the contract's source of truth.

## Files

- Create: `docs/growth/2026-11-07-saas-sla-buyer-checklist.md` — research brief, evidence ledger and unpublished article.
- Create: `docs/superpowers/plans/2026-11-07-saas-sla-buyer-checklist.md` — this plan.
- Do not modify: application routes, components, data, catalog, affiliate records, policy, headers, robots or runtime configuration.

## Coordination and Existing State

- PR #1 is already merged; it is not an active draft. The merge is recorded in the current repository history.
- PR #8 is the Phase 2 product-readiness workstream; leave it untouched.
- PR #9 is the seat-billing article; leave it untouched.
- PR #10 is the renewal/cancellation article; leave it untouched.
- Issue #4 is closed. Do not reopen it. Use the existing open editorial coordination issue #6 for a concise handoff and cross-reference issue #4 as historical context.
- The latest PR #10 operations artifact reports `automatic: []`, six candidate-only vendor packets, six editorial reviews pending, zero approved claims, four owner-only gates, zero affiliate applications, zero accepted programs and zero active tracking links. Do not execute owner gates.
- PR #10's exact-head Build, Chromium and Safety/operations workflows all completed successfully; its Netlify Deploy Preview status is SUCCESS. Its anonymous CI sample returned 401 on two paths, but does not prove all-visitor privacy or the served commit. The exact preview commit remains unverified by the operations artifact.
- Existing Zylo/Vendr/Tropic competitor research in PR #10 is reused. This brief adds adjacent incident-communication and uptime-monitoring alternatives (Atlassian Statuspage and Better Stack) without claiming they are direct product substitutes.

## Research and Execution Sequence

### Task 1: Current-state and backlog inspection

- [x] Read `AGENTS.md`, `config/operating-policy.json`, `docs/current-operational-state.md` and PR #1.
- [x] Inspect open PRs #8, #9 and #10, issue #4 and current editorial issue #6.
- [x] Inspect PR #10's operations artifact, including `artifacts/ops/backlog.json`.
- [x] Confirm the automatic queue is empty; do not run owner gates.
- [x] Confirm PR #10's three exact-head CI workflows and Netlify status.

### Task 2: Reuse and differentiation review

- [x] Read the PR #9 seat-billing brief and PR #10 renewal/cancellation brief.
- [x] Review the existing usage-meter and TCO guide plans.
- [x] Choose a distinct SLA/availability/claim-process topic; add no route or new tool.
- [x] Reuse existing procurement competitor research rather than regenerating it.

### Task 3: First-party source research

- [x] Verify the HubSpot Customer Terms copy last modified February 2, 2026 and preserve its narrow downtime definition, consecutive-month condition, claim window and Free Services exclusion.
- [x] Verify the Atlassian SLA effective April 30, 2026 and preserve eligible-product, plan, claim-window, reseller, credit and exclusion rules.
- [x] Verify Kinsta's SLA updated September 25, 2025 and its Guaranteed Uptime documentation updated October 24, 2025; preserve order-form, billing-period, threshold, maintenance and remedy details.
- [x] Verify Cloudways' June 29, 2026 migration article and label the 24-hour-per-site SLA as migration-service timing, not uptime.
- [x] Verify adjacent alternatives' official positioning: Zylo/Vendr/Tropic, Atlassian Statuspage and Better Stack.
- [x] Mark India-specific legal applicability and unavailable Pipedrive/Ahrefs/Semrush SLA text as UNKNOWN/NOT RETRIEVED rather than infer absence.

### Task 4: Draft and self-review

- [x] Create the buyer-intent keyword map with qualitative intent and no invented search volumes.
- [x] Create the source evidence ledger with access dates, exact qualifications and source links.
- [x] Draft a reusable buyer checklist and SLA comparison register.
- [x] Separate uptime, support response, resolution, migration and status-page evidence.
- [x] Record all traffic, ranking, lead, conversion and earnings baselines as UNKNOWN.
- [x] Confirm no catalog claim, source-review status or approval field was changed.

### Task 5: Pull request and verification

- [ ] Create a draft-only PR from this branch to main; never merge.
- [ ] Verify the exact PR head's Build/unit-test workflow.
- [ ] Verify the exact PR head's Chromium desktop/mobile workflow.
- [ ] Verify the exact PR head's Safety/operations workflow and inspect `artifacts/ops/backlog.json`.
- [ ] Verify the exact PR head's Netlify Deploy Preview GitHub status.
- [ ] Review the final diff to confirm documentation-only scope and unchanged policy/noindex/privacy files.
- [ ] Add a concise editorial handoff to issue #6 without changing claim approval fields.

## Verification and Acceptance

- The guide contains at least 10 qualitative buyer-intent hypotheses, grouped by intent; no search volume, difficulty, CPC or rank is claimed.
- At least three current first-party contractual/help sources are linked, with product/plan, dates, exclusions, remedy and region caveats preserved.
- At least three competitor/alternative sources are linked and labeled as self-described positioning.
- The article includes a reusable SLA register and questions a buyer can ask before signing.
- It distinguishes availability SLA, support response, resolution, migration SLA and status-page/monitoring evidence.
- It explicitly states that StackPilot is a buyer-entered decision-support tool, not an SLA monitor or contract parser.
- All organic baseline metrics remain UNKNOWN; affiliate applications/acceptances remain zero and earnings remain UNKNOWN.
- No application code, routes, analytics, tracking, dependencies, vendor claim approvals, account actions or external posts are added.
- CI and preview claims are made only after fresh exact-head workflow and status results are read.

## Workflow Notes

- gstack `plan-eng-review`, `review` and `qa` guidance was inspected from the upstream repository and applied as a manual scope/risk/review checklist because the connector session does not expose the installed gstack shell runtime.
- Superpowers `writing-plans`, `verification-before-completion` and `requesting-code-review` guidance was reviewed. The TDD red/green cycle is not applicable to this documentation-only change; if runtime behavior is later added, a failing test must be demonstrated before implementation.
- Completion is not claimed until the exact PR head has fresh Build, Browser, Operations and Netlify status evidence.
