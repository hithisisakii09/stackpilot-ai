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
