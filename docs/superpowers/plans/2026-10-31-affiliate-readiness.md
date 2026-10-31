# Phase 2.3 — Zero-cost affiliate partner intake and readiness engine
Date: 2026-10-31

## User intent and boundaries
The owner has **personally tested the Netlify private preview** while logged in, confirmed home/compare/research work, and reported Incognito access blocked. Record this as owner-reported QA evidence, not an independent security assessment.
Keep **₹0 monthly budget; ₹0 delegated spend**. Do not create affiliate accounts, submit applications, accept terms, attach trackers, enable referral URLs, merge main, change Netlify privacy, unlock production, or publish.

## gstack engineering review / Superpowers plan
Need a canonical, tamper-evident **candidate-only affiliate program intake** that an autonomous agent can read, review, and prioritize after real eligibility evidence is available. Product information is unverified; an official vendor program page is **not evidence of program acceptance**.

Approach: static data file + pure validation + deterministic queue + CLI output + CI check. Reuse the existing catalog, test runner and operations report. Avoid SaaS costs, new dependencies, background pollers, network access in CI, or external account actions.

## Task 1 — TDD candidate program model
Files: `src/data/affiliate-programs.json`, `src/lib/affiliate-readiness.mjs`, `tests/affiliate-readiness.test.mjs`.

- RED: tests reject unknown/duplicate vendor IDs, non-HTTPS URLs, redirect/tracking/referral URLs, fake approvals/contracts, revenue assertions, future source-intake dates, missing sources, program reviews falsely marked approved, and nonzero budget authorization.
- GREEN: candidate records for five programs (Pipedrive, HubSpot, Kinsta, Semrush, Cloudways) and an explicit research-needed gap for Ahrefs. Distinguish **known program URL** from eligibility, commission claims and account acceptance. Use official vendor source URLs only.
- Expose deterministic review task queue: Pipedrive/HubSpot for later owner consideration; Kinsta requires substantive content and custom domain, Semrush requires a real audience, and Cloudways requires payment/eligibility review; none is an application or link activation.

## Task 2 — Operational integration
Files: `scripts/affiliate-readiness-report.mjs`, `scripts/ops-report.mjs`, `scripts/validate.mjs`, `package.json`, `tests/affiliate-cli.test.mjs`.

- Read-only `npm run partners:queue -- --json` returns application candidate backlog, zero approvals, and no earnings.
- Enforce matching catalog and candidate-only ledgers in `npm test`.
- Inject `affiliatePreparation` into existing read-only operations report without changing canMonetize false.
- Use existing CI artifact output rather than adding a paid polling job.

## Task 3 — Verification and governance
- Confirm RED on GitHub actions before model implementation.
- Inspect GREEN on current SHA: Node tests, 12 pages, browser QA and operations report.
- Record final commit and links in draft PR #1 and GitHub issue #3.
- No production release or any external partner action.

## Human gates
All affiliate applications, country eligibility, company information, signed agreements, tax/KYC and actual tracked links require owner authorization and truthful evidence. Money cannot start merely from program discovery.
