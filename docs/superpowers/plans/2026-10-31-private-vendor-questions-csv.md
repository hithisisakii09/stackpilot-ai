# Private Vendor Verification Worksheet Implementation Plan

> **For agentic workers:** Test-first execution with Superpowers and gstack review/QA/verification methodology.

**Goal:** Allow a visitor comparing two same-category software candidates to download a local CSV of impartial questions and unverified responses, without collecting data, inventing product facts, or activating affiliates.

**Architecture:** A pure browser-safe CSV formatter takes the already validated `compareCandidates()` model. The comparison Astro page offers a disabled-until-valid download button; changing category or candidates invalidates its snapshot. No API calls, dependencies, persistence, or browser tracking.

**Tech stack:** Existing Node 22+ test runner, Astro, browser Blob download, Playwright Chromium and axe.

## Constraints
- Work only on `feature/phase-1-1-recommendation-engine`, draft PR #1; no merge, production, publishing, payment, account, affiliate, or spending changes.
- Keep all six vendor records unverified; do not infer suitability, vendor quotes, approvals or recommendations.
- ₹0 budget. Reuse existing `Blob` download pattern. No packages or remote scripts.
- Every exported vendor response is `Unverified`; buyer can fill in independent evidence.
- CSV must escape quotes and neutralize spreadsheet formula injection in candidate names.
- Do not claim success without exact-head CI and Netlify statuses; remote protected site acceptance is a separate gate.

## Task A: Pure export
- Add `tests/vendor-questions.test.mjs` asserting CRM/SEO/Hosting questions, 2 vendor names, unverified status, 7 CSV records, invalid model rejection, CSV quoting and formula injection protection.
- Verify RED locally: module import absent, `node --test tests/vendor-questions.test.mjs` exited 1.
- Add `src/lib/vendor-questions.mjs` exporting `buildVendorQuestionsCsv(model)`.
- Verify GREEN locally: 4/4 tests pass (`node --test tests/vendor-questions.test.mjs`).

## Task B: Browser interaction and QA
- Modify `src/pages/compare/index.astro`: disabled CSV button, invalidate on field change and invalid comparison; successful comparison generates safe local CSV with vendor names only and no server request.
- Extend `scripts/browser-acceptance.mjs`: CRM download and CSV content, invalid selection disabled state, SEO/Hosting category reset, no stale export.
- Review display copy, noindex, privacy, accessibility and download name. Run full GitHub CI at final SHA; note any failures.
- Do not promote to public hosting or mark product evidence approved.

## Review focus
- Duplicate vendors or unsupported categories: reject/disable export.
- Formula-looking vendor label: CSV cell prefixed to prevent spreadsheet interpretation.
- Old selection after category changes: clear export and disable button.
- CSV containing a fabricated price or winner: never generate such facts.
- Protected Netlify preview success is not authenticated remote acceptance.

**Skill references:** Superpowers writing-plans, test-driven-development and verification-before-completion; gstack plan-eng-review and qa. Skills guide process; they do not authorize release.
