# Hosting cutover NO-GO gate assessor — development implementation plan

**Date:** 2026-11-01. **Scope:** private StackPilot AI feature branch and draft PR #1 only. **Budget:** ₹0.

## Product need / gstack engineering review
The existing hosting migration guide provides five paper GO/NO-GO checkpoints, but there is no interactive way to identify missing evidence or export a standardized human-review worksheet. Build an original, entirely browser-local assessment that never approves a real cutover, changes DNS, or suggests evidence exists without a user choice.

The assessor is a decision *preparation* tool, not an authorization system. Even if a person marks every gate Pass, the output must read **READY_FOR_HUMAN_REVIEW** (not GO or an official approval). If any gate is Failed or Not assessed, result must say **NO_GO**; unverified inputs must remain explicitly user-attested only. Keep no user names, accounts, domains or credentials.

## Contract
Create `src/lib/hosting-cutover-assessment.mjs` exporting:
- `assessHostingCutover(input)`: exact five keys `dnsEmail`, `backupRestore`, `tlsDependencies`, `rollbackAuthority`, `retentionBilling`, each strictly one of `not-assessed`, `pass`, `fail`; no other keys. Return deterministic counts, list of blocking gates, `NO_GO` or `READY_FOR_HUMAN_REVIEW`, `independentlyVerified:false`, `launchAuthorized:false`, `dataSource:'user-entered-only'`.
- `formatHostingCutoverReport(result)`: text report with all five named gates and explicit blockers. Reject tampered/fabricated review objects by re-evaluating the five inputs and exact result fields.
- `formatHostingCutoverCsv(result)`: quoted, CRLF CSV columns `gate,status,evidence_status`, fixed labels and statuses; no formulas, arbitrary strings, or customer data. Reject fabricated results, mark self-attested selections `UNVERIFIED`, include overall status as a special row and launch authorization as `false`.

Create `src/pages/tools/hosting-cutover-gates/index.astro` with five labelled select controls, default `not-assessed`; generate textual summary and offline downloadable CSV; invalidate report/copy/download after any change or reset; WCAG keyboard/mobile and browser no-requests test. Clearly tell users to keep evidence in their own system and not enter sensitive data. Note historical Netlify Web Analytics at provider level; the controls do not submit selected responses.

Link from `src/pages/guides/hosting-migration-checklist/index.astro` and `src/pages/index.astro`. Update `scripts/browser-acceptance.mjs` for representative desktop/mobile and axe tests. Create `tests/hosting-cutover-assessment.test.mjs` and `tests/hosting-cutover-page.test.mjs`.

## Test-first checklist / Superpowers
1. Commit this plan only; no public production operations.
2. Add tests for incomplete all, one fail, five passes, unexpected values, invalid schemas, no input mutation, report/CSV no authorization and forged output rejection. Commit before implementation and **observe actual RED CI**.
3. Implement minimal pure logic; then route and UI; run GitHub Actions GREEN.
4. Review with gstack security, privacy, accessibility and release boundaries. Browser QA desktop/mobile, CSV download content, stale input invalidation, reset, and no data submission. Report exact SHA, CI, Netlify status.
5. Keep PR DRAFT, do not merge or release, do not activate affiliates, purchase services, index, or bypass any owner approvals.

## Restrictions
All code may be revised only on `feature/phase-1-1-recommendation-engine`. No changes to `main` / production; no provider account changes; leave Netlify Private/Locked, noindex, no commercial launches or actual partner activity. Source skill references: gstack plan-eng-review/review/qa; obra/superpowers writing-plans/test-driven-development/verification-before-completion. Applied methodology, no external skill executables installed.
