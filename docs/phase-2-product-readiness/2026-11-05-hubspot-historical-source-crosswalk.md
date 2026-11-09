# HubSpot export claim — historical-source traceability (PRIVATE / NOT VERIFIED)

**Prepared:** 2026-11-05  
**PR:** [Draft #8](https://github.com/hithisisakii09/stackpilot-ai/pull/8), development branch only  
**Purpose:** Reduce repeated research by distinguishing *previously recorded vendor-source notes* from the fresh, claim-specific manual evidence still required. **This document is not an authenticated vendor-source inspection, an excerpt capture, or editorial approval.**

## Claim boundary

- Exact comparison cell: `comparison-hubspot-vs-pipedrive-05` / `hubspot`, dimension **Data mobility & export options**.
- Original private unverified assertion: `CSV export for deals, contacts, companies; API data sync`.
- Existing unapproved vendor research lead: `hubspot-doc-claim-1` in `src/data/research-claims.json`; candidate URL: [Export your records](https://knowledge.hubspot.com/import-and-export/export-records).
- Prior private notes reported the source's displayed update date as **2026-04-02**; that date and the page's current contents **have not been rechecked in this session**.
- At this checkpoint `src/data/comparison-source-proposals.json` is `[]`, `src/data/comparison-evidence-captures.json` is `[]`, and no atomic predicate has an authenticated source assignment. **All four: NEEDS-EVIDENCE.**

## Archival research inputs — dated, not independently authenticated here

| Existing note | Date recorded | What the note *said it observed* | What it cannot prove |
| --- | --- | --- | --- |
| [CRM exit-evidence draft](../growth/2026-11-02-crm-exit-evidence-and-ethical-distribution.md) | 2026-11-02 | HubSpot record export description included current properties and associations, Export permission and distinct routes for activities; it mentioned an engagements API in the context of separately exporting some activities. | Exact current deals/contacts/companies CSV format, current account/plan eligibility, region, actual exported values, or any ongoing API synchronization. |
| [Plan-scoped evidence packet](../editorial-drafts/2026-11-03-plan-scoped-vendor-evidence-review.md) | 2026-11-03 | Generic record-export caveats, association/default-versus-CSV distinctions, temporary download links, export quotas, and warnings that record export is not complete activity history. | Whether the specific combined assertion is supported word-for-word, current plan/permissions/limits for a buyer, or API sync functionality. |
| [Editorial source spot-check issue #6](https://github.com/hithisisakii09/stackpilot-ai/issues/6) | 2026-11-01 and later notes | Earlier human-reported broad source checks; explicitly candidate-only and no paid customer account tests. | Authenticated independent review, an exact claim-specific proposal/capture, tested feature access, new page inspection on 2026-11-05, or permission to publish. |

The historical packet is **contextual research**, not an excerpt from today's vendor page. Do **not** paste a paraphrase from these notes into the worksheet's *Exact short excerpt* field or reuse an old reported page-update date as a new inspection date.

## Claim-to-source crosswalk — no implicit predicate attribution

| Atomic question | What the archived notes help prioritize | Evidence still required from a **fresh human inspection** | Status |
| --- | --- | --- | --- |
| `deals-csv-export` | General record-property/association export and an apparent CSV association option are mentioned historically. | Official current wording naming **deals** and CSV output; supported properties/associations, Export permission/role, account edition, region and limitations, genuine short verbatim excerpt and inspection date. | **NEEDS-EVIDENCE** |
| `contacts-csv-export` | Notes distinguish contact activity history from record-property exports; activities may need other paths. | Official current wording naming **contacts** and CSV output, exact included fields and excluded activity/history data, user access, edition/region and current limits, genuine excerpt/date. | **NEEDS-EVIDENCE** |
| `companies-csv-export` | Archived notes describe generic record exports, but do not separately establish company-specific CSV behavior. | Official current wording naming **companies** and CSV output, company properties, linked objects, permissions, plan/region, limitations, genuine excerpt/date. | **NEEDS-EVIDENCE** |
| `api-data-sync` | Older research mentions an engagements/API path **for some activity export**, not a documented sync service. | A **separate first-party source** defining actual synchronization semantics: what objects are synced, one-way/two-way direction, scheduled/automatic vs manual behavior, authentication/scopes, rate limits, supported plans/regions and error handling. API endpoint existence is insufficient. Capture genuine excerpt/date. | **NEEDS-EVIDENCE** |

**Critical distinction:** No table row above asserts that HubSpot currently provides any one of these features to a particular customer. A lead on a vendor domain is not a verified claim-to-source citation. A historical note about CSV is not a source-level observation for all three CRM object types. Neither the reference to an API nor one-time data export supports the stronger phrase “API data sync.”

## Minimum next human research sequence

1. In a separate, authorized browser session, reopen the candidate [HubSpot record export page](https://knowledge.hubspot.com/import-and-export/export-records). Check its current URL, visible updated date and exact text. **Do not mark the research as performed if the page is inaccessible.**
2. Check **deals, contacts and companies individually** for an explicit CSV export path and permissions. Record limitations and ambiguity per object; partial evidence must not certify the compound assertion.
3. For `api-data-sync`, research a **different official document** if the record export page is silent. If not substantiated, keep the API predicate pending and consider narrowing the private candidate wording **only after** separately authorized editorial review.
4. Use `npm run research:hubspot-export-checklist -- --csv` to generate a blank four-row worksheet stored **outside Git**. Fill the genuine URL, inspection date, plan, region, permissions, short permitted verbatim excerpt, caveats and `OBSERVED-UNVERIFIED` or other allowed *unverified* disposition. Never invent the excerpt, plan or inspection date. `unknown`, `TBD` and `N/A` are still missing evidence.
5. Run `npm run research:hubspot-worksheet-check < /absolute/private/hubspot-export-evidence-assessment.csv`. This is **local syntax/completeness validation, not source authentication**. If a genuinely relevant existing source lead passes human review, separately validate a candidate via `npm run research:intake -- --proposal`; use `--capture` only after its proposal is recorded. A new API-document URL is not automatically an approved or even registered research lead; add it through a separately reviewed candidate-source intake process.
6. Require independent, authenticated human verification and owner release authorization before ever changing assertion, `approved`, editorial, production or publication state. All such gates remain locked.

## Outcome of this documentation-only increment

**Historical notes reconciled; new vendor-document inspection: 0; new proposals: 0; new captures: 0; independently verified predicates: 0/4; publishable comparison claims: 0/36.** The final status remains **NO-GO**. Nothing in this document changes published pages, source registers, release controls, account status, spend or affiliate links.
