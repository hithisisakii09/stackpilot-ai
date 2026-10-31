# Private privacy and vendor-claim editorial handoff — 2026-10-31
**Status: internal working draft; does not constitute legal signoff, claim approval or launch permission.**

## Verified operational evidence (scope matters)
- Owner's Netlify Free dashboard: $0 plan; 300 credits/month; 284.8 remaining at screenshot; no stored credit card, no overdue invoices or paid receipts shown. Do not infer a permanent guarantee of zero bills, or settled Analytics add-on terms.
- Owner confirms Web Analytics enabled. Project analytics screenshot showed 153 pageviews, 99 unique visitors, 3 MB bandwidth, US 123 and India 30 pageviews, direct traffic 139, for an Oct 30–31 selected window. The numbers are **not** externally acquired customers, independent demand, SEO success or sales; private testing/monitoring traffic can contribute.
- Netlify first-party Analytics documentation (https://docs.netlify.com/manage/monitoring/web-analytics/how-web-analytics-works/; checked Oct 31, 2026) says analytics is derived from CDN server logs with no client-side tracking code and no cookies, and counts unique visitors by distinct IP addresses within the selected period. Its documentation describes anonymous tracking and makes a GDPR claim; **this is the provider's assertion**, not a StackPilot legal assessment or proof that no IP processing occurs.
- Netlify first-party credit-based pricing documentation (https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/; checked Oct 31, 2026) distinguishes newer credit-based Free plans and legacy plans. The account shows Free credits, but the Web Analytics interface includes a 'Cancel Web Analytics subscription' warning. Continue treating separate Analytics entitlement/possible future charge as **unresolved**, even though no current invoice or stored payment method is shown.
- Existing app worksheet logic builds text and CSV in the browser; there is no user-entered vendor-answer upload in the inspected route. This does **not** mean Netlify infrastructure receives no IP/HTTP request metadata.

## Exact candidate privacy text for OWNER/LEGAL REVIEW ONLY
> We provide software buyer research and locally generated checklists. When you use the current requirements worksheet, your chosen requirements are processed in your browser, and you can download a CSV to your device. The worksheet does not intentionally submit the selected answers to a StackPilot application server. Our hosting provider Netlify processes technical requests to serve and secure the site. Netlify Web Analytics is enabled and derives traffic reports from CDN server logs without adding a client-side analytics script or tracking cookies. Its reporting includes pageviews, approximate locations and distinct-visitor metrics based on IP addresses. Before public launch, we will document the actual controller identity, purposes and lawful grounds where required, retention periods, provider agreements, access rights, and a contact for privacy requests.

**Do NOT put this text into a public route yet.** Check actual logs/retention and legal jurisdiction. A website privacy policy needs truthful present-tense claims, not an incomplete proposed policy, and must not promise that *no data whatsoever* is processed.

## Six vendor candidate claim-review matrix (NO signoff inferred)
| Candidate ID | Original primary lead | Verification required before approving |
| --- | --- | --- |
| hubspot-doc-claim-1 | https://knowledge.hubspot.com/import-and-export/export-records | Check exact permissions, exported object properties/associations, version and activity limitations |
| pipedrive-doc-claim-1 | https://support.pipedrive.com/en/article/importing-data-into-pipedrive-with-spreadsheets | Check allowed file formats, import roles, mandatory mapping and actual plan/edition |
| ahrefs-doc-claim-1 | https://help.ahrefs.com/en/articles/3119402-how-are-crawl-credits-in-site-audit-spent | Identify eligible HTML responses versus redirects/assets; exact quota plan and date |
| semrush-doc-claim-1 | https://www.semrush.com/kb/539-configuring-site-audit | Validate subfolder/subdomain audit options and per-audit/monthly subscription limits |
| kinsta-doc-claim-1 | https://kinsta.com/docs/billing/wordpress-hosting-plans/overages/ | Verify exact WordPress plan, metering/overage conditions, region/taxes and rate changes |
| cloudways-doc-claim-1 | https://support.cloudways.com/en/articles/5119648-charges-for-off-site-backups | Verify Flexible vs Autonomous distinction, backup storage pricing and retention |

The vendor links are **review leads**, not confirmation of present product plans or hands-on tests. All six records must remain `status:candidate`, `approved:false`, `reviewer:null` and `reviewedAt:null` until genuine human review. No invented reviewer IDs or timestamp.

## Reviewer evidence schema
For each claim collect: claim ID; source URL; retrieval date/time; publisher's exact statement and material exclusions; product family; plan and geographical scope; screenshot/quote or controlled evidence; independent test actually conducted (yes/no); factual discrepancy; suggested edit; authorized human reviewer decision and date. Source text should be paraphrased carefully without excessive reproduction.

## Actions that do not require owner release approval
- Read and compare primary vendor documentation for each candidate; record unknowns without changing approval flags.
- Check private Astro site behavior and basic link/content QA at exact development SHA.
- Perform static privacy/telemetry audit; record what code can and cannot prove.
- Existing scheduled operator, Growth Agent and incident watch may continue within current bounded authority.

## Owner-controlled blockers
- Trademark and legally accurate operator identity, final public contact publication approval.
- Privacy/legal and commercial-hosting eligibility review, including Analytics billing ambiguity.
- Six vendor factual and comparison signoffs, independent of successful automated tests.
- Public site changes, indexing and production deployment require separate explicit permission; affiliates require separate account/legal approval.

**Invariant:** ₹0 monthly and delegated spend, no payments/contracts/new accounts, no renaming, no main merge, PR draft/unmerged, Netlify production+preview private, auto publishing locked, no live affiliate links or public publishing.
