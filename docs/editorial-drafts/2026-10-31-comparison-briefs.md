# StackPilot AI — Unpublished comparison editorial briefs
**Prepared:** 2026-10-31 · **Status:** DRAFT / NOT APPROVED · **Audience:** human editor and autonomous research agent
**Release gate:** Do NOT publish as verified, add buying endorsements, quote unsupported prices, send to search engines, or activate affiliate tracking.

These are original editorial research briefs using vendor-published documentation. Each item is attributed as a **vendor statement** rather than independent testing. Check source freshness, current plan eligibility, geography, product editions, legal disclosures, and claim-by-claim editor approval before converting to a public article.

## 1. CRM: HubSpot vs Pipedrive — Is your team's sales data portable?
**Search intent:** Teams moving away from spreadsheets or migrating sales pipelines. This brief is about questions to ask, *not* which product wins.

### Vendor-stated facts queued for verification
- **HubSpot:** Its documentation says record exports can contain current property values and associations (including contact and deal records), and users need export permissions. A different HubSpot import guide describes bulk imports from spreadsheet files and indicates relevant import and edit permissions are required. Exact formats, custom objects, and available features depend on the account. [HubSpot record exports](https://knowledge.hubspot.com/import-and-export/export-records) (page states 2026-04-02); [HubSpot import records](https://knowledge.hubspot.com/import-and-export/import-records-for-a-single-object) (page states 2026-10-07).
- **Pipedrive:** Its support documentation describes spreadsheet importing (including CSV/XLS/XLSX) for CRM records, with permissions and field mapping. It also documents selecting deal pipeline and stage in an import and says data-type exports depend on administrative permissions. A separate migration guide recommends testing a small sample import before migrating the rest. [Import spreadsheets](https://support.pipedrive.com/en/article/importing-data-into-pipedrive-with-spreadsheets) (page states 2026-10-19); [pipeline/stage import](https://support.pipedrive.com/en/article/importing-deals-into-a-specific-stage-or-pipeline) (page states 2026-09-03); [exporting data](https://support.pipedrive.com/en/article/exporting-data-from-pipedrive); [migration guide](https://support.pipedrive.com/en/article/hubspot-to-pipedrive-migration).

### Buyer experiments / review tasks
1. Write down the current pipeline stages, record relationships and custom fields.
2. Using permitted **test data**, trial a small import to each provider's eligible plan, checking field mapping and duplicate handling.
3. Check whether a complete export preserves relationships and notes when the time comes to migrate away.
4. Verify plan-level limits on seats, permissions, data ownership, automation and reporting before publishing any price comparison.
5. Collect the provider's current documents and plan-specific screenshots; avoid using private customer data in research evidence.

**Editorial unknowns:** Subscription tiers, real migration effort, feature parity, real prices and taxes, country restrictions, customer support, and a tested recommendation.

## 2. SEO: Ahrefs vs Semrush — Audit coverage and how plan limits work
**Search intent:** Teams choosing a technical SEO auditing workflow with predictable usage.

### Vendor-stated facts queued for verification
- **Ahrefs:** Documentation says Site Audit crawl credits are consumed by internal HTML pages returning HTTP 200, with a variety of redirects/assets not consuming those credits. It also describes verified-property-related crawl allowances, subject to active plan restrictions. [Crawl credits](https://help.ahrefs.com/en/articles/3119402-how-are-crawl-credits-in-site-audit-spent) (page states 2026-09-03); [row, export and user limits](https://help.ahrefs.com/en/articles/14333008-about-rows-export-rows-and-user-limits) (page states 2026-09-03).
- **Semrush:** Its Site Audit configuration guide describes scope, pages-per-audit restrictions, optional JavaScript rendering and schedules, with differences among SEO Toolkit tiers. It documents specifying a sitemap or list of URLs as an alternative to link-based crawling. [Site Audit configuration](https://www.semrush.com/kb/539-configuring-site-audit); [Site Audit overview](https://www.semrush.com/kb/31-site-audit).

### Buyer experiments / review tasks
1. Define audit goals and desired coverage (host/subdomain/subfolder, mobile/desktop, JS-rendered pages).
2. Compare **current** monthly crawl allowances, per-audit limits, verification requirements, re-audit schedule, and export restrictions for the exact plans being considered.
3. Check privacy, site ownership verification, read-only access and crawler load before connecting a website.
4. Use public test URLs or an owned site only with permission, and document reproducible findings without accessing anyone else's private data.

**Editorial unknowns:** Exact current allowances across plans, paid feature entitlement, keyword datasets, quality or accuracy of findings, observed performance, and price comparison. **No winner** is determined by the vendor documentation.

## 3. Hosting: Kinsta vs Cloudways — Backups, overages and workload fit
**Search intent:** Website operators checking total ownership costs and restore processes before switching hosts.

### Vendor-stated facts queued for verification
- **Kinsta:** Its WordPress hosting plan documentation discusses plan choices based on monthly visits or server bandwidth, number of sites, storage, CDN resources and backup retention. A separate overage guide warns that exceeding some plan allocations may lead to additional charges and describes usage alerts. [Choosing a WordPress plan](https://kinsta.com/docs/billing/wordpress-hosting-plans/wordpress-choosing-the-right-plan/) (page states 2026-02-05); [overages](https://kinsta.com/docs/billing/wordpress-hosting-plans/overages/) (page states 2026-03-09).
- **Cloudways:** The official help center says offsite backups for Cloudways **Flexible** are billed separately by backup storage usage, whereas Cloudways **Autonomous** includes those backups in the plan price. These are different product families: do not treat their charges as interchangeable. [Charges for off-site backups](https://support.cloudways.com/en/articles/5119648-charges-for-off-site-backups) (page states 2025-11-11).

### Buyer experiments / review tasks
1. Specify actual workload: WordPress vs other application, monthly traffic, storage, bandwidth, location, required staging and restore objectives.
2. Ask both vendors for plan-specific backup/restore procedures, retention and estimated **total** bill, including taxes, overages, add-ons and support scope.
3. Test a staging restore only in a permitted evaluation environment, recording observed time and any data loss risks.
4. Verify migration assistance, support escalation, compliance and geographic region for the chosen product offering.

**Editorial unknowns:** True cross-provider workload equivalence, application compatibility by tier, current final prices, real SLA and support quality, and tested migration outcome.

---

## Editorial release checklist (all unchecked)
- [ ] Each statement rechecked against a primary source and timestamp/URL logged
- [ ] Product, edition, country, plan, currency and billing frequency scoped
- [ ] Potentially conflicting claims independently reconciled
- [ ] No vendor content used as an independent user testimonial or hands-on test result
- [ ] Author/editor identity and contact disclosures reviewed
- [ ] Privacy, advertiser transparency and affiliate program terms reviewed
- [ ] Licensed screenshots/content and accessibility checked
- [ ] Authentic editorial sign-off recorded outside the unauthenticated static repository
- [ ] Public publication and indexing independently authorized by owner

**Nonpublication rule:** These drafts remain within private repository documentation; they are *not* introduced into Astro public routes, and none of the catalog's `verified` flags, `affiliateUrl` values or pricing fields are changed.
