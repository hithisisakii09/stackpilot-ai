# First manual evidence pilot — HubSpot CRM export options (PRIVATE, UNVERIFIED)

Date: 2026-11-05  
Milestone: Evidence-Safe Product Comparison Foundation  
Branch: `feature/phase-2-product-readiness` · Draft PR #8 · no approval or public release

## Why this exact claim

- Internal claim ID: `comparison-hubspot-vs-pipedrive-05`
- Vendor: `hubspot` (one vendor cell in the existing HubSpot vs Pipedrive comparison)
- Dimension: **Data mobility & export options**
- Private candidate assertion, **NOT A VERIFIED FACT**: `CSV export for deals, contacts, companies; API data sync`
- Existing candidate research lead: `hubspot-doc-claim-1` (recorded `2026-10-31`)
- Existing, **not newly verified**, first-party-looking URL: `https://knowledge.hubspot.com/import-and-export/export-records`

The existing repository associates this candidate URL with a HubSpot research lead, **not** with the specific export claim. There are zero source proposals, zero manual captures and zero approved comparison claims as of this checkpoint. Do not treat this link as verified, current, accessible or sufficient merely because it is under a vendor domain.

## Verify the components separately

A single page may support only part of the private assertion. During a **human's own genuine inspection** of the existing official vendor documentation, determine separately whether it supports:

1. CSV export for **deals** in the relevant account and plan.
2. CSV export for **contacts** in the relevant account and plan.
3. CSV export for **companies** in the relevant account and plan.
4. Whether **API data sync** is supported by that same source. If this is not addressed, seek distinct official documentation; do not infer or approve API support.

Also record applicable permissions, plan, region, date, record/property/association limits and uncertainties. Mark each unsupported or unclear component **NEEDS EVIDENCE**. A partial match does not verify the combined assertion or its pricing/plan scope.

## Private researcher workflow (no network operations by the tooling)

1. Review the internal worklist entry (raw candidate appears **only** with `--json`):
   ```bash
   npm run research:claim-starter -- --claim comparison-hubspot-vs-pipedrive-05 --vendor hubspot
   npm run research:claim-starter -- --claim comparison-hubspot-vs-pipedrive-05 --vendor hubspot --json
   ```
   This presents vendor-matched **candidate leads**, not claim-matched evidence.
2. Inspect the vendor link **manually in your own browser**, without signing up for a paid account or contacting sales. If unavailable, stale, inaccessible or scope-inapplicable, stop and record the research gap; do not invent a date or excerpt.
3. If genuinely relevant, prepare a `--proposal` input JSON **outside the repository**, with `claimId`, `productId`, `researchLeadId`, actual `proposedOn`, your substantive `relevanceNote`, `planScope`, `regionScope`. Use `null` for unknown scopes rather than assuming a plan. Then run:
   ```bash
   npm run research:intake -- --proposal < /absolute/private/proposal-input.json
   ```
   Inspect the emitted `record`; it remains `status:"candidate", approved:false`. A human may then manually place only that candidate record into `src/data/comparison-source-proposals.json`, after confirming it is authentic and relevant enough for further research. No user-facing claim changes.
4. Only **after** the source proposal is recorded, prepare a `--capture` input with a real, short, permitted plain-text excerpt from manual inspection. Never use an invented quotation. Validate it with:
   ```bash
   npm run research:intake -- --capture < /absolute/private/capture-input.json
   ```
   The generated record is still an unverified candidate. Keep the local copy outside Git.
5. Optionally verify only local text consistency, using a **legitimate** small UTF-8 source copy stored outside the repository:
   ```bash
   npm run research:snapshot-check -- --text-file /absolute/private/vendor-document.txt < /absolute/private/snapshot-metadata.json
   ```
   This does **not** authenticate vendor provenance or verify the claim. It proves only that the supplied excerpt bytes appear in a user-controlled local copy.
6. Run `npm run check:data` and `npm test` after any **separately reviewed** candidate-register change. The private worklist should move from “needs source proposal” to “needs manual capture” or “needs independent verification” without changing approval or publishing flags.

## Required unresolved gates

Do not add raw full vendor documents, personal/customer data, screenshots with credentials, or local draft JSON to Git. Keep the scratch files **outside this project**; `.gitignore` and `npm run research:material-guard` provide only defense-in-depth.

No independent human reviewer authentication, external audit anchor, claim-specific signoff, production consent, commercial hosting authorization, payment, affiliate activation or merge has been granted. The 36 comparison claims remain **unverified**. This is a handoff for **real manual work**, not a research-completion certificate.

