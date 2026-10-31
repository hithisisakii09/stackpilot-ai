# StackPilot AI — six-vendor owner editorial decision register
**Prepared 2026-10-31 · PRIVATE · ALL APPROVALS PENDING**

This register consolidates first-party documentation leads into a single human review surface. **None of the statements below is an independently tested capability, a product endorsement, or an approved publishing claim.** Source intake dates do not equal product functionality verification. Review any vendor text in context of relevant plan, role, region and current documentation.

## Suggested owner review decisions

| ID | Vendor | Precise review focus | Official source | Critical uncertainty | Decision |
|---|---|---|---|---|---|
| hubspot-doc-claim-1 | HubSpot | Export permission, record properties/associations; distinguish activities/attachments | https://knowledge.hubspot.com/import-and-export/export-records | Plan, object, permissions, association limits, data completeness | PENDING |
| pipedrive-doc-claim-1 | Pipedrive | XLS/XLSX/CSV import and field mapping | https://support.pipedrive.com/en/article/importing-data-into-pipedrive-with-spreadsheets | Role rights, import limits, relationship integrity, rollback caveats | PENDING |
| ahrefs-doc-claim-1 | Ahrefs | Site Audit crawl-credit consumption | https://help.ahrefs.com/en/articles/3119402-how-are-crawl-credits-in-site-audit-spent | Plan, verified-site entitlements, monthly credits and current rules | PENDING |
| semrush-doc-claim-1 | Semrush | Site Audit crawl scope, page ceilings and JS rendering | https://www.semrush.com/kb/539-configuring-site-audit | Toolkit edition, audit quotas, region, add-ons and entitlements | PENDING |
| kinsta-doc-claim-1 | Kinsta | WordPress hosting overage categories | https://kinsta.com/docs/billing/wordpress-hosting-plans/overages/ | Visit/bandwidth model, fees, taxes, current plan | PENDING |
| cloudways-doc-claim-1 | Cloudways | Flexible vs Autonomous off-site backup billing | https://support.cloudways.com/en/articles/5119648-charges-for-off-site-backups | Hosting family, backup storage/retention and actual charges | PENDING |

## Owner sign-off procedure (not delegated to agents)
1. Open each original provider page and confirm the exact statement, date, plan, region and permission level.
2. Mark each claim **REJECT**, **NEEDS REVISION** or **APPROVED**, with a dated reason. Missing evidence defaults to NEEDS REVISION.
3. Determine whether the claim is only **attributed vendor documentation** or genuinely **independently tested**. Do not label the latter without a reproducible authorized test.
4. Do not approve comparisons, rankings, prices, earnings or affiliate eligibility from these narrow documentation checks.
5. Record approved edits in a separate reviewed publication proposal. Automatic agents must not set `approved:true`, populate reviewer metadata, publish the website or authorize themselves.

## Known research locations
- `docs/editorial-drafts/2026-10-31-crm-source-recheck.md` (HubSpot/Pipedrive).
- `docs/editorial-drafts/2026-10-31-seo-hosting-source-recheck.md` (Ahrefs/Semrush/Kinsta/Cloudways).
- `src/data/research-claims.json` (six candidate-only entries, all `approved:false`).

## Other production gates
Provider account billing/quotas and commercial-use terms, verified individual publisher contact, privacy/legal disclosures, authenticated private-preview UAT and anonymous-access restriction testing, true affiliate program acceptance, and separate owner public-launch authorization remain **open**. Publisher choices: individual, free Netlify subdomain, owner reviewer. Budget ₹0; private preview and production; publishing locked; no main merge, indexing or affiliate activation.

**Verdict: GO for private research/engineering only; NO-GO for public production.**
