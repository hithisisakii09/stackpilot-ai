# HubSpot export evidence pilot — manual inspection handoff (PRIVATE / NO APPROVAL)

**Prepared:** 2026-11-06  
**Location:** Draft PR #8, `feature/phase-2-product-readiness`  
**Claim:** `comparison-hubspot-vs-pipedrive-05` / `hubspot`  
**Boundary:** Research preparation only. No fresh official-source inspection is represented by this handoff.

## Starting state and hard stop

The combined private candidate says `CSV export for deals, contacts, companies; API data sync`. This sentence is **not vendor evidence**. The four atomic predicates below remain `NEEDS-EVIDENCE`; neither a vendor-domain URL nor an archived paraphrase establishes actual current support.

- `deals-csv-export`: Human must inspect explicit deal-object CSV export wording and relevant export role/permission, plan/edition, region, property/association coverage and limitations.
- `contacts-csv-export`: Inspect contacts separately, distinguishing records/properties from engagement/activity history and documenting any omissions.
- `companies-csv-export`: Inspect company-record CSV export separately; do not infer this from generic export documentation or successful contact export.
- `api-data-sync`: Inspect a **separate relevant official source** for synchronization behavior, data objects, direction, trigger/schedule, authentication/scopes, rate limits and plan/region restrictions. **An API endpoint or one-off export is not proof of ongoing data sync.**

## Exact next operator sequence (human, no paid accounts)

1. Open the existing **candidate** HubSpot export-documentation lead in a separately authorized browser: `https://knowledge.hubspot.com/import-and-export/export-records`. Verify that it opens, inspect its currently displayed contents, and note the **actual** inspection date and URL. If it does not open, stop that source path: mark the missing source or inaccessible limitation rather than claiming inspection.
2. Make **three separate object-specific decisions**, one each for deals, contacts and companies. For each, look for official text explicitly connecting that object to CSV format; capture only a short, permitted **verbatim** excerpt, alongside scope and caveats. If the page says nothing about an object, record silence as `NEEDS-EVIDENCE`, **not** a verified contradiction.
3. Investigate API synchronization independently. Record whether the page describes actual synchronization, versus exporting a file, querying an API, importing records, or mentioning a third-party integration. If actual sync semantics are not documented, leave `api-data-sync` unresolved. Do not invent a source URL or promote a guessed URL to the source registry.
4. Generate the canonical four-row private CSV **outside the checkout**:
   ```bash
   npm run research:hubspot-export-checklist -- --csv > /absolute/private/hubspot-export-evidence-assessment.csv
   ```
   Enter only facts and quotations personally observed in official documentation. Each row needs source URL, real inspection date, plan, region, permissions/account scope, excerpt, limitations and one allowed **unverified** research disposition. Unknown or unsupported scope remains blank, never `N/A` as a substitute for evidence. Do **not** put customer data, tokens, full-page copies or credentials in the worksheet.
5. First review the filled CSV as untrusted text before opening it in spreadsheet software. Then run:
   ```bash
   npm run research:hubspot-worksheet-check < /absolute/private/hubspot-export-evidence-assessment.csv
   ```
   The checker validates local syntax/completeness only; it neither authenticates authorship nor verifies HubSpot facts.
6. Only for genuinely inspected source material and only through separately reviewed intake, use the existing `research:intake -- --proposal` and later `--capture` flows. Do not make source proposals or capture records from this handoff or archived notes alone.

## Decision table for the human handoff

| Observation made by a human | Research disposition | Resulting permission |
| --- | --- | --- |
| Current official text directly supports one object-specific CSV predicate, with documented scope | `OBSERVED-UNVERIFIED` after complete notes | Research only, **no verification/approval** |
| Current official text explicitly conflicts with a predicate | `CONTRADICTION-REPORTED-UNVERIFIED` after complete notes | Escalate to editorial review, **no automatic rewrite** |
| Source is silent, inaccessible, outdated, vague, or scope unknown | `NEEDS-EVIDENCE` | Leave the predicate pending |
| Export page mentions an API but not synchronization behavior | `NEEDS-EVIDENCE` for `api-data-sync` | Seek a separate first-party sync source; **no inference** |

