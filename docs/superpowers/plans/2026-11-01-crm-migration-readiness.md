# StackPilot AI — Phase 4.1 CRM migration rollback readiness worksheet

**Date:** 2026-11-01. **Status:** private-development plan only. **Budget:** ₹0.

## Why this buyer feature
CRM migration guides currently have a static acceptance matrix and synthetic CSV, but no executable way for a buyer to compare source/target test record counts and their proposed rollback window. A small reproducible offline check gives independent value for organic-growth content without asserting vendor capabilities, accessing a customer account, or inventing pricing.

## User promise and decision boundaries
Provide a private noindex `/tools/crm-migration-readiness/` page that accepts only:
- sourceRecordCount and targetRecordCount (decimal integer strings, 1..10,000,000; fictional or **user-aggregated**, never personal data);
- cutoverWindowMinutes and measuredRollbackMinutes (decimal integer strings, 1..1,440);
- five evidence selectors: `exportPermission`, `mappingValidation`, `associationOwnership`, `integrationChecks`, `backupRestore`, each `not-assessed`, `pass` or `fail` (self-reported only).

`NO_GO` if **any** selector not passed, counts differ, or rollback duration exceeds proposed cutover window. All seven checks satisfied yields only `READY_FOR_HUMAN_REVIEW`; **never** GO or actual migration approval. If the source and target record counts are equal, that does **not** establish data integrity, permissions, or record completeness. No API integrations, files uploaded, analytics events, contact identifiers, vendor account data, browser storage, passwords, or payment requests. Strong UI warning about not entering personal customer data and source aggregates requiring authorization.

## Minimal implementation
- `src/lib/crm-migration-readiness.mjs`: strict schema, pure integer math, copy-by-value snapshot, blocker list, independentlyVerified:false, migrationAuthorized:false, verifiedVendorCompatibility:false, dataSource:user-entered-only, result statuses, and guarded plain-text + fixed-schema CSV exporters that recompute and reject forged status, approval, calculations, or fields. No dynamic CSV strings.
- `src/pages/tools/crm-migration-readiness/index.astro`: keyboard-accessible form, explanatory cautions, local copy/download buttons disabled until assessment, invalidation/reset, noindex and responsive design, offline file no network.
- Link tool from CRM migration guide and homepage. Add a new manual QA scenario to SHA-bound private UAT packet.
- `tests/crm-migration-readiness.test.mjs`: exact counts, shorter-than-window checks, unknown and failing gates, malformed/overflow input, counterfeit approvals, immutability, CSV formula safety.
- `tests/crm-migration-readiness-page.test.mjs`: actual route, navigation, noindex, privacy and offline-only checks.
- Extend Chromium desktop/mobile QA to exercise NO_GO, READY_FOR_HUMAN_REVIEW, stale invalidation, actual CSV download and axe; static build audit scans all routes.
- TDD: plan, tests first and observe RED, minimal implementation, full exact-head GREEN.
- gstack Think/Plan/Review/QA and Superpowers TDD RED→GREEN and verify-before-completion; manually apply upstream SKILL.md guidance, no external installation.

## Stop conditions
Do **not** merge draft PR #1 or change main, production, visibility, Noindex, Netlify account/plan, legal/research approval, affiliate applications, tracking or user commitments. All hosted UAT and owner approvals remain outstanding. New page is a **planning worksheet** and no real data migration or rollback is undertaken. Cost ₹0.
