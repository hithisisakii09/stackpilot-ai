# Vendor question preview — 2026-10-31

> **For agentic workers:** Superpowers TDD/writing-plans/verification-before-completion and gstack plan→review→QA methods apply.

**Goal:** Let a private-preview visitor read six neutral vendor-verification questions before downloading the related local CSV.

**Architecture:** Export `listVendorQuestions(model)` from the existing vendor-questions module. Use that same validated list to build the CSV and a DOM-created ordered list after a successful comparison. Category/selection changes clear the existing comparison and preview.

**Files:** `src/lib/vendor-questions.mjs`, `tests/vendor-questions.test.mjs`, `src/pages/compare/index.astro`, `scripts/browser-acceptance.mjs`.

**Safety:** All six candidates remain unapproved and unranked; no vendor quotes or prices, no affiliate activation, no network writes or tracking, no new packages, no storage. Main unchanged, Netlify preview private, PR draft/unmerged, ₹0 monthly and delegated budget, no production approval.

## TDD and QA checklist
- [x] Reproduce missing `listVendorQuestions` via local red test: 0/3 tests passed (missing function).
- [x] Extract source question list, reuse for CSV, verify local green test: 3/3 passed.
- [x] Add repository tests for 3 categories, CSV/list equality, invalid candidates, and isolation against mutation.
- [x] Add browser-visible `<ol>` with six questions created using text nodes, not `innerHTML`.
- [x] Extend Chromium checks for CRM, SEO, Hosting, invalid duplicates and category changes.
- [ ] Check exact-head CI build/tests and safety, Chromium/axe, and Netlify deploy preview status.
- [ ] Separately obtain authenticated remote protected-preview testing before public release.

**Review risks:** Stale question list after changing options, inconsistent questions between browser and CSV, unsafe DOM injection, fabricated vendor endorsement, a11y landmarks/heading order, accidental public launch. Use the successful CI evidence before declaring any check passed. No public launch is authorized.

**Upstream references consulted:** Superpowers `skills/test-driven-development/SKILL.md`, `skills/writing-plans/SKILL.md`, `skills/verification-before-completion/SKILL.md`; gstack README Think→Plan→Build→Review→Test→Ship→Reflect methodology. No upstream scripts installed or run.