**No-claim-laundering rule:** Three well-supported CSV subquestions would still **not** substantiate the four-part combined assertion if API sync remains unresolved. Conversely, any relevant observation is a researcher self-report, not authenticated independent review. Do not treat the worksheet as publication data.

## Safe checkpoint

- Fresh official-source inspection by this increment: **0**.
- Newly created source proposals/captures by this increment: **0**.
- Independently verified atomic predicates: **0/4**.
- Comparison claims authorized for publication: **0/36**.
- Costs, account creation, outreach or vendor contact: **none**.
- Branch only; keep Draft PR #8 open and unmerged, `main` unchanged, preview private/noindex, no affiliate activation, no editorial auto-approval, no production launch.

The **next external dependency** is a genuine human browser inspection of the live vendor sources. No automated step should manufacture its output.

## Offline repeated-excerpt safeguard (2026-11-06)

The private four-row worksheet checker now marks **every row that reuses an identical nonempty excerpt across two or more distinct predicates** as `PARTIAL-LOCAL-NOTES`, adds `distinctPredicateExcerpt` to that row's `missingFields`, and excludes those rows from reported observation/contradiction counts. A single official documentation page may still serve multiple object-specific questions when genuinely **different** excerpts are recorded. This is a syntactic anti-copy/paste safeguard, **not** a test of source authenticity or whether distinct paraphrases truly substantiate the claims. The output still does not reveal the excerpt.

The regression test uses synthetic words only; no new vendor page inspection or human authorization was performed. Until the exact-head CI checks have run, do not assert that the full test suite has passed. All four predicates stay `NEEDS-EVIDENCE`, and publication is prohibited.

## Cosmetic duplicate-evidence variants — additional offline guard

The private checker now uses an in-memory, **comparison-only** normalized excerpt key (Unicode NFKC normalization, whitespace collapsing and case folding) to detect source text repeated across different predicates even when a researcher changes letter case, spacing or common Unicode space forms. It does **not** rewrite the supplied quotation, echo the quote or silently promote observations. Duplicate rows are classified `PARTIAL-LOCAL-NOTES` with `distinctPredicateExcerpt` missing, while all four predicate statuses remain `NEEDS-EVIDENCE`. Synthetic regression inputs cover uppercase, repeated whitespace and a nonbreaking-space variation.

**Residual limitation:** Distinctly worded snippets can still be irrelevant, misleading or copied from one broader passage. Only a genuine human, source-specific review can establish what the official documentation supports. A syntactically distinct excerpt is not verified evidence. This change needs exact-head CI confirmation before its tests may be described as passing. All release and reviewer authorization gates remain closed.

## Unverified-candidate quotation laundering guard

The offline CSV validator now rejects researcher-entered excerpts that contain the project's own **unverified combined candidate assertion**, including case, repeated-space and Unicode NFKC whitespace variants. The check uses a comparison-only normalized string and does not modify the purported source quote. This prevents direct copy/paste of a claim under research from counting as a vendor quotation. Synthetic regression cases cover those variants; no vendor source was visited or approved.

This check is deliberately narrow. Paraphrases and misleading but distinct text may still pass syntactic validation, so independent human verification is indispensable. Do not infer vendor feature support or publication authorization from a passing private worksheet.

## Scope-qualified placeholder safeguard

The offline worksheet checker treats a **field label followed only by an unresolved placeholder** (for example `Plan: TBD`, `region pending`, `permissions unspecified`, or `Limitations: not documented`) as missing research evidence. These rows remain `PARTIAL-LOCAL-NOTES` and cannot increase the self-reported observation count. It does not discard longer, substantive caveats merely because they discuss a limitation that is not documented in the inspected excerpt. This only assesses form completeness, not whether plan eligibility, region or permissions are actually substantiated by vendor evidence.

Synthetic test cases were committed before the validator implementation; exact-head CI must confirm the increment. No genuine source was re-inspected and nothing was approved, merged or published.
