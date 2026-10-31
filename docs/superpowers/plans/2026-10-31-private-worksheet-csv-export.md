# Private requirements worksheet CSV export — implementation plan (2026-10-31)

**User need:** Buyer can copy the worksheet today but cannot save selected CRM/SEO/Hosting requirements in a table to send to providers or track review evidence. Build a browser-local downloadable CSV with no server, telemetry or storage service.

**gstack engineering review:** Reuse the existing `src/lib/buyer-worksheet.mjs` pure validation and static requirement data. There is no legitimate need for packages, backend, tracking, partner APIs or persistent storage. Threat model: spreadsheet formula execution if a future text field starts with =, +, -, @, tab or leading whitespace before a formula; unvalidated selections; stale download after edits; false vendor verification; CSV delimiter/quote/newline handling; mobile/keyboard accessibility. Keep status explicitly *Unverified* and evidence cells blank. No user-provided credentials/data transmitted; downloaded file is user-controlled local storage.

## RED / test-first
1. Add Node tests to `tests/buyer-worksheet.test.mjs` for `buildBuyerWorksheetCsv(category, selectedIds)`: selected-only category-scoped CSV with deterministic order and stable headers; rejected invalid/duplicate IDs; exact RFC-style quoting; formula neutralization through `escapeSpreadsheetCsvCell()` on text including leading whitespace before formulas.
2. Add a source-level test requiring an accessible disabled-by-default `#download-worksheet-csv` button and local Blob download path in `src/pages/tools/requirements-checklist/index.astro`.
3. Commit test-only; inspect GitHub Actions expected RED due to missing exports/CSV control before implementation.

## GREEN / integration
4. Add pure, no-network CSV generator/escaping to `src/lib/buyer-worksheet.mjs`. Exports should use only vetted category/criterion IDs (same validation as existing worksheet), no arbitrary cell content. Include UTF-8 BOM if needed for Excel? Avoid unless necessary; write plain UTF-8 with CRLF lines and quoted cell values.
5. Add browser-local Blob download with stable filename `stackpilot-requirements-<category>.csv`; disable until checklist generated and invalidate generated output on criteria/category changes. On download, update aria-live status without claiming transmission or persistent storage. Explain the file is saved on the buyer's device, and that StackPilot keeps no copy.
6. Extend Playwright Chromium desktop/mobile acceptance to test actual download filename and content, and reset/change invalidation; check axe; do not make network requests.

## Final verification / release gates
7. Run exact-head Node/build, operations and browser workflows and Netlify Deploy Preview status; inspect failures and fix before PASS. Record workflow links and count where available.
8. Update private issue #2/engineering issue #4 evidence, preserving unresolved owner-only gates.
9. **Never merge main, unlock Netlify, launch publicly, activate affiliates, spend, buy, accept a contract, approve a vendor claim or enable indexing.** ₹0 monthly and delegated spend; Private/Locked remains.
 
**Skill sources (methodology only):** `garrytan/gstack` plan-eng-review/review/qa SKILL.md; `obra/superpowers` writing-plans/test-driven-development/verification-before-completion SKILL.md. Their slash commands were not executed here.