## Structured atomic evidence assessment — private checklist only

The `research:hubspot-export-checklist` command now converts the compound *private candidate* into **four independent human research questions**, without pretending the existing source lead answers them:

```bash
# Human-readable questions, no raw candidate assertion in stdout
npm run research:hubspot-export-checklist

# PRIVATE JSON containing the unverified original candidate and exact question IDs
npm run research:hubspot-export-checklist -- --json
```

| Atomic predicate ID | What a human must independently check | Baseline |
| --- | --- | --- |
| `deals-csv-export` | Current official documentation explicitly supports CSV export of **deals**, with applicable permissions, account and plan, region and any limits | **NEEDS-EVIDENCE** |
| `contacts-csv-export` | Separately document CSV export of **contacts**, including contact properties and associations | **NEEDS-EVIDENCE** |
| `companies-csv-export` | Separately document CSV export of **companies**, with its own field/association and account constraints | **NEEDS-EVIDENCE** |
| `api-data-sync` | Find distinct official documentation explaining **data sync behavior**, direction, authorization, rate limits and timing; the existence of an API read/export endpoint alone is insufficient | **NEEDS-EVIDENCE** |

For **each** predicate, a real reviewer should record a source URL, inspection date, short permitted supporting excerpt, source scope (plan, permissions, region, account), what the source does **not** prove, and any unresolved limitations, all in **private notes outside Git**. Do not fill in a date or quotation that was not obtained through actual inspection. Start with the existing HubSpot export research lead, but do **not** assume that one vendor documentation page addresses all four predicates.

The current code's candidate source proposals and excerpt captures are associated with the **combined** comparison claim, not automatically with one of these four predicates. The checklist deliberately leaves `manuallySelectedSourceId:null` and `manuallyAssignedCaptureId:null` on every subclaim—even if an existing combined-claim proposal or excerpt exists. Source leads appear as **unassigned, unverified** research options, not factual support.

There is **no automated step** from a matching excerpt to `supportsPredicateVerified:true`, a signed human approval, or a publishable comparison. The CLI is **read-only** and its private `--json` output must not be committed, placed in `dist/`, emailed to vendors, or published. Both the Git material guard and static build preflight reject the conventional `hubspot-export-evidence-assessment.json` export filename as defense in depth.

**Expected pilot result before manual research:** 4/4 predicates **NEEDS-EVIDENCE**, 0 independent verifications, 0 authenticated approvals, 0 candidate claim updates. Do not call the pilot complete until genuine vendor evidence has been collected and separately reviewed. Release remains **NO-GO**.

## Four-row private CSV worksheet — manual evidence collection handoff

To prepare an **offline, fill-in research worksheet** without inventing facts, use:

```bash
# Default stdout contains four research questions, no raw vendor assertion:
npm run research:hubspot-export-checklist

# Optional PRIVATE CSV worksheet; store outside this Git checkout:
npm run research:hubspot-export-checklist -- --csv > /absolute/private/hubspot-export-evidence-assessment.csv
```

The CSV has **four rows**: `deals-csv-export`, `contacts-csv-export`, `companies-csv-export`, `api-data-sync`. Each includes its own independent research questions and `NEEDS-EVIDENCE` status. The following eight fields are **intentionally empty for every row**: official source URL, inspection date, plan, region, account/permission scope, exact short supporting excerpt, limitations/contradictions, and human research disposition. An existing unverified vendor documentation lead or combined-claim excerpt **never automatically fills any of these fields**.

A human inspector should fill only what an actual official source demonstrates, distinguish a page's silence from a contradiction, and check export permissions and account/plan/region restrictions separately. **API endpoint availability does not demonstrate continuous or bidirectional data sync.** Do not copy source text from this repo's unsourced candidate assertions into the excerpt cells. The worksheet is a temporary research aid, *not* an approval record or validated evidence-import format. It contains formula-neutralization safeguards for spreadsheets, but still should be kept local and private.

The file name is protected by `.gitignore`, the forced-add Git index guard and the static-build research leakage guard. Store it **outside the project** anyway, including outside `dist/`. Later, use the existing `research:intake` proposal/capture validation only for a genuinely inspected, claim-specific source. Every existing publication, reviewer and owner release gate stays disabled; four completed worksheet cells would not by themselves prove the combined assertion.

