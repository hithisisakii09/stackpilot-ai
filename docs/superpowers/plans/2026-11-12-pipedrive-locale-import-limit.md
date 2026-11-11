# Pipedrive Import Locale Consistency — Plan

**Date:** 2026-11-12  
**Status:** PRIVATE RESEARCH ONLY — UNAPPROVED — NOT PUBLISHED  
**Base:** `main@1672461bea5fa09e01965c5e8bdd4819852b06fd`  
**Branch:** `growth/pipedrive-locale-import-limit-2026-11-12`  
**Budget:** ₹0

## Goal

Improve the existing CRM exit-evidence brief with one source-quality caveat: Pipedrive's older Thai help translation shows a different spreadsheet row limit from newer English and other localized versions. Do not create another article, route or calculator.

## Evidence reviewed

1. **English Pipedrive spreadsheet-import guide**, last updated 2026-10-19: up to 200,000 rows, file under 50 MB, correct global permission required; import revert is limited to global admins and 48 hours.
   - https://support.pipedrive.com/en/article/importing-data-into-pipedrive-with-spreadsheets
2. **Indonesian translation**, last updated 2026-10-19: 200,000 rows and under 50 MB.
   - https://support.pipedrive.com/id/article/importing-data-into-pipedrive-with-spreadsheets
3. **Traditional Chinese translation**, last updated 2026-10-19: 200,000 rows and under 50 MB; page labels itself machine-translated and not human-edited.
   - https://support.pipedrive.com/zh-hant/article/importing-data-into-pipedrive-with-spreadsheets
4. **Thai translation**, last updated 2026-04-27: 50,000 rows and no more than 50 MB; page labels itself machine-translated and not human-edited.
   - https://support.pipedrive.com/th/article/importing-data-into-pipedrive-with-spreadsheets

The page discrepancy is evidence of documentation freshness/localization inconsistency. It does **not** establish a Thailand-specific or account-region-specific feature limit. No Pipedrive account was accessed and no import was performed.

## Scope

- Update `docs/growth/2026-11-02-crm-exit-evidence-and-ethical-distribution.md` only with the dated locale comparison, interpretation guardrail and buyer-intent hypotheses.
- Correct the document's stale queue snapshot and stale PR #1 merge statement.
- Add this plan under `docs/superpowers/plans/`.
- Coordinate the result in open issue #6 because issue #4 is closed.

## Buyer-intent hypotheses

- `Pipedrive spreadsheet import row limit`
- `Pipedrive CSV import file size limit`
- `Pipedrive import duplicates and field mapping`
- `Pipedrive import revert 48 hours`
- `Pipedrive Thai import row limit` (localization fact-check query only; not a regional-limit claim)

These are qualitative task/intent hypotheses. Search volume, difficulty, CPC, rankings, impressions, clicks and traffic are UNKNOWN. Do not create keyword-variant pages.

## Competitor and distribution scope

- Reuse the existing CRM migration-tool competitor scan already recorded in issue #6 (Suprdense Switch, Sanka Migrate, Vern and Migaru); do not generate a duplicate comparison article.
- Reuse the existing ethical zero-cost channel assessment in the CRM brief: Google Search Console and Bing Webmaster Tools only after an owner-authorized public release and verified site ownership; LinkedIn/Reddit only with authentic, relevant, rule-compliant human participation.
- No account creation, indexing submission, public posting, external outreach or link promotion.

## Explicit non-goals

- No changes to `src/data/research-claims.json`, source-intake dates, claim approval/reviewer fields, product verification or affiliate records.
- No pricing, plan, geographic eligibility, tax, migration-performance or independent-testing claim.
- No new public route, runtime code, dependency, analytics, tracking, structured data or SEO metadata.
- No edits to `main`, no merge, no production promotion, noindex removal, privacy change, provider change or spending.
- Keep all six vendor claims candidate-only, all affiliate URLs null, Netlify Private/Locked as last owner-reported, and budget ₹0.

## Plan / review sequence

1. **Think / inspect:** read repository instructions, operating policy, current operational state, open PRs, issue #6 and the existing CRM brief; confirm no open PR edits the target.
2. **Source review:** compare the four official locale pages and preserve each page's own update date and translation warning.
3. **Build:** make a narrow documentation-only update to the existing brief; do not add a second article.
4. **gstack review:** manually apply current `/review` scope/evidence/safety checks. Upstream gstack states `/plan-eng-review` was cut on 2026-11-06; its eng-review methodology is now in `/autoplan`. This host did not expose an installed gstack command runtime, so no slash command or setup script is claimed to have run.
5. **Superpowers verification:** this is documentation-only; no executable behavior changes, so TDD RED/GREEN is not applicable and no behavior-test claim is made. Verify the exact changed files and run the repository's full PR CI (build/tests, operations, Chromium, Netlify Deploy Preview).
6. **Reflect:** report exact commit and check results; leave the PR draft and unmerged.

## Acceptance criteria

- The English 200,000-row statement is dated and attributed to the 2026-10-19 vendor page.
- The older Thai 50,000-row translation is accurately described as a machine-translated, older page; it is not presented as a regional limit.
- Indonesian and Traditional Chinese pages are recorded as matching the newer English figure.
- No catalog claim is approved; no source-intake date or reviewer field changes.
- No traffic, ranking, conversion, commission or revenue metric is invented.
- Noindex/privacy protections, affiliate prohibitions, Netlify hold and ₹0 policy are unchanged.
