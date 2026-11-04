# Backup restore drill RPO/RTO assessment — 2026-11-01

**Scope and budget:** StackPilot AI private draft PR #1 on `feature/phase-1-1-recommendation-engine` only; ₹0 monthly and delegated spend. No new dependencies, accounts, deployments to production, affiliate links or contracts.

## User value
A buyer planning a hosting change should be able to compare **user-entered** measured restore time to their **user-entered** Recovery Time Objective (RTO), and **user-entered** backup recovery-point age to their **user-entered** Recovery Point Objective (RPO). This is different from automatically proving recoverability. Users need a local, shareable drill-readiness report and CSV without putting account details or files into StackPilot.

## Model contract
New `src/lib/backup-restore-drill.mjs` exports:
- `assessBackupRestoreDrill(input)` accepts exact fields `targetRtoMinutes`, `observedRestoreMinutes`, `targetRpoMinutes`, `observedRecoveryPointAgeMinutes`, `restoreTested`, `dataIntegrityChecked`. Strict integer strings 0..1,000,000 for all four numeric fields except target RTO must be positive. Observed values may be empty string meaning **unknown** and never imply a pass. Both booleans required. RPO target 0 allowed for near-zero-loss planning; comparisons are inclusive.
- Return **NO_GO** when any observation is unknown, RTO or RPO exceeded, restore test not self-attested, or integrity not self-attested. Only return **READY_FOR_HUMAN_REVIEW** if all pass; always `independentlyVerified:false`, `cutoverAuthorized:false`, and user-entered-only attribution.
- `formatBackupRestoreDrillReport(result)`, `formatBackupRestoreDrillCsv(result)` revalidate exact result by recomputing, refusing tampered counts/approvals. CSV has fixed strings and numeric values, unverified evidence, never formulas or personal data.

## User interface and QA
New `src/pages/tools/backup-restore-drill/index.astro` with six accessible inputs, local-only calculation and downloadable offline CSV, report copy, disabled stale export on change/reset/errors. Explain RTO is *not guaranteed real service downtime*, backup age is *not confirmed lost data*, and testing must be authorized. No network calls or service access. Disclose Netlify Web Analytics may log page visits but never receives inputs.

Link from `src/pages/guides/hosting-migration-checklist/index.astro` (no change to existing seven sections) and homepage. Add desktop/mobile Playwright+axe assertions to `scripts/browser-acceptance.mjs`; add pure `tests/backup-restore-drill.test.mjs` and UI `tests/backup-restore-page.test.mjs`.

## Test-first and verification
1. Record plan. Commit behavior tests and stub first; observe **RED** in GitHub CI.
2. Implement pure calculator and strict report/CSV from tests; add UI and browser regressions; rerun **GREEN**.
3. Confirm 3 latest commit-specific workflows (validate/build/ops/Chromium) and Netlify protected Deploy Preview status; keep **remote authenticated UAT separate**.
4. Record evidence in draft PR #1. Public launch, claim signoff, editor/legal/identity/billing approval and actual restoration remain owner/authorized-operator gates.

## gstack/Superpowers engineering review
- Think: real need is objective-vs-observation tracking; use minutes only to avoid ambiguity.
- Plan: one pure model, one static page, two tests, two navigation links and one browser scenario.
- Threat model: user values untrusted; no PII fields, no file upload, no URLs; output never authenticates test evidence. Reject precision/overflow, negatives, scientific notation, whitespace, leading-zero numeric strings.
- Review: do not tell users that simulated numbers prove recoverability or guarantee service restoration. Actual RPO/RTO depend on production writes, dependencies, network and cutover conditions.
- Test/ship: exact SHA only, protected draft PR, no provider account changes, no production.
