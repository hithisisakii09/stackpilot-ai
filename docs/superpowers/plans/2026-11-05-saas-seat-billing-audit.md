# SaaS Seat Billing & Unused-License Audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare one private, source-anchored buyer guide that helps small teams distinguish billable seats, assigned users, permissions, shared usage pools and offboarding/billing timing before renewal.

**Architecture:** Documentation-only. Add one dated research brief and unpublished article draft under `docs/growth/`. Reuse the existing browser-only CRM paid-seat audit and software cost calculator; do not add a new route, vendor-specific logic, tracking, or dependencies.

**Tech Stack:** Markdown, GitHub branch/PR workflow, existing read-only operating artifacts and GitHub Actions.

**Spec:** User request for StackPilot AI organic-growth research; `AGENTS.md`; `config/operating-policy.json`; current operational state.

## Global Constraints

- Monthly budget ₹0; delegated spend ₹0; paid services and commercial hosting remain unapproved.
- Production launch, indexing, affiliate activation, and paid services remain false.
- Do not change `main`, PR #8, Netlify settings, production, `robots.txt`, `public/_headers`, product verification, source intake dates, editorial approvals, or affiliate URLs.
- Keep all vendor statements attributed as first-party claims, candidate-only and unapproved; no customer-account testing is claimed.
- No vendor prices or savings estimates unless a current primary source, exact plan and applicable geography are established; this guide intentionally avoids price tables.
- No account creation, application, outreach, external post, tracking, analytics instrumentation or publication.
- Do not execute the owner-only gates in the operating backlog.

## Review Focus

- HubSpot's seat-based model, legacy accounts and flexible seats-and-credits supplement are not interchangeable; state model and subscription-date caveats.
- Pipedrive distinguishes billed seats from active users; retaining an empty seat can retain billing, and adding a seat can create an immediate prorated charge.
- Ahrefs removes access immediately but documents a pending seat-add-on downgrade through the end of the billing period.
- Semrush's added-user costs depend on included toolkits; some toolkits require separate per-user access, and deleting a user does not itself remove the additional subscription seat.
- Deactivation can affect ownership, syncs, reports, integrations and other records; never imply a billing-only change is operationally safe.
- StackPilot's worksheet uses buyer-entered counts only; it cannot inspect invoices, determine contract terms, confirm savings or change vendor accounts.

---

## Scope and Files

- Create `docs/growth/2026-11-05-saas-seat-billing-and-unused-license-audit.md` — qualitative buyer-intent hypotheses, competitor scan, primary-source evidence ledger, unpublished article draft, measurement plan and zero-cost distribution research.
- Create this plan at `docs/superpowers/plans/2026-11-05-saas-seat-billing-audit.md`.
- Coordinate with the existing open human evidence-review thread in issue #6. Issue #4 is closed; do not reopen it.
- Base the work on `main@1672461bea5fa09e01965c5e8bdd4819852b06fd` in a separate growth branch so PR #8's already accepted Phase 2 preview is not changed.

## Plan

- [x] Inspect `AGENTS.md`, `config/operating-policy.json`, current operational state, PR #1, PR #8, issue #4 and issue #6.
- [x] Inspect the latest exact-commit operations artifact at PR #8 head `289d1b6d05bc1ead2ee81e424d4d8ae72d45cf85`. Its deterministic `ops:backlog` queue reports zero automatic tasks, six prepared-unapproved packets, six pending editorial reviews, zero approved claims, four owner gates and zero applications/accepted programs/tracking links. Do not execute owner gates.
- [x] Confirm the existing CRM seat-audit worksheet and TCO guide; avoid duplicating their arithmetic or broad cost model.
- [x] Reopen official HubSpot, Pipedrive, Ahrefs and Semrush seat/billing documentation; inspect adjacent SaaS spend-management competitors and current measurement/community policies.
- [ ] Write a distinct buyer guide about seat assignment, billing state, renewal timing, usage entitlements and offboarding dependencies.
- [ ] Add measurable post-approval metrics and explicitly UNKNOWN current traffic, impressions, rankings, leads and conversions.
- [ ] Review every vendor statement against its cited first-party source; label plan, pricing-model and geography limits; keep all claims unapproved.
- [ ] Review the documentation-only diff for scope creep, unsupported prices, savings promises, affiliate influence, privacy implications and release-safeguard changes.
- [ ] Open a draft PR targeting `main`; verify exact-head build, browser, safety/operations checks and Netlify Deploy Preview status. Do not merge.

## Verification

- No TDD RED/GREEN cycle is claimed because no executable behavior changes.
- Run the repository's existing CI through the draft PR: unit/data validation, Astro build, release preflight, Chromium desktop/mobile and accessibility checks, safety/operations and preview package checks.
- Confirm `affiliateUrl` remains null, all six vendor claims remain unapproved, noindex/security headers are unchanged, and the operating policy remains ₹0.
- A successful CI run or Netlify status does not prove account-level Private/Locked settings, served-commit identity, billing status, traffic or editorial approval.

## Review References

- gstack plan-eng-review: https://github.com/garrytan/gstack/blob/main/plan-eng-review/SKILL.md
- gstack review: https://github.com/garrytan/gstack/blob/main/review/SKILL.md
- gstack QA: https://github.com/garrytan/gstack/blob/main/qa/SKILL.md
- Superpowers writing-plans: https://github.com/obra/superpowers/blob/2ce8aa15d05bd57213e6f746f953aafb7ded7a8b/skills/writing-plans/SKILL.md
- Superpowers verification-before-completion: https://github.com/obra/superpowers/blob/2ce8aa15d05bd57213e6f746f953aafb7ded7a8b/skills/verification-before-completion/SKILL.md
- Superpowers requesting-code-review: https://github.com/obra/superpowers/blob/2ce8aa15d05bd57213e6f746f953aafb7ded7a8b/skills/requesting-code-review/SKILL.md

## Status

- [x] Branch created from the verified main checkpoint.
- [x] Research brief committed in `1b5ec6030bae63ed170d511e21f664c2ded086d3`.
- [ ] Draft PR and exact-head CI/preview verification complete.
