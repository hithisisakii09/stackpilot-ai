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

## 2026-11-17 additional first-party evidence — System ID update workflow

The official [Updating Pipedrive data with a spreadsheet](https://support.pipedrive.com/en/article/updating-pipedrive-data-with-a-spreadsheet) page, last updated **2026-09-03**, describes updating existing records by mapping the Pipedrive System ID. It says the action is available only to admins and regular users with the correct permissions. Its import-error note states a maximum of **50,000 rows** and **50 MB**.

The separate general [Importing data into Pipedrive with spreadsheets](https://support.pipedrive.com/en/article/importing-data-into-pipedrive-with-spreadsheets) page, last updated **2026-10-19**, states up to **200,000 rows** and under **50 MB**. The official pages do not clearly explain whether the 50,000-row note is specific to System ID updates, applies only to an error-handling scenario, or is stale. Treat this as an unresolved documentation/workflow boundary, not a country-specific or universal limit. No account was accessed, no import was attempted and no support request was sent.

Additional qualitative query hypotheses: `Pipedrive System ID spreadsheet update row limit`; `Pipedrive bulk update 50,000 rows`; `Pipedrive 50,000 vs 200,000 import rows`. Search volume, CPC, difficulty, rankings, impressions, clicks and traffic remain UNKNOWN.

Source: https://support.pipedrive.com/en/article/updating-pipedrive-data-with-a-spreadsheet

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
2. Directly render all six official general-import locale pages and the separate System ID update page; record update dates, row/file limits, translation notices, permission caveats and the unresolved 50,000/200,000 workflow boundary.
3. Review the brief diff for stale 50,000-row claims and unsupported geographic inference.
4. Apply current gstack review/QA principles and Superpowers verification-before-completion. No TDD RED/GREEN is claimed because only documentation changes.
5. Recheck exact-head build, operations, Chromium and Netlify Deploy Preview statuses after the commit.

## Acceptance criteria

- All six pages are accurately recorded as 200,000 rows / under 50 MB, last updated 2026-10-19.
- Translation notices are preserved for Indonesian, Thai and Traditional Chinese.
- The prior locale-specific 50,000-row search snippet is explicitly superseded for the six general-import pages; the separate System ID update article's 50,000-row error note is retained with its date and unresolved scope.
- The 200,000-row general-import figure is not generalized to the System ID update workflow, and the 50,000-row note is not generalized to every import path or geography.
- All product/vendor claims remain unapproved; source-intake dates and review fields are unchanged.
- No traffic, ranking, conversion, commission or revenue metric is invented.
- Noindex/privacy protections, affiliate prohibitions, Netlify hold and ₹0 policy remain unchanged.


## 2026-11-18 follow-up — Pipedrive's HubSpot migration guide (candidate-only)

**Source:** [Pipedrive — HubSpot migration to Pipedrive](https://support.pipedrive.com/en/article/hubspot-to-pipedrive-migration), last updated **2026-09-23**. Added this vendor-authored mapping and sequencing guide to the existing CRM exit-evidence brief. It covers terminology mapping, separate record-type exports, destination field/pipeline/activity preparation, import order, post-import spot checks and a suggested 5–10-record test import. The marketing-contact distinction is retained as a Pipedrive-specific note.

**Editorial boundary:** vendor onboarding guidance is not an independent migration test, a guarantee of complete history/attachment portability, or proof of plan/region/role availability. HubSpot export permissions and activity boundaries remain sourced to HubSpot's own documentation. The separate Pipedrive 50,000/200,000 import-workflow discrepancy remains unresolved.

**Scope / verification:** documentation-only update to the existing PR #14 branch; no new article, route, runtime behavior, dependency, test or TDD RED/GREEN claim. Keyword additions are qualitative hypotheses only; search volume, CPC, difficulty, rankings, impressions, clicks, traffic and conversions remain UNKNOWN. Require exact-head Build, operations, Chromium and Netlify status checks after this commit. All vendor claims remain unapproved; no source-intake or reviewer fields changed.


## 2026-11-19 HubSpot export documentation refresh — candidate-only

**Source:** [HubSpot — Export your records](https://knowledge.hubspot.com/import-and-export/export-records), directly retrieved on 2026-11-19; the live page still displays **Last updated: April 2, 2026**. A search-index snippet surfaced **November 12, 2026**, but the directly rendered canonical page did not corroborate it. Treat that snippet date as unverified; retain April 2, 2026 as the vendor page's displayed date.

### Verified wording to preserve

- The page's availability label is **All products and plans**, except where noted; the export permission is still required.
- A default record export includes the properties/associations in the selected view and up to **1,000 associated record ID values per association column**.
- The all-associated-records option is documented for **CSV** exports only.
- Contact activities are handled separately via individual contact-data export, selected activity reports or the engagements API.
- Download links expire after **30 days**; the page also documents up to **300 exports per rolling 24-hour window** and **three concurrent exports**.
- Large exports may take hours; exports over 1,000,000 rows for CSV/XLSX and 65,535 rows for XLS may be split into multiple files.

### Buyer-intent hypotheses

- `HubSpot export associations 1,000 limit`
- `HubSpot export all associations CSV`
- `HubSpot export activities separately`
- `HubSpot export link expires 30 days`
- `HubSpot export over 1 million rows`

These are qualitative task/query hypotheses only. Search volume, CPC, difficulty, rankings, impressions, clicks, traffic and conversions remain UNKNOWN.

### Scope and review

- Update only the existing CRM exit-evidence brief and this plan; no new page, route, code, dependency or analytics.
- Keep the record-export / activity-export distinction explicit. Do not call the export a complete backup, infer that every object/API route is enabled for every portal, or present the default 1,000 association IDs as a universal record cap.
- Do not modify `src/data/research-claims.json`, source-intake dates, review fields, approval flags, product data, affiliate records or tracking URLs.
- Do not execute owner gates. The exact 2026-11-18 `artifacts/ops/backlog.json` has `automatic: []`; its empty queue takes precedence over generic legacy task suggestions in `report.json`.
- No local test/build was run for this documentation-only update. There is no runtime behavior to test. After the commit, verify exact-head GitHub Build, Operations, Chromium and Netlify status independently; do not describe the prior 468/468 unit tests as a green build because the prior exact-head Build workflow fails at the final production dependency audit.
- Keep the draft PR open/unmerged, main and production untouched, noindex/privacy intact, Netlify Private/Locked as last owner-reported, and the budget at ₹0.


## 2026-11-20 — source freshness, buyer-intent and ethical distribution update (candidate-only)

### Scope / coordination
- PR #1 is closed; do not reuse its historical feature branch. Issue #4 is closed; issue #6 is the active source-review coordination thread. This update is confined to the existing PR #14 branch and its two existing documentation files.
- Exact pre-update branch head: `832e68332a310a6e09e6a8cbb47a4aae883facba`. The 2026-11-19 operations artifact for that head reports `automatic: []`, zero sources needing refresh, six prepared evidence packets, six editorial reviews pending, five affiliate candidates, zero accepted programs, and four owner-only gates. No owner gate is executed.
- `research:claims -- --json` was inspected/executed from the exact development-branch script/data in a local minimal harness: six source records, six unreviewed products, zero approved claims, `reviewedOn: null`, independent testing false, and all six `needsRefresh: false` under the 90-day threshold. The harness ran Node v22.16.0, below the repository's declared `>=22.23.4` engine; treat this as CLI/data inspection only, not supported CI evidence. No source-intake dates, reviewer fields or approval flags changed.
- PR #13 (usage/billing), PR #16 (requirements checklist), PR #15 (affiliate eligibility) and issue #5 (release NO-GO / incident watch) were inspected to avoid duplicate work. No new page, route or competitor comparison is justified.

### Direct-source evidence checked on 2026-11-20
- **HubSpot — Export your records:** canonical page still displays **2026-04-02**; general availability label says All products and plans except where noted, with Export permission required. Default association values are up to 1,000 IDs per association column; all associated records is CSV-only; activities use separate routes; links expire after 30 days; limits include 300 exports/rolling 24 hours, three concurrent exports, split-file thresholds above 1,000,000 CSV/XLSX rows and 65,535 XLS rows, and 256 XLS / 16,384 XLSX columns.
- **Pipedrive — Exporting data:** page displays **2026-09-03**; only global admins export by data type, while permissioned users remain restricted by visibility group/item visibility. Projects export requires Premium+ or the Projects add-on. Activities, notes and files are separate; Google Drive files are excluded from global export; download link is admin-only; generated files remain available 28 days.
- **Pipedrive — HubSpot migration:** page displays **2026-09-23**; mapping, import order, unique-key linking and 5–10-record test import are vendor instructions, not proof of complete portability or successful customer migration.
- No account or customer data was accessed; no import/export was attempted. No region-specific entitlement or geography-based limit was established. The general-import 200,000-row and System ID update 50,000-row notes remain an unresolved workflow distinction.

### Search intent and competitor position
- Add only the task-specific hypotheses recorded in the article: Pipedrive separate exports / Google Drive exclusion / role visibility / Projects plan requirement / 28-day generated file; HubSpot CSV all-associations / 1,000-ID default / separate activities / spreadsheet column cap; and HubSpot-to-Pipedrive import sequence.
- Spendflo's official checklist is a broad procurement alternative (45 checks, seven lifecycle stages, three risk levels; displayed update 2026-10-13). Pipedrive's own migration guide is the vendor-authored exact-task how-to. StackPilot's useful gap is a neutral, source-linked CRM exit-evidence matrix—not a generic procurement checklist, vendor ranking or migration-service claim.
- Search volume, CPC, difficulty, rankings, impressions, clicks, traffic and conversion rates remain UNKNOWN. Do not create thin keyword variants.

### Ethical zero-cost channels and measurement
- Google people-first content guidance and Search Console's Performance report were rechecked. Search Console's actual metrics are impressions, clicks, CTR and page/query/country/device dimensions; no baseline exists while the project remains private/noindex.
- Reddit's policy was directly checked (updated 2026-10-30); LinkedIn's User Agreement was directly checked (effective 2025-11-03). No automation, mass posting, unsolicited DMs, account creation or link promotion. Any future channel use requires a real owner-approved account, manual relevant participation and disclosure.
- Only internal draft refinement/internal links are feasible now. No indexing, sitemap submission, public post, outreach, analytics/tracking or external community action.
- Current public visits, search metrics, rankings, backlinks, social audience, leads, conversions and revenue remain UNKNOWN. Affiliate applications, accepted programs and active links remain 0/0/0; editorial approvals remain 0/6. After a separately approved public release, establish a first complete 28-day Search Console baseline and record the property/date range before any performance comparison.

### Workflow / verification
- Current gstack documentation still lists `/plan-eng-review` as the focused engineering-plan review; `/autoplan` is a separate review pipeline that runs CEO → design (when UI scope applies) → DX (when developer-facing scope applies) → engineering review. Use `/plan-eng-review` for a focused engineering review, `/autoplan` when the full plan-review pipeline is appropriate, `/review` for the diff, and `/qa` for browser acceptance. Do not invoke `/ship` or any release action. See the [gstack skills index](https://github.com/garrytan/gstack/blob/main/docs/skills.md), [plan-eng-review](https://github.com/garrytan/gstack/blob/main/plan-eng-review/SKILL.md), [autoplan](https://github.com/garrytan/gstack/blob/main/autoplan/SKILL.md), and [review](https://github.com/garrytan/gstack/blob/main/review/SKILL.md). This remote GitHub-only pass did not execute slash commands; the plan and diff were reviewed manually against the current public skill guidance.
- Apply Superpowers [writing-plans](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md) and [verification-before-completion](https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md). This is documentation-only: no behavior test was added and no TDD RED/GREEN is claimed. Exact-head GitHub Build, Operations, Chromium and Netlify status checks are required after the commit.
- Do not change `research-claims.json`, `affiliate-programs.json`, product/catalog records, source-intake dates, reviewers, approval fields, tracking URLs, code, dependencies, analytics, robots/noindex, privacy controls, Netlify configuration, `main` or production. Keep PR #14 draft/unmerged and budget ₹0.
