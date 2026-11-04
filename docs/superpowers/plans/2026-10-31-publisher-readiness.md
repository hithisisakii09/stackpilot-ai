# Phase 2.11 — Publisher identity and affiliate application readiness packet (private)
**Date:** 2026-10-31. **Scope:** private development branch PR #1 only. **Cash/delegated budget:** ₹0.

## Engineering and trust problem
The current site has useful private buyer tools, but cannot plausibly demonstrate a real operator, accessible public publisher, authenticated editorial reviewer, proven organic traffic or approved affiliate account. Generating more pages would not close these gates. We need a truthful, deterministic audit that shows what is still missing, without fabricating identity, applying on the owner's behalf, or collecting sensitive financial details.

## Source evidence & method
- Read `AGENTS.md`, `docs/current-operational-state.md`, owner issue #2, affiliate issue #3, `config/operating-policy.json` and the first-party program eligibility summary.
- Follow gstack engineering review and Superpowers test-driven RED→GREEN plus verification-before-completion.
- Never interpret a public affiliate-program URL as program enrollment or traffic evidence.
- Do NOT store bank IDs, tax IDs, passwords, ID documents, legal signatures, applicant contact details or private account data.

## Task 1 — Fail-closed owner readiness model
New pure `src/lib/publisher-readiness.mjs` consumes `config/operating-policy.json`, catalog and partner candidates.
Return machine report with (a) actual observed, non-sensitive site capabilities, (b) mandatory owner-only proof gates and missing evidence, (c) program-specific preapplication research order, (d) 0 submissions, 0 approved programs, no known revenue and `applicationReady:false`.
Reject policy changes that imply paid services, launch/affiliate approval, verified catalog claims or non-null links.
No source field must be described as actual owner identification, publisher audience or affiliate acceptance.

## Task 2 — Read-only report and test
- Write `tests/publisher-readiness.test.mjs` and `tests/publisher-readiness-cli.test.mjs` first (expected RED). Cover no invented social proof, no fake accounts, guard ordering, budget/approval rejection, deterministic output, no source mutation.
- Implement `scripts/publisher-readiness-report.mjs`, npm alias `publisher:readiness`.
- Include a compact, fail-closed `publisherReadiness` summary in existing `ops:report`.
- Avoid adding third-party packages or new browser pages; let existing CI verify no regression.

## Task 3 — Actual owner handoff packet (unpublished)
`docs/publisher-readiness/2026-10-31-owner-application-packet.md` contains:
- truthful StackPilot description and value prop (free software decision-support and privacy-only calculators);
- Pipedrive and HubSpot application **draft responses**, explicitly conditional on future public site, legitimate audience and owner credentials;
- platform-specific channel, traffic and eligibility evidence gaps; accurate statuses, no invented statistics;
- contact/identity/terms/payout fields marked owner-only but **no private values**;
- final, non-public disclosure/privacy/operator identity review list;
- precise after-approval tracking and earnings proof instructions for later, requiring fresh owner authorization.

## Verification and scope boundaries
Read GitHub actions for exact final SHA. Record Node test, build, desktop/mobile Chromium and Netlify private Deploy Preview status; distinguish local CI from authenticated remote UAT. Update draft PR and issues #2/#3. Never merge main, change production Private/Locked settings, lift noindex, enable a tracking link, sign/apply to any program, spend or publish. A readiness checklist does not equal owner approval.
