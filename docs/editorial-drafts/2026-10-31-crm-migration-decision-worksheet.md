# HubSpot vs Pipedrive: CRM migration due-diligence worksheet
**StackPilot AI — private original editorial draft, 2026-10-31**
**Status: UNPUBLISHED / UNVERIFIED / NO RECOMMENDATION**
**Reviewer:** not assigned; owner self-review planned but not completed.
**Source basis:** official vendor documentation listed below. Source text is not proof of independent testing.

## The purchase decision this article helps make
For a small team changing CRMs, the hardest surprise may not be the subscription price: it may be discovering that contacts, deals, relationships, activities, custom fields or permissions cannot be moved and reconciled as expected. This worksheet asks the buyer to measure a migration before deciding which vendor fits. It does **not** declare HubSpot or Pipedrive the better choice.

### 1. Inventory the existing data
Before comparing tools, inventory six kinds of material:
- Contacts and organizations; unique IDs and merge/deduplication rules
- Deals, pipeline stages, currencies and close-date representations
- Associations between people, companies and deals
- Notes, tasks, attachments and activities, including who is authorized to export them
- Custom fields, required values, enumerations and validation rules
- Users, ownership, roles and access controls, including records assigned to departed staff

Record the source count and the destination count separately. Record which differences are expected transformations and which are defects. Do not count a successful CSV upload as proof that a relationship or attachment survived.

### 2. What the source documentation suggests — NOT verified conclusions
| Decision question | HubSpot documentation lead | Pipedrive documentation lead | Evidence still required |
| --- | --- | --- | --- |
| Can an authorized user export records? | HubSpot documents record export permissions and association/property considerations. | Pipedrive maintains separate export guidance. | Exact edition, role, object types, file formats and current limits |
| Can spreadsheet records be imported? | HubSpot separately documents record imports. | Pipedrive describes spreadsheet import including CSV/XLS/XLSX. | Required columns, supported entities, relationship mapping, account permissions |
| Can deal stages be mapped? | Needs plan-specific evidence and test scope. | Pipedrive has a dedicated pipeline/stage import guide. | Explicit enumeration mapping, historical stage semantics and post-import counts |
| Do notes, activities and attachments survive? | Not established by these source leads. | Not established by these source leads. | Independent authorized sandbox test and reconciliation report |
| Can an owner reverse the cutover? | Not established by these source leads. | Not established by these source leads. | Readable export, tested backup/restore and written rollback criteria |
| Which plan has the lowest real TCO? | Unknown. | Unknown. | Dated plan-specific quote including seats, add-ons, migration labor, renewal, taxes and currency |

A documentation URL appearing here signifies a *vendor research lead*, not approval or verification.

### 3. Reproducible, fictional proof-of-concept
Use only synthetic records and an expressly permitted test account. Do not subscribe, start trials, accept new contracts or submit sensitive data merely to run this draft. If no authorized account is available, mark **Not tested**.

Example test record design:
- `SYNTHETIC_CONTACT_001` linked to `SYNTHETIC_ORG_001`
- `SYNTHETIC_DEAL_001` associated with the contact, with `SYNTHETIC_STAGE_NEW`
- `SYNTHETIC_ROLE_EDITOR` maps to the authorized test owner
- A controlled non-sensitive note and a dummy attachment, if the authorized plan allows it

For each attempted import, track:
1. Source count and target count for each record type
2. Unique IDs and duplicate behavior
3. Contact–organization–deal associations
4. Ownership and least-privilege permissions
5. Deal stage, timezone, currency and custom-field transformations
6. Notes and attachments separately
7. Exportability from the *destination* system
8. Recoverable rollback and the person empowered to authorize it

**GO/NO-GO rule:** An unexplained record-count mismatch, broken critical relationship, incorrect access rights, or untested rollback is **NO-GO** for an actual migration. These thresholds are examples; a buyer must set approved thresholds beforehand.

### 4. Original buyer scoring framework — no vendor scores
Compare the two options only after collecting evidence. Buyer sets weights, not StackPilot:

| Criterion | Suggested buyer question | Evidence status |
| --- | --- | --- |
| Data portability | Can we export and re-import required objects with references intact? | Unverified |
| Admin controls | Can role-scoped users access only authorized records? | Unverified |
| Workflow coverage | Are the team's *actual* workflows supported on the exact plan? | Unverified |
| Total cost | Are one-time labor, seats, optional features and renewal included? | Unverified |
| Exit plan | Can we leave the tool with usable data and controlled downtime? | Unverified |

An **unknown** is not zero, a failure or a vendor disadvantage; it is a research task. Never compute a winner from missing facts.

### 5. What a reader can do now without buying anything
- Fill out StackPilot's private `/tools/requirements-checklist/` for CRM; download locally.
- Open the `/guides/crm-migration-checklist/` and its **synthetic** CSV template.
- Estimate user-entered subscription scenarios in `/tools/software-cost-calculator/`; **never** label hypothetical costs as vendor quotes.
- Request current product/plan information from authorized vendor channels before making a real commitment.

### 6. Source-anchored import/export preflight (1 November 2026; NOT editorially approved)

