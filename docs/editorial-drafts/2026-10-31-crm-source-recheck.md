# CRM migration source recheck — 2026-10-31
**Status: CANDIDATE ONLY — no editorial approval, independent test, endorsement or publication.**
**Scope:** Read-only verification of two previously listed official documentation URLs, not authenticated product usage.

## HubSpot — export-records documentation
- Source: https://knowledge.hubspot.com/import-and-export/export-records
- Page title: "Export your records"; vendor-reported last updated **2026-04-02**; independently revisited **2026-10-31**.
- Vendor currently states Export permission is required, record export includes current property values and associations, and contact activities may need separate export/report/API paths.
- Important migration nuance: default exported association columns can be capped at 1,000 linked record IDs, with alternative settings for associations including CSV-specific options; export-download links expire according to the vendor page. Avoid treating a standard export as a verified complete activity/attachment archive.
- Remaining questions: actual account roles, object entitlements, custom objects, activity export availability, regional controls, relation integrity, data retention and whether settings differ by subscription.
- Evidence class: **vendor claim inspected**, not hands-on verified. Approval **pending owner**.

## Pipedrive — spreadsheet-import documentation
- Source: https://support.pipedrive.com/en/article/importing-data-into-pipedrive-with-spreadsheets
- Page title: "Importing data into Pipedrive with spreadsheets"; vendor-reported last updated **2026-10-19**; independently revisited **2026-10-31**.
- Vendor currently describes importing XLS, XLSX or CSV, requiring an enabled global permission, mapping mandatory fields, previewing import, and handling duplicates.
- Vendor's stated file requirements in this article: one sheet/tab per import, headers, at most **200,000 rows**, and under **50 MB**. These figures need owner review for plan/region applicability before any editorial publication.
- Vendor says global admins can revert imports from import history within **48 hours**; don't treat this as universal rollback protection or use on live records without authorized testing.
- Remaining questions: plan and role limits, all record types and relationships, attachments, custom fields, data privacy, current API/import coverage, and test verification.
- Evidence class: **vendor claim inspected**, not hands-on verified. Approval **pending owner**.

## Editorial action queue
1. Have the owner assess each above vendor assertion against the precise plan/role/region, source freshness and unsupported data types.
2. Keep six records in `src/data/research-claims.json` at `status:candidate`, `approved:false`, reviewer/reviewedAt null. No verified rankings or published comparisons.
3. Create a synthetic-data-only CRM migration verification protocol before claiming successful imports/exports; do not sign up for trials or access customer data automatically.
4. Check remaining four sources (Ahrefs, Semrush, Kinsta, Cloudways) separately. Until then, their freshness has not been rechecked in this sprint.

**Release controls:** ₹0 spend, Netlify private, no main merge, no affiliate activation, no public release or indexing. This file records research, not human editorial approval.
