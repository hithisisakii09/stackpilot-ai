# Pipedrive Import Locale Consistency — Verification Plan

**Date:** 2026-11-13  
**Status:** PRIVATE RESEARCH ONLY — UNAPPROVED — NOT PUBLISHED  
**Base:** `main@1672461bea5fa09e01965c5e8bdd4819852b06fd`  
**Branch:** `growth/pipedrive-locale-import-limit-2026-11-12`  
**Budget:** ₹0

## Goal

Correct the existing CRM exit-evidence brief using a direct-browser recheck of Pipedrive's localized spreadsheet-import documentation. The earlier search-index snapshot suggested a 50,000-row Thai/Indonesian limit; the current directly rendered pages show 200,000 rows across all six checked locales. Do not create another article, route or calculator.

## Evidence reviewed — direct browser, 2026-11-13

All six public pages rendered without sign-in. Each displayed an update date of 19 October 2026, a maximum of 200,000 rows and a file size under 50 MB.

| Locale | Rows | File size | Translation notice |
|---|---:|---:|---|
| English | 200,000 | under 50 MB | None visible |
| Indonesian | 200,000 | under 50 MB | Machine-translated; not human-reviewed |
| Thai | 200,000 | under 50 MB | Translation-software notice; not editor-verified |
| Traditional Chinese | 200,000 | under 50 MB | Machine-translated |
| Spanish | 200,000 | under 50 MB | None visible |
| Portuguese | 200,000 | under 50 MB | None visible |

Sources:
- https://support.pipedrive.com/en/article/importing-data-into-pipedrive-with-spreadsheets
- https://support.pipedrive.com/id/article/importing-data-into-pipedrive-with-spreadsheets
- https://support.pipedrive.com/th/article/importing-data-into-pipedrive-with-spreadsheets
- https://support.pipedrive.com/zh-hant/article/importing-data-into-pipedrive-with-spreadsheets
- https://support.pipedrive.com/es/article/importing-data-into-pipedrive-with-spreadsheets
- https://support.pipedrive.com/pt/article/importing-data-into-pipedrive-with-spreadsheets

The prior search snippets that showed 50,000 rows are superseded by the live browser result. Do not present 50,000 as a current Thai or Indonesian limit. This is not proof of every account's plan, role or geographic entitlement. The global permission requirement and global-admin-only 48-hour revert remain separate caveats.

## Scope

- Replace the outdated locale-discrepancy note in `docs/growth/2026-11-02-crm-exit-evidence-and-ethical-distribution.md`.
- Preserve the existing buyer brief and qualitative keyword hypotheses; do not create locale-keyword doorway pages.
- Record the browser recheck and the correction in this plan.
- Coordinate through open issue #6 because issue #4 is closed.

## Buyer-intent hypotheses

- `Pipedrive spreadsheet import row limit`
- `Pipedrive CSV import file size limit`
- `Pipedrive import duplicates and field mapping`
- `Pipedrive import revert 48 hours`
- `Pipedrive import locale documentation consistency` (fact-check intent only; not a regional-limit claim)

Search volume, difficulty, CPC, rankings, impressions, clicks and traffic remain UNKNOWN.

## Competitor context

Reuse the existing CRM migration competitor scan. Suprdense Switch markets CRM-to-CRM migration, object/field mapping, duplicate handling and sample migration; Sanka Migrate markets broader system migration planning, inventory, mapping, dry runs and reconciliation. These are vendor-described capabilities, not independently tested results. StackPilot's worksheet is a buyer-side requirements/preflight aid, not a migration engine. Do not claim performance superiority or create another migration comparison.

## Distribution and measurement

Retain the existing zero-cost channel plan: Search Console/Bing Webmaster only after owner-authorized public release and verified property ownership; LinkedIn/Reddit only through authentic, relevant, human participation consistent with current rules. No account creation, indexing submission, public posting, external outreach or link promotion.

After a separately approved launch, measure page-level impressions, clicks, CTR and average position from actual first-party tools. Before then, all organic baselines remain UNKNOWN.

## Explicit non-goals

- No changes to `src/data/research-claims.json`, source-intake dates, claim approval/reviewer fields, product verification or affiliate records.
- No pricing, plan, geographic eligibility, tax, migration-performance or independent-testing claim.
- No new public route, runtime code, dependency, analytics, tracking, structured data or SEO metadata.
- No edits to `main`, no merge, no production promotion, noindex removal, privacy change, provider change or spending.
- Keep all six vendor claims candidate-only, all affiliate URLs null, Netlify Private/Locked as last owner-reported, and budget ₹0.

## Review / verification

1. Read current instructions, operating policy, current operational state, open PRs and issue #6.
2. Directly render all six official locale pages in a public browser; record update dates, row/file limits and translation notices.
3. Review the brief diff for stale 50,000-row claims and unsupported geographic inference.
4. Apply current gstack review/QA principles and Superpowers verification-before-completion. No TDD RED/GREEN is claimed because only documentation changes.
5. Recheck exact-head build, operations, Chromium and Netlify Deploy Preview statuses after the commit.

## Acceptance criteria

- All six pages are accurately recorded as 200,000 rows / under 50 MB, last updated 2026-10-19.
- Translation notices are preserved for Indonesian, Thai and Traditional Chinese.
- The prior 50,000-row search snippet is explicitly superseded, not presented as a current product limit.
- All product/vendor claims remain unapproved; source-intake dates and review fields are unchanged.
- No traffic, ranking, conversion, commission or revenue metric is invented.
- Noindex/privacy protections, affiliate prohibitions, Netlify hold and ₹0 policy remain unchanged.
