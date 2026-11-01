# Phase 2.12 — Private CRM paid-seat audit

Prepared: 2026-11-01. Development only; no production authorization.

## Buyer problem
The private CRM seat-billing research distinguishes billed capacity, paid-seat occupancy, deactivated users, free/view-only roles and renewal timing. Build a buyer-entered, provider-neutral worksheet without vendor prices, refund eligibility or saving estimates.

## Work and evidence
- Pure module src/lib/crm-seat-audit.mjs: bounded integer counts 0–10000, strict fields, no inferred billing impact.
- Tests tests/crm-seat-audit.test.mjs: local RED against missing behavior 10/10 failed as expected; local GREEN 10/10 passed. Repository CI is authoritative for full build.
- Private web form src/pages/tools/crm-seat-audit/index.astro with browser-only calculations, accessible labels, no signup, network form or persistence, and stale-result invalidation.
- Link from existing subscription calculator and assert static route, noindex, and disclaimers through scripts/check-build.mjs.
- Check exact resulting SHA with GitHub build, operations, Chromium browser QA, and Netlify preview status. Remote authenticated UAT remains separately blocked.

## Safety constraints
Active and invited users are contextual, not automatically paid seats. Zero billed seats yields N/A. No paid occupancy exceeding billed capacity. Confirmed checkbox answers yield READY_FOR_HUMAN_REVIEW, never approved billing, product or refund assertions. Billing impact UNKNOWN; refund eligibility null. No vendor prices, private customer data, storage, external network calls, or affiliate links.

## Owner restrictions
Keep draft PR #1 unmerged and main unchanged; Netlify Private/Locked, noindex, ₹0 monthly and delegated budgets, no public promotion, affiliate activation, legal agreements or purchases. CI success is not authenticated remote UAT.

## Method references
Repository AGENTS.md; gstack plan engineering review; Superpowers test-driven-development and verification-before-completion. No third-party skill installer executed.
