# StackPilot AI — CRM migration reconciliation pack (synthetic-only)
**Private editorial/utility draft | 2026-10-31 | Not a completed migration or endorsed comparison**

## Who should use this
A CRM buyer comparing systems who needs a falsifiable, evidence-first migration estimate. This pack assumes no vendor has been functionally tested. It is designed for fictional records in a permitted environment, not for uploading real customer data to StackPilot.

## Synthetic demonstration
This example is *invented*. The source contains four contacts, two organizations and three deals. The hypothetical destination contains four contacts, two organizations and three deals; matching counts alone do **not** establish migration success.

| Object | Fictional source count | Fictional destination count | Other verification |
| --- | ---: | ---: | --- |
| Contact | 4 | 4 | Unique ID, email normalization, ownership |
| Organization | 2 | 2 | Contact/company association |
| Deal | 3 | 3 | Pipeline, stage, organization, currency |
| Note/activity | 2 | 1 | **Mismatch: one activity missing; block cutover** |
| Attachment | 1 | 1 | Content integrity and authorized access |

Expected result: **NO-GO**, because one fictional activity is missing. A rolled-up totals-only check might mislead the buyer: a correct result requires object-specific and relationship-specific reconciliation.

## Suggested blank run record
For each object type, record source and target totals; expected exclusions; actual mismatches; unique IDs; duplicate mappings; relationship accuracy; correct ownership and permissions; activity/attachment provenance; timezone and currency changes; evidence pointer; designated owner; and a pass/fail/unknown decision.

Use statuses:
- **PASS** only when the criterion is tested and the reviewer records repeatable evidence.
- **FAIL** when evidence shows a mismatch above a previously agreed tolerance.
- **NOT TESTED** when a vendor account/plan or consented environment is unavailable.
- **UNKNOWN** when results are ambiguous. Never silently convert unknown into pass.

## Essential buyer checks
1. Does the export include the objects and fields required by the buyer, under their role and plan?
2. Are imports idempotent and are duplicates controlled when rerun?
3. Are organizations/people/deals linked correctly, or merely present individually?
4. Do delegated access roles and record ownership remain secure?
5. Are notes, activities, attachments and audit history preserved as required?
6. Can the new system export the buyer's data for a later exit?
7. Is rollback actually executable, with explicit timing, scope and authorizer?
8. Is any additional staff time, training, data remediation, downtime or vendor add-on priced into total ownership cost?

## Non-vendor-specific CSV schema for private reviewer use
`object_type,source_count,target_count,expected_exclusions,unexplained_missing,association_errors,permissions_checked,proof_reference,decision`

**CSV safety:** Values beginning with `=`, `+`, `-` or `@` can be interpreted as formulas in spreadsheet software. Escape untrusted exported values before opening a CSV; never ingest customer exports into public tools. The example counts above are fictional, not a downloadable production data set.

## Recommended internal links (private preview, no new page)
- `/guides/crm-migration-checklist/`: cutover process and synthetic mapping sample.
- `/tools/requirements-checklist/`: select your own CRM requirements.
- `/tools/software-cost-calculator/`: user-entered quotes and migration expenses.
- `/guides/saas-total-cost-of-ownership/`: recurring and one-time cost framework.

## Vendor-specific evidence still unresolved
**HubSpot:** The official record-export documentation discusses permissions and associated records; confirm plan, role, object and note/activity behavior in the actual permitted environment. https://knowledge.hubspot.com/import-and-export/export-records

**Pipedrive:** Its spreadsheet-import guidance covers supported formats and mapping at the documentation level; confirm the exact edition, import rights, associations and limitations. https://support.pipedrive.com/en/article/importing-data-into-pipedrive-with-spreadsheets

This pack does **not** assert that either vendor performs a successful import/export or has superior migration ability.

## Publication and review gate
- [ ] Original content fact-check completed by authenticated human reviewer.
- [ ] Vendor wording scoped to documentation date, edition, region and role.
- [ ] No real private records, customer exports, undocumented API access or paid trials used.
- [ ] Synthetic example and NO-GO explanation validated.
- [ ] Publisher legal/privacy/editorial disclosures accepted by owner.
- [ ] Owner separately authorizes public launch.

**Business policy:** ₹0 spend, private Netlify preview, production Private/Locked, draft PR unmerged, noindex, no affiliate applications or links, no public publishing. This Markdown file is a private preparatory artifact only.