## Offline validation of manually filled four-part CSV — no source approvals

After the user genuinely inspects a vendor's source and fills the previously blank fields in a private worksheet, run:

```bash
# The input must be the original canonical 4-row, 12-column CSV. Do not upload it.
npm run research:hubspot-worksheet-check < /absolute/private/hubspot-export-evidence-assessment.csv
```

The command is **read-only** and performs no web requests. It checks the four exact predicate IDs, original research questions and unchanged `NEEDS-EVIDENCE` labels, permits correctly quoted commas/quotes, and rejects unquoted/altered/multiline CSV, malformed dates, future dates, unsafe control characters, formulas and approval-looking dispositions. A source URL must use HTTPS at `hubspot.com` or its subdomains; this is **URL syntax checking, not vendor provenance**. A short excerpt must meet the existing private capture shape rules, and copying the original unverified candidate assertion as if it were a vendor quotation is forbidden.

Manual `Research disposition` entries are restricted to blank, `NEEDS-EVIDENCE`, `OBSERVED-UNVERIFIED`, or `CONTRADICTION-REPORTED-UNVERIFIED`. To be counted as a *human-claimed* observation or contradiction, **all seven** source fields must contain plausible, non-`unknown` text: HTTPS URL, actual inspection date, plan, region, permission scope, short excerpt and limitations. Partial notes remain gaps. Even completed entries are **untrusted self-reports**: the command never authenticates the vendor's content or a reviewer, cannot mark any predicate verified, and cannot approve, merge, publish or change the evidence ledger.

The JSON result includes only counts, predicate IDs, missing-field codes and whether the user-entered URL matches an existing **unverified** source lead or proposed claim source. It deliberately **does not echo** raw URLs, excerpts, notes, candidate assertions or account data. A matching source lead does not establish relevance to the predicate. The exported report file name `hubspot-manual-worksheet-check.json` is blocked by Git ignore/index and website-build privacy guards. Keep all input and output files outside this repository anyway.

When the worksheet identifies a genuine promising source, continue via the existing **separate** `research:intake -- --proposal` workflow for claim-specific unapproved evidence. No CSV-import shortcut exists; independent authenticated human source and predicate review remains the only possible future path to approval, and that authority is not implemented. All 36 claims remain unverified and production stays **NO-GO**.

## Hardened CSV editing and unresolved-scope safeguards

The local worksheet checker now rejects **formula-prefixed excerpt cells** (even when a dangerous prefix is preceded by whitespace or invisible text), bidirectional/zero-width formatting controls in researcher fields, and unapproved output labels. The source URL, plan, region, permissions, excerpt and caveat fields must not carry visually deceptive hidden Unicode controls. The validator never echoes rejected source text or URLs in diagnostics.

Use a **trusted text editor** to review a manually obtained CSV before importing/opening it with spreadsheet software. An untrusted filled CSV can trigger formulas **when opened**, before any later check is run; validating afterward does not reverse that risk. If a genuinely quoted vendor excerpt starts with a formula trigger such as `=`, `+`, `-` or `@`, **do not alter the quotation just to pass this CSV check**. Keep the verbatim excerpt in a permitted private source note and leave the worksheet excerpt unresolved pending safe review.

Research placeholders `unknown`, `N/A`, `TBD`, `pending`, `not checked`, `not documented`, `not verified`, `unspecified`, `none`, `?` and `-` now count as **missing evidence**, not a completed plan/region/permission/limitation field. The CLI preserves explicit `missingFields` codes and will not count a row with placeholders as even a *self-reported* observation. A row with all fields filled is still an untrusted human claim, **not independently verified vendor evidence**, authentication, or approval.

The manual workflow and release restrictions are unchanged. No vendor facts were obtained by this change.

## Historical-source crosswalk — avoid mistaking archived notes for current proof

A dated, private reconciliation of the existing 2026-11-02/03 HubSpot research notes against **each of the four unresolved predicates** is available in [2026-11-05-hubspot-historical-source-crosswalk.md](2026-11-05-hubspot-historical-source-crosswalk.md). It identifies the already-reported generic export, association, permission and separate activity/API context but records **zero fresh source inspections, zero vendor quotes and zero authenticated approvals**. Every predicate remains **NEEDS-EVIDENCE**.

Use this crosswalk for *where to look next*, not for filling inspection dates or exact quotation cells. The human must reopen the vendor's live documentation and record their own short permitted quotations. No source/capture intake was performed during the crosswalk update.
