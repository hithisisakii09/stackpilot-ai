# SaaS Renewal and Cancellation Checklist — Research Plan

**Date:** 2026-11-06  
**Status:** PRIVATE DEVELOPMENT RESEARCH — DRAFT — NOT APPROVED — NOT PUBLISHED  
**Branch:** `growth/saas-renewal-notice-checklist-2026-11-06`  
**Base:** `main@1672461bea5fa09e01965c5e8bdd4819852b06fd`  
**Budget:** ₹0

## Goal

Prepare one original, source-anchored buyer guide that helps a small business identify the real SaaS renewal deadline, cancellation channel, billing consequences, access transition and data-recovery window before it renews or exits a subscription.

## Scope and non-goals

- Documentation-only: one research brief with an unpublished article draft.
- Reuse existing StackPilot buyer-entered checklists and TCO/usage/seat guides as references; do not add a new route, UI, integration, tracking, analytics, vendor data or dependencies.
- Do not claim legal advice, universal cancellation rules, guaranteed savings or vendor-account verification.
- No price table, current quote, ROI estimate, ranking, search-volume estimate, commission claim or conversion forecast.
- No production, main, PR #8 or PR #9 changes; no publication, indexing, external post, account creation, outreach, affiliate action, provider setting change or spend.
- Keep source statements attributed and candidate-only; do not alter the six-product claim ledger or any editorial approval/source-intake fields.
- Do not execute owner-only backlog gates.

## Current-state and coordination findings

- `main` is `1672461bea5fa09e01965c5e8bdd4819852b06fd`.
- PR #1 is already merged; it is not an active draft PR.
- PR #8 is the active Phase 2 product-readiness workstream; leave it untouched.
- PR #9 is the separate seat-billing buyer guide; this renewal-deadline/data-exit article must not duplicate its user-vs-seat or unused-license content.
- Issue #4 is closed. Do not reopen it. Use the existing open issue #6 as the human editorial coordination thread and link back to issue #4 for historical context.
- Latest PR #8 exact-head ops artifact reports an empty automatic queue, six candidate-only vendor packets, six editorial reviews pending, zero approved claims, four owner gates, zero affiliate applications, zero accepted programs and zero active tracking links. Do not execute owner gates.
- Existing usage-meter and seat-billing drafts cover billable units and seat lifecycle. This plan focuses on renewal notice mechanics, cancellation channel, data recovery and closeout evidence.

## Research question and audience

**Question:** What must a buyer verify before the deadline so that a renewal, cancellation or data export does not surprise the team?

**Audience hypothesis:** small B2B agencies, owner-operators and finance/operations administrators responsible for a handful of SaaS contracts. This is a positioning hypothesis, not verified StackPilot audience data.

## Evidence and editorial rules

1. Use current first-party vendor documentation for Microsoft 365 for business, Atlassian Cloud and Zoom direct subscriptions.
2. Preserve plan, billing-experience, geography and purchase-channel qualifications. Never combine separate products or billing models into one universal timeline.
3. Treat vendor marketing pages for Zylo, Vendr and Tropic as self-described competitor positioning, not independent product testing or savings evidence.
   Vendr's official renewal page returned HTTP 403 when opened directly; only its indexed search-result excerpt was available. Keep the claim narrow and recheck in a real browser before relying on specific workflow details.
4. Exclude Google Workspace cancellation claims from the article because the official help URL redirected to a new Knowledge site that this research session could not retrieve; community answers are not a substitute.
5. Record source access date and any visible update date. Mark any unavailable date or regional/account-specific detail UNKNOWN.
6. Distinguish contract notice deadline, renewal date, billing date, cancellation-effective date, access cutoff and data-deletion date.

## Files

- Create `docs/growth/2026-11-06-saas-renewal-notice-and-cancellation-checklist.md`.
- Create this implementation/research plan at `docs/superpowers/plans/2026-11-06-saas-renewal-checklist.md`.

## Execution sequence

- [x] Inspect AGENTS.md, operating policy, current operational state, PR #1, PR #8, PR #9, issue #4, issue #6 and the latest PR #8 operations artifact.
- [x] Confirm the automatic backlog queue is empty; do not run owner gates.
- [x] Inspect existing TCO, usage-meter, CRM exit-evidence and seat-billing drafts to avoid topic duplication.
- [x] Recheck official vendor documentation and qualitative competitor positioning.
- [ ] Write the dated evidence brief and full unpublished article draft.
- [ ] Review every factual sentence against its cited first-party source and preserve all exceptions.
- [ ] Validate all source URLs, ensure no unsupported Google Workspace community claim, and check that no metrics or prices were invented.
- [ ] Create a draft-only PR from this branch to main; do not merge.
- [ ] Verify exact-head Build, Chromium, Safety/operations and Netlify Deploy Preview statuses before reporting.

## Verification and acceptance

- Three primary-source vendor documentation packets are linked (Microsoft 365 for business, Atlassian Cloud, Zoom); each has scope and exception notes.
- At least three competitor positioning sources are linked; every competitor claim is labeled self-described.
- At least eight qualitative buyer-intent query hypotheses are grouped by intent; no search volume/rank/CPC is asserted.
- Article includes a reusable renewal register, deadline checklist, data-export/retention checks and a clear limitation statement about StackPilot's manual, buyer-entered tools.
- Baseline organic visits, impressions, clicks, CTR, ranking, referrals, leads, conversions and revenue are explicitly UNKNOWN.
- No application, account, post, tracking, analytics instrumentation, provider change, production change, affiliate activation or spend occurs.
- Documentation-only work does not alter runtime behavior; no TDD red/green cycle is claimed. GitHub CI provides repository-wide regression evidence for the new commit.

## Workflow references

- gstack: [plan-eng-review](https://github.com/garrytan/gstack/blob/main/plan-eng-review/SKILL.md), [review](https://github.com/garrytan/gstack/blob/main/review/SKILL.md), and [skill overview](https://github.com/garrytan/gstack/blob/main/docs/skills.md). Applied as Think → Plan → Build → Review → Test → draft-only Ship → Reflect; no runtime implementation was authorized.
- Superpowers: [writing-plans](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md) and [verification-before-completion](https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md). Plan-first, explicit acceptance checks, and fresh evidence before any completion claim.

## Review focus

- Microsoft 365 business lifecycle durations differ by purchase channel/program and some cancellation windows are limited. Explicit deletion is not the same as turning off recurring billing.
- Atlassian's original and improved billing experiences differ; Marketplace-app retention is controlled by the app vendor; product-specific deletion can differ from subscription deactivation.
- Zoom self-service cancellation is not available for every purchase channel or account; add-ons are separate; cloud recording retention is a separate data class.
- A 30/60/90-day reminder is an internal planning choice only, never a substitute for the contract's actual notice clause.
- Do not imply that a StackPilot worksheet reads contracts, connects to billing accounts, sends reminders, cancels subscriptions or stores buyer data.

## Status

Research and drafting only. Human editorial approval and any future public release are separate owner decisions.
