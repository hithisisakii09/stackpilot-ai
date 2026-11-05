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
