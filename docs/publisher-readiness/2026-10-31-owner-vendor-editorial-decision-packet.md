# StackPilot AI — owner decision packet: vendor research and private readiness
**31 October 2026 | PRIVATE | DRAFT FOR HUMAN REVIEW — NOT APPROVAL OR LAUNCH AUTHORIZATION**

## Verified engineering baseline
At preparation, PR #1 head `6fd5a2f64489a9ed03081990b328b44087ceb309` was draft/unmerged. Validate/build and safety/operations had passed, Netlify deploy-preview showed success, and Chromium workflow remained in progress. This snapshot **is not a final CI GO**. Re-check the exact SHA for any review or later change.

## Scope of the owner decision
The research docs record six vendor statements that are **accurately attributed to the vendors' documentation**, not the operator's own independent tests. A reviewer should decide separately whether each narrow, dated statement is safe to reproduce, needs qualification, or should be withheld. No software winner, vendor rating, package price, business income or affiliate approval follows from this decision.

### Six review cards
| ID | Neutral assertion proposed | Caution requiring explicit editorial acknowledgment | Status |
| --- | --- | --- | --- |
| hubspot-doc-claim-1 | Vendor documentation describes CRM record exports with permissions, properties, associations. | Separate activity export paths, role and plan limits; **not hands-on tested**. | AWAITING HUMAN REVIEW |
| pipedrive-doc-claim-1 | Vendor documentation describes spreadsheet imports and permission requirements. | Actual plan, mapping, record type and import limits not tested. | AWAITING HUMAN REVIEW |
| ahrefs-doc-claim-1 | Vendor documentation describes internal HTML HTTP 200 pages consuming audit crawl credits. | Plan/verified-project entitlements differ; no actual account consumption test. | AWAITING HUMAN REVIEW |
| semrush-doc-claim-1 | Vendor documentation describes Site Audit scope and page controls. | Exact quota differs by plan; no site crawl performed. | AWAITING HUMAN REVIEW |
| kinsta-doc-claim-1 | Vendor documentation describes WordPress allowances and potential overages. | Exact plan, meter, notification, tax and rates unverified. | AWAITING HUMAN REVIEW |
| cloudways-doc-claim-1 | Vendor documentation distinguishes Flexible and Autonomous off-site backups. | Current billing, product-family terms and retention unverified. | AWAITING HUMAN REVIEW |

The supporting source URLs and retrieval dates are in `docs/editorial-drafts/2026-10-31-six-vendor-primary-source-check.md`. None of the six database records has `approved:true` and all remain `status:candidate`.

## Human reviewer decision workflow
For each ID, choose one future disposition only after checking the live source and its plan scope:
- **ACCEPT WITH ATTRIBUTION:** approve only the exact vendor-documentation statement, clearly indicating it has not been independently tested.
- **REVISE:** return a corrected text and dated rationale; do not auto-approve revised copy.
- **HOLD:** exclude from future public comparisons until evidence is stronger.
- **REJECT:** known misleading, outdated or unsupported assertion, cite evidence for rejection.

Record reviewer identity (not personal ID), review timestamp, source permalink, product edition/plan/region, material restrictions, proposed text and approval scope. **This private packet does not select a disposition for the user.** Do not set any claim approved on the strength of an agent-written document.

## Separate publisher/launch gates
- Working name ToolChoice Lab is still **only a planning candidate**; no formal name clearance or website rename.
- Owner-reported dedicated email and MFA are not permission to publicly post the address. Publication must be separately approved.
- Netlify Free $0, 300 credits and no saved card/invoices were shown in owner screenshots; Web Analytics is enabled and processes server/CDN log data. Final Analytics entitlement and privacy/legal handling require review.
- Operator/legal attribution, jurisdiction-specific privacy/terms and commercial-hosting suitability need human verification.
- Public-site editing/indexing, PR merge or unlock, affiliate onboarding/tracking and paid service activation each need distinct permission. DO NOT combine them with vendor approval.
- ₹0 monthly/₹0 delegated budget remains effective.

## Safe immediate tasks for existing agents
- Track exact-head CI and protected Netlify preview, look for route regressions.
- Keep six vendor pages under read-only source-freshness watch.
- Prepare qualified proposed claim edits in issues, not approvals, and avoid duplicate scheduler creation.
- Do not confuse Netlify analytics 99 unique visitor estimate with actual customers on the private site.

**Final decision today:** HUMAN APPROVAL NOT GIVEN; PRODUCTION/INDEXING/AFFILIATES **NO-GO**.
