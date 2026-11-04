# Phase 2.10 — Hosting state / autonomous handoff reconciliation (documentation and regression gate)
Date: 2026-10-31. Private engineering only.

## Motivating defect
Four active agent/runbook documents conflict with owner dashboard screenshots and GitHub commit checks. One says Netlify **has not been deployed**, another says **do not deploy** as if signup is pending, and several still treat Vercel as the primary protected preview even though Vercel Hobby has a noncommercial build-rate failure. Inaccurate instructions could misroute agents or induce an owner to unlock/publish unnecessarily.

## Grounded evidence (source distinctions)
- **Owner screenshot:** Netlify project `inspiring-chaja-cfb85f`, private production visibility, private Deploy Previews, automatic publishing locked; old published `main@c8fadcb`.
- **Owner-reported browser:** authenticated preview homepage/compare/research work and unauthenticated incognito is blocked. User report, not an independent penetration test.
- **GitHub commit checks:** PR #1 `netlify/inspiring-chaja-cfb85f/deploy-preview` success; separate Vercel preview is build-rate-limited, no upgrade authorized.
- **GitHub code/CI:** development feature branch and draft PR #1 are unmerged; `config/operating-policy.json` has ₹0/month and ₹0 delegated, no commercial/public/affiliate approvals; latest verified build / Chromium must be checked fresh each run.
- **Not verified independently:** exact provider pricing/account entitlement, authenticated browser UAT of every new Netlify build, full anonymous access test, actual response-header behavior, legal/privacy policy signoff, affiliate program approvals, publisher identity.

## Implementation
1. TDD RED: add `tests/hosting-handoff.test.mjs` asserting the centralized status record and safe references from `AGENTS.md`, `docs/autonomous-business.md`, `docs/zero-budget-hosting.md`, and `docs/roadmap-to-launch.md`, rejecting legacy contradictory text.
2. GREEN: add `docs/current-operational-state.md` with evidence provenance, as-of timestamp, working URLs, release blockers, owner vs agent responsibilities and rollback/safety guidelines. Do not claim remote tests not actually run.
3. Reconcile the four existing runbooks without deleting historical developer guidance. Keep Vercel Hobby as legacy development, Netlify private preview as primary, noindex distinct from authentication, 0 cash budget.
4. Verify current SHA via Node suite and private GitHub ops/browser CI, then update PR #1 and issue #2. Avoid external account changes and minimize unnecessary builds.

## Guardrails
No Netlify visibility changes, production deploy, unlocking, `main` merge, public SEO, paid upgrade, contracts, affiliate application or tracking, fabricated owner identity, or user data.
Methodology references: gstack `plan-eng-review` and Superpowers `verification-before-completion`, `test-driven-development`.