**Distinct buyer question / search-intent hypothesis:** "HubSpot export associations limit", "Pipedrive import file limit", and "Pipedrive undo import 48 hours" are *candidate long-tail informational/commercial-investigation queries*, not measured search volume or ranking opportunities. The useful buyer decision is whether a planned CRM switch is **reversible and complete** before choosing a subscription. No keyword tool, search-console account, public visitor research, or independent product account was used.

**First-party documentation reopened on 2026-11-01 (source-supported attribution only):**

| Provider document | Narrow current vendor-stated detail | Why a buyer should care | Evidence still missing |
| --- | --- | --- | --- |
| [HubSpot — Export your records](https://knowledge.hubspot.com/import-and-export/export-records) (page says last updated 2026-04-02) | Export requires the Export permission. By default, association columns include up to 1,000 associated record IDs; the export customization offers **All associated records (CSV files only)**. Contact calls/notes may need separate activity export paths. | A default export is not a demonstrated lossless migration of relationships or activities. | Whether the exact account/edition/role exposes these options; whether all required objects, associations and activities are exported and re-importable. |
| [Pipedrive — Importing data into Pipedrive with spreadsheets](https://support.pipedrive.com/en/article/importing-data-into-pipedrive-with-spreadsheets) (page says last updated 2026-10-19) | The documentation specifies CSV/XLS/XLSX, at most 200,000 rows and file size **under** 50 MB per spreadsheet import, with a header and one tab. Import requires an appropriate global permission. | File size and record count are separate batch constraints; successful upload is not proof of correct mapping. | Actual account limits, record type coverage, mandatory fields, skipped-row handling, and correct associations. |
| Same Pipedrive document, **Revert an import** section | It describes a revert option in import history **within 48 hours** for users with global admin permission; if unavailable, it directs users to support. | This is not evidence of a complete cross-system rollback, nor a promise that every updated/merged record and downstream side effect can be undone. | Whether the account offers revert for the planned operation, what the operation affects, and a separately tested backup/rollback procedure. |

**Original synthetic preflight checks (not real user results):**
1. **Association completeness:** imagine one fictional source record with **1,001** associations. The documented default export selection can include up to **1,000** IDs in that column, so an operator must deliberately check the CSV-only "All associated records" option and reconcile the expected 1,001 links against the output. This is a *test design*, not proof any real account truncates data or that the all-records option succeeds.
2. **Import batch arithmetic:** a fictional **220,000-row** source would need **at least two** Pipedrive import batches under the stated 200,000-row limit (for example, 150,000 + 70,000). File-size constraints may require more; rows alone cannot determine the number. Do not upload a real file to StackPilot.
3. **Rollback time gate:** an authorized fictional import at **10:00 Monday** has a vendor-documented revert window ending **10:00 Wednesday** (48 elapsed hours, ignoring daylight-saving shifts in this illustrative clock). Require a named global admin, a verified backup and an independent rollback decision **before** import. Treat the vendor revert button as *not tested*, not a disaster-recovery guarantee.
4. **Reconciliation gate:** compare records, relationships, activities, permissions and skipped rows separately. An unexplained missing association, unknown role entitlement or untested rollback blocks an actual cutover regardless of matched top-level counts.

**Editorial quality/measurement gates:** A human reviewer must re-open both source URLs, record the exact account edition, country, role, observed behavior and any changed limits; document whether a hands-on permitted test exists. Before any public version, the draft must answer the buyer's three preflight questions, include one correct synthetic example, distinguish *documented option* from *tested outcome*, and provide a useful next step without affiliate links. Content-completeness is assessable; **organic impressions, clicks, ranking, audience, leads and conversions remain UNKNOWN**. No public route, tracking, post, outreach, source-review timestamp, catalog approval or policy flag is changed by this section.

### Official first-party source leads (must be reopened by a human reviewer)
- HubSpot: https://knowledge.hubspot.com/import-and-export/export-records
- HubSpot: https://knowledge.hubspot.com/import-and-export/import-records-for-a-single-object
- Pipedrive: https://support.pipedrive.com/en/article/importing-data-into-pipedrive-with-spreadsheets
- Pipedrive: https://support.pipedrive.com/en/article/importing-deals-into-a-specific-stage-or-pipeline
- Pipedrive: https://support.pipedrive.com/en/article/exporting-data-from-pipedrive
- Pipedrive: https://support.pipedrive.com/en/article/hubspot-to-pipedrive-migration

## Independent editorial approval gate — all unchecked
- [ ] Human reviewer opened each cited URL and recorded date, title and full scope
- [ ] Edition, plan, region, export/import permissions and relevant limits confirmed
- [ ] Conflicting documentation and omissions disclosed
- [ ] Any hands-on evidence clearly distinguished from hypothetical test design
- [ ] No unsupported price, superiority, compatibility, ranking or testimonial
- [ ] Privacy, publisher attribution and affiliate disclosures reviewed
- [ ] Final owner permission granted before any public site publication

**Operational controls:** Keep Netlify Production and Deploy Previews private, Auto Publishing Locked, draft PR unmerged, all six software candidates unapproved, affiliate URLs null, no indexing and zero spend. This Markdown file is a private editorial deliverable, **not a new public route**.
