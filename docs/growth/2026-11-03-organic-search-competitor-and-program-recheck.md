# StackPilot AI — organic search competitor scan, SEO audit brief and partner recheck

**Research date:** 2026-11-03 (Asia/Kolkata)  
**Status:** PRIVATE RESEARCH / DRAFT ONLY / NOT EDITORIALLY APPROVED / NOT PUBLISHED  
**Repository checkpoint before this documentation commit:** `feature/phase-1-1-recommendation-engine` at `e74e2dc8f1206f6ec59c8837ebbda136fd244f3c`; draft PR #1 open, draft and unmerged; `main` remains `c8fadcbf799e45ec41db2278aa7f84bb48c99895`.

## 1. Scope, operating policy and queue

Read `AGENTS.md`, `config/operating-policy.json`, `docs/current-operational-state.md`, PR #1, issue #4 and issue #6 before this research. The policy remains ₹0 monthly spend, ₹0 delegated spend, no commercial-hosting approval, no production approval, no affiliate activation and no paid-services approval. No account, provider, publishing, indexing or access-control setting was changed.

The latest exact-HEAD operations artifact available during this run is [operations run #41422224856](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41422224856), generated 2026-11-02 at 09:38 UTC for the then-current exact SHA `e74e2dc`. Its read-only `artifacts/ops/backlog.json` reported 12 automatic research tasks, 4 owner gates, 0 source records needing freshness refresh, 0 approved claims, 5 affiliate program candidates and 1 discovery gap. Its priority queue was:

- P30 `draft-evidence-review`: Ahrefs, Cloudways, HubSpot, Kinsta, Pipedrive, Semrush.
- P40 `locate-official-program:ahrefs`.
- P50 `recheck-program-eligibility`: Cloudways, HubSpot, Kinsta, Pipedrive and Semrush.

**Coordination decision:** the six P30 candidate-source spot-checks already have a dedicated packet and current notes in open issue [#6](https://github.com/hithisisakii09/stackpilot-ai/issues/6), including the 2026-11-02 six-vendor recheck. The existing CRM exit-evidence brief already covers HubSpot/Pipedrive export completeness. I did not duplicate those edits, change source intake dates, or mark a claim reviewed. I completed the remaining read-only Ahrefs program discovery and refreshed the five official partner-eligibility pages below. Issue [#4](https://github.com/hithisisakii09/stackpilot-ai/issues/4) is closed; this note is an append-only handoff, not a reopening or a change to its status. Issue #6 remains the active human evidence-review gate.

### Local-snapshot command audits

I executed the repository's read-only `research:claims` and `publisher:readiness` command logic against a local snapshot of the branch's scripts, modules and JSON inputs. No repository input files were changed by these audits.

- `npm run research:claims -- --json`: 6 source-backed candidates; 6 products remain `Unreviewed`; 0 approved claims; `reviewedOn:null`; independent testing false. Each source record is dated 2026-10-31 and currently falls within the 90-day freshness window (`needsRefresh:false`). This is **source-intake freshness only**, not editorial review, source certification or plan eligibility.
- `npm run publisher:readiness -- --json`: `prelaunch-owner-evidence-required`; 11 owner gates unverified; actual traffic and earnings null; publisher identity and audience unverified; 0 applications submitted, 0 programs accepted and 0 tracking links active. All six remote-preview release evidence gates remain `UNVERIFIED`; public release readiness is false.
- No `ownerGates` were executed or checked. No candidate claim, application, acceptance, tracking URL, revenue or product-verification field was changed.

## 2. Competitor and search-result landscape

This is a qualitative content scan, **not** a measured SERP ranking study, market-share report or keyword-volume analysis.

| Content competitor / source | Observed positioning | StackPilot opportunity without copying |
| --- | --- | --- |
| [HubSpot CRM Data Migration Pilot Checklist](https://www.hubspot.com/crm-data-migrations-import-checklist) | Vendor-owned checklist: export/connect, clean data, object and field mapping, association files, test import and review. | Add a vendor-neutral evidence request: role/visibility scope, separate activity/file exports, expiry, restore authority and an explicit NO-GO rule. |
| [Pipedrive: HubSpot migration guide](https://support.pipedrive.com/en/article/hubspot-to-pipedrive-migration) | Vendor-owned, destination-specific walkthrough; last updated 2026-09-23. Includes terminology mapping, custom fields, import order and a 5–10-record test import. | Explain what the walkthrough cannot prove about a particular source account, permissions, plan, linked history or cancellation decision. |
| [Import2 HubSpot migration guide](https://help.import2.com/en/articles/16743805-how-to-setup-a-migration-from-hubspot-with-import2) | Commercial migration tooling documents the requested connection scopes, sample migration, field mapping and the purchase step for a full migration; its help page says disconnecting revokes its access token but does not roll back records already written to the destination. | Remain neutral: help a buyer decide what must be tested before choosing a manual, connector or managed-service route. Do not imply a free sample is a full migration or endorse a provider. A SyncMatters search result was excluded after its page returned 404 on direct recheck. |
| [LeadMino CRM migration checklist](https://leadmino.com/blog/crm-migration-checklist/) | Competes for printable checklist and migration-planning intent. | Differentiate through dated first-party evidence, plan/permission caveats and a copyable exit-evidence matrix, not another generic five-step list. Treat its transfer/retention assertions as third-party claims requiring primary-source checks. |
| [Spendflo TCO template](https://www.spendflo.com/template/total-cost-of-ownership-template) and [Tropic](https://www.tropicapp.io/) | Procurement / finance-oriented TCO templates and SaaS spend-management positioning. | Keep StackPilot's buyer worksheet lightweight for small teams: user-entered seats, implementation, support, usage and exit costs; no vendor quote or enterprise procurement promise. |
| [Ahrefs Webmaster Tools crawler article](https://ahrefs.com/blog/awt-website-crawler/), [Semrush Site Audit docs](https://www.semrush.com/kb/539-configuring-site-audit) and third-party audit comparisons | Product documentation and comparison articles discuss page coverage, crawl sources and tier limits; many comparisons omit the distinction between monthly and per-audit caps or verified and unverified projects. | Publish a plan-scoping explainer, not a “winner” list: define what counts, how scope is chosen, which caps are monthly vs per-run, and what requires a verified property or higher toolkit tier. |

**Positioning guardrail:** StackPilot is preparing a neutral, evidence-led buyer decision aid, not a migration vendor, independent lab, pricing authority or “best software” ranking site. Vendor statements must remain attributed to the vendor until an authorized human editor approves them. Do not copy competitor wording, testimonials, screenshots or unsupported performance claims.

## 3. Buyer-intent keyword hypotheses

No keyword-volume, ranking, difficulty, traffic or conversion dataset was available. These are task-based hypotheses for later Search Console validation, not claims of demand.

| Query family (examples) | Intent | Content angle / measurable editorial deliverable |
| --- | --- | --- |
| `Ahrefs Site Audit crawl credits`; `Semrush Site Audit page limit`; `Ahrefs vs Semrush Site Audit limits` | Commercial investigation / plan selection | One dated comparison table separating counted URLs, monthly allowances, per-audit caps, project verification and JavaScript rendering. |
| `SEO audit crawl budget calculator`; `how many pages can Semrush crawl`; `Ahrefs verified project crawl credits` | Pre-purchase planning | Scope worksheet using the buyer's own host, sitemap, internal 200 HTML page estimate and audit frequency. No vendor account connection. |
| `HubSpot export associations activities`; `Pipedrive export activities notes files` | Migration / exit diligence | Existing exit-evidence brief: distinguish record snapshots from activities, attachments, relationships and role visibility. |
| `CRM migration rollback checklist`; `CRM data migration cost calculator` | Commercial investigation | Existing CRM readiness and TCO assets; no duplicate checklist page. |
| `Kinsta WordPress overage fees`; `Cloudways off-site backup charges`; `WordPress hosting visits vs bandwidth billing` | Pricing / risk diligence | Existing hosting hidden-cost worksheet: separate product families, usage meters, backup storage, CDN, disk and overage timing. |
| `SaaS per-seat billing vs active user`; `SaaS renewal cancellation checklist`; `SaaS total cost of ownership template` | Purchase / renewal decision | Existing seat audit and TCO guide; prioritize evidence and definitions rather than another generic TCO article. |

**Prioritization:** the SEO audit scope explainer is the next distinct editorial candidate because it answers a concrete pre-purchase question and can complement the existing private `/tools/seo-audit-scope/` worksheet. Do not create keyword-variant pages.

## 4. New unpublished SEO content brief and draft

**Working title:** *Before You Buy an SEO Audit Plan, Work Out What Counts as a Crawl Page*  
**Audience:** small agency owner, in-house SEO lead or marketing manager comparing an audit workflow for one or more sites.  
**Primary task:** estimate whether a candidate plan can cover the required website scope and audit frequency without confusing discovered URLs, billable crawl credits, monthly allowance and per-audit caps.  
**Primary query hypotheses:** `Ahrefs Site Audit crawl credits`, `Semrush Site Audit page limit`, `Ahrefs vs Semrush Site Audit limits`.  
**Secondary hypotheses:** `SEO audit crawl budget calculator`, `Ahrefs verified project crawl credits`, `Semrush Site Audit JavaScript rendering`.  
**Search-volume and ranking status:** UNKNOWN.

### Source-backed facts to use carefully

- **Ahrefs:** its [crawl-credit help page](https://help.ahrefs.com/en/articles/3119402-how-are-crawl-credits-in-site-audit-spent), dated 2026-09-03 and reopened 2026-11-03, says only internal HTML pages returning HTTP 200 consume Site Audit crawl credits; 3xx redirects, 4xx/5xx URLs, images/CSS/JS resources and external URLs do not. It describes plan-dependent monthly allowances of 100K–5M pages and 5,000 free crawl credits per verified project per month across plans. Exact plan, project verification, usage and account entitlement still require buyer confirmation.
- **Ahrefs plan nuance:** the [Starter-plan help page](https://help.ahrefs.com/en/articles/9419051-about-ahrefs-starter-plan), also dated 2026-09-03, separates shared account credits from Site Audit crawl credits and lists 5,000 crawl credits per verified project/month for Free, Starter and Lite. For unverified projects it lists 0 pages for Free, 500 pages / 10,000 crawl credits for Starter, and 25,000 pages / 100,000 crawl credits for Lite. Do not merge those rows or assume a verified-project allowance applies to an unowned site.
- **Semrush:** [How does Site Audit work?](https://www.semrush.com/kb/31-site-audit), reopened 2026-11-03, lists monthly/per-audit caps of no SEO Toolkit 100 / 100 pages, Pro 100,000 / 20,000, Guru 300,000 / 20,000, and Business 1,000,000 / 100,000. It lists concurrent-audit caps of 1 / 2 / 2 / 5 respectively and says JavaScript rendering is available with Guru or Business SEO Toolkit. Semrush One Starter, Pro+ and Advanced map to Pro, Guru and Business SEO Toolkit limits. No on-page last-updated date was visible; recheck before any public numeric claim.
- **Semrush crawl scope:** [Configuring Site Audit](https://www.semrush.com/kb/539-configuring-site-audit) documents domain, subdomain and subfolder scope, crawl sources and schedules. The default domain scope includes available subdomains and subfolders unless narrowed; a buyer should explicitly set the intended scope.

### Proposed article structure

1. **A discovered URL is not automatically a billable crawl page.** Define internal HTML 200 pages separately from redirects, error responses, static resources and external links.
2. **Check property verification first.** Explain why verified and unverified projects can have different allowances; never assume the reader can crawl a client site without permission.
3. **Compare monthly cap with per-audit cap.** A plan with a large monthly total can still impose a smaller single-audit limit.
4. **Scope the crawl deliberately.** Record canonical host, subdomains, subfolders, sitemap coverage, parameter URLs, duplicate paths, internal 200 HTML pages and any JavaScript-rendered sections.
5. **Check frequency and outputs.** Record one-time vs scheduled audits, required exports/history, team seats and access controls; verify each on the exact subscription being considered.
6. **Use a buyer-owned test property.** Run a small authorized crawl, record the settings and actual result, and compare it with the estimate. Do not test against a third-party site without permission.
7. **Make the purchase decision only after the scope worksheet is complete.** If plan, project verification, page count or rendering entitlement is unknown, label the estimate UNKNOWN rather than recommending a tier.

### Full draft article (unpublished)

# How to Compare SEO Audit Crawl Limits Without Mixing Up the Numbers

An SEO audit limit is not always a simple count of every URL a crawler discovers. Some products count only certain internal HTML responses; others distinguish the monthly allowance from the maximum pages in one audit. A verified website can have a different allowance from an unverified project, and JavaScript rendering may depend on the toolkit tier.

Before choosing a plan, write down the site you are allowed to crawl, the pages you actually need, how often you will audit them and which reports you must export. Then compare those requirements with the vendor's current documentation for the exact plan—not a headline number from an old comparison article.

## Start with the unit being counted

Ahrefs says Site Audit crawl credits are consumed by internal HTML pages that return HTTP 200. Its help page says redirects, error responses, images, CSS, JavaScript resources and external URLs do not consume those credits. That means the number of URLs a crawler discovers can be higher than the number of credit-consuming pages.

Ahrefs also separates verified and unverified projects. Its September 3, 2026 Starter-plan table lists 5,000 crawl credits per verified project per month for Free, Starter and Lite. For unverified projects, it lists no Site Audit allowance on Free, 500 pages and 10,000 crawl credits on Starter, and 25,000 pages and 100,000 crawl credits on Lite. The same page separately lists shared account credits, so do not treat those shared credits as Site Audit crawl credits.

The practical question is not simply “How many URLs are on my site?” It is “How many internal HTML pages that qualify under this product's rules will be crawled, under my actual project-verification state and subscription?”

## Compare monthly allowance and per-audit cap separately

Semrush documents both a monthly page allowance and a maximum number of pages in one audit. Its current help page lists the following limits:

| Semrush subscription | Monthly pages | Maximum pages in one audit | Audits running at once |
| --- | ---: | ---: | ---: |
| No SEO Toolkit | 100 | 100 | 1 |
| Pro SEO Toolkit | 100,000 | 20,000 | 2 |
| Guru SEO Toolkit | 300,000 | 20,000 | 2 |
| Business SEO Toolkit | 1,000,000 | 100,000 | 5 |

Semrush says JavaScript rendering is available with Guru or Business SEO Toolkit. Its documentation also maps Semrush One Starter to Pro SEO Toolkit, Semrush One Pro+ to Guru, and Semrush One Advanced to Business. Verify the exact product name and entitlement shown in the account before relying on that mapping.

A monthly allowance does not guarantee that one audit can consume the whole allowance. For example, a monthly total may be large while a single audit is capped at a smaller number. If you schedule repeated audits, check both the per-audit maximum and how many audits may run concurrently.

## Set the crawl scope before estimating pages

A root-domain crawl can include subdomains and subfolders. If you only need a blog, a documentation site or a regional subfolder, narrow the scope deliberately. Record whether the audit uses the website crawler, a sitemap or an imported URL list; those choices can change the set of pages included.

For a useful estimate, record:

- the canonical hostname and every permitted subdomain;
- the subfolders that are in scope;
- sitemap URLs and any imported URL list;
- parameterized and duplicate URL patterns;
- an estimate of internal HTML pages returning HTTP 200;
- whether important pages require JavaScript rendering;
- how often the audit will run and which reports must be exported.

Do not crawl a client's or third party's site without permission. Project verification is an ownership control, not a box to work around.

## Run a small, authorized test before choosing a plan

If you control the website, use a small test crawl with the intended scope and settings. Record the project-verification state, crawler source, page cap, rendering option and actual result. Compare the observed credit/page consumption with your estimate. If the numbers differ, investigate redirects, duplicate paths, error responses, resource requests and subdomain scope before upgrading.

Do not present a sample crawl as proof of a vendor's overall accuracy or performance. It only shows what happened for that site, configuration, plan and date.

## A buyer's decision rule

Choose a plan only after you can answer five questions:

1. Which pages are in scope, and which of them consume the vendor's crawl unit?
2. Is the allowance monthly, per project, per audit or shared across tools?
3. Does project verification change the allowance?
4. Do you need JavaScript rendering, concurrent audits, schedules or particular exports?
5. Are the subscription name, currency, region, tax, renewal and overage terms confirmed for the account you will actually use?

If any answer is unknown, keep the estimate marked UNKNOWN and ask the vendor or account owner. Do not infer a bill from a marketing headline or select a higher plan just because two products use different counting rules.

This article compares published plan rules, not the accuracy of either product's audit findings. No StackPilot hands-on test, paid subscription, vendor account or third-party website crawl has been performed. All numeric limits above are vendor-published snapshots and must be rechecked before publication.

### Buyer worksheet fields and editorial acceptance

- Site owner / authorization: PASS / FAIL / NOT TESTED.
- Exact canonical host, subdomains and subfolders in scope.
- Sitemap URLs and imported URL list; duplicate/parameter handling.
- Estimated internal HTML 200 pages (buyer-supplied or measured on an owned site).
- Monthly audit frequency and per-run page cap.
- Project verification state and permitted crawl user.
- JavaScript rendering requirement and plan entitlement.
- Monthly credits, per-audit cap, export rows, report/history retention and seat requirements.
- Currency, billing period, tax, region, overage/add-on and cancellation terms from a current official plan page.
- Actual authorized test result vs estimate; deviations and unresolved questions.

**Pre-publication acceptance:** 100% of numeric/plan claims link to a first-party source and retrieval date; plan family, verification state and region caveats accompany the claim; no unverified price or recommendation; no simulated test represented as real; no affiliate link; an independent human editor approves every vendor statement. The existing `/tools/seo-audit-scope/` route may be referenced internally in a future approved release; no new public route is created by this draft.

## 5. Official affiliate-program and publisher-fit recheck

Research only. No signup, application, login, account creation, contract, KYC, payout configuration or tracking URL was performed.

| Vendor | Current official evidence observed | Practical fit / unresolved point |
| --- | --- | --- |
| **Ahrefs** | Ahrefs' official [2023-06-12 article](https://ahrefs.com/blog/ahrefs-affiliate-program/) says its former program was discontinued and no relaunch was planned at that time. No current public Ahrefs SEO-product affiliate signup was found in this 2026-11-03 search. | **Current program status unconfirmed.** Keep `programUrl:null` and `program-discovery-needed`; do not invent a partner signup or treat third-party directories as proof. |
| **Pipedrive** | [Official affiliate page](https://www.pipedrive.com/en/affiliate-partnership) says applicants need a relevant professional website with landing pages or an appropriate professional social channel; it says global promotion is possible subject to geographic exceptions communicated during review. | India-specific restrictions are not enumerated publicly. A private preview is not evidence of an eligible public publisher channel. No application. |
| **HubSpot** | [Official affiliate overview](https://www.hubspot.com/partners/affiliates/f937) describes software reviewers, content creators, online educators and business solutions. Its FAQ's eligible customer-region list includes NORTHAM, UK&I, ANZ, France, DACH, Japan, Benelux, Nordics, SEA, LATAM and Iberia. | India is not explicitly named in that list; do not infer that India is eligible because SEA appears. Confirm country and customer-region eligibility with the program before any owner-authorized application. |
| **Cloudways** | [Official affiliate help article](https://support.cloudways.com/en/articles/5134056-how-to-join-cloudways-affiliate-program-faqs-benefits), dated 2026-04-28, describes creating an affiliate profile inside a Cloudways Platform account and review after submission. It documents PayPal payout after $250 approved monthly commission and wire transfer at $1,000 or more per payout cycle. | India-specific program availability and supported payout route are not established by the public article. No Cloudways account was created and no payout eligibility was tested. |
| **Kinsta** | [Official affiliate FAQ](https://kinsta.com/affiliates/) says the team manually screens websites and generally rejects unfinished/under-construction sites, sites without their own domain, thin tool lists without further information, sites without disclosure and social-media-only profiles. | Current private prelaunch Netlify subdomain and unfinished content do not meet the published website criteria. Application is premature; no domain purchase or hosting trial is authorized. |
| **Semrush** | [Official affiliate page](https://www.semrush.com/lp/affiliate-program/en/) says content publishers should generally have at least 1,000 monthly unique visitors, or relevant social channels with typically around 1,000 organic followers/likes/views; it evaluates content quality, traffic sources, rankings and publishing frequency. It says unfinished websites and certain forum/browser-extension/mobile/offline promotion methods are not accepted. | StackPilot has no verified public traffic or social audience. Application is premature; no audience is inferred from private preview activity. |

**Publisher decision:** no program is currently accepted; no applications are submitted; no active links exist; earnings are UNKNOWN. The public criteria make Kinsta and Semrush clearly premature at the current private/prelaunch stage. HubSpot's India customer-region eligibility and Cloudways' India payout support remain UNKNOWN. Pipedrive requires a genuine professional channel and communicates geographic exceptions during review. Ahrefs remains a discovery gap. No owner action is required until there is a real public channel and separate owner authorization for an application.

## 6. Zero-cost distribution and measurement boundary

The existing [2026-11-02 CRM exit-evidence / ethical distribution brief](2026-11-02-crm-exit-evidence-and-ethical-distribution.md) already records Google Search Console, Bing Webmaster Tools, LinkedIn and Reddit as research-only channels. This update does not create a second channel plan.

- Google's [people-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) calls for original, substantial utility rather than rewriting other pages to manipulate rankings.
- Google's Search Console is a free measurement path only after owner-approved public release, site verification and privacy review. No sitemap submission or indexing request is authorized now.
- Bing's [URL Submission guidance](https://www.bing.com/webmasters/help/URL-Submission-62f2860b) says submission does not guarantee indexing; its [indexing help](https://www.bing.com/webmasters/help/why-is-my-site-not-in-the-index-2141dfab) also explains that NOINDEX prevents a page from being added to the index. No URL submission or IndexNow action is authorized now.
- Reddit's [Spam policy](https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam) prohibits spam and repetitive unsolicited promotion. No posts, DMs, account creation or community outreach are authorized.
- Any future LinkedIn or community activity must use a real owner-controlled channel, comply with the channel's own rules and receive separate owner approval. No external post was made.

**Current baseline (all UNKNOWN unless stated):** organic visits UNKNOWN; Search Console impressions/clicks/CTR/average position UNKNOWN; keyword rankings UNKNOWN; qualified leads/conversions UNKNOWN; authentic social audience UNKNOWN; accepted affiliate programs 0; submitted applications 0; active affiliate links 0; verified earnings UNKNOWN. Private preview checks, CI requests and anonymous-denial probes are not audience metrics.

After a separately approved public launch, use a dated 28-day Search Console baseline by page/query (impressions, clicks, CTR and average position), and only use authorized first-party analytics for additional engagement. Report measured values and the measurement window; do not set invented traffic or conversion targets.

## 7. Review checklist and next safe actions

- [ ] Human editor reviews each vendor claim separately; all 6 remain unapproved.
- [ ] Recheck the Ahrefs crawl-credit page and Semrush Site Audit limits immediately before publication; retain exact plan/date caveats.
- [ ] Confirm HubSpot India/customer-region and Cloudways India payout eligibility from the program owner before any application.
- [ ] Keep Kinsta and Semrush applications on hold until their published publisher-channel requirements can be genuinely evidenced.
- [ ] Owner/legal review publisher identity, jurisdiction, contact, privacy, Netlify Web Analytics/log retention, affiliate disclosure and commercial-hosting terms.
- [ ] Owner separately authorizes any public visibility, indexing, application, contract, tracking link, production promotion or spending.

**No code or product-route changes in this research commit.** No source intake dates, `research-claims.json`, product verification flags, catalog prices, affiliate candidate records, `affiliateUrl`, `robots.txt`, `_headers`, Netlify account controls or `main` were changed. This is documentation-only, so no new TDD RED/GREEN cycle is claimed. Existing exact-SHA GitHub CI and Netlify status must be rechecked after this documentation commit.

## Method references

- Repository: `AGENTS.md`, `config/operating-policy.json`, `docs/current-operational-state.md`, `docs/editorial-drafts/2026-10-31-comparison-briefs.md`, `docs/editorial-drafts/2026-10-31-vendor-claim-packets.md`, `docs/affiliate-eligibility/2026-10-31-primary-source-review.md`, `docs/publisher-readiness/2026-10-31-owner-application-packet.md`.
- [gstack plan-eng-review](https://github.com/garrytan/gstack/blob/main/plan-eng-review/SKILL.md), [gstack review](https://github.com/garrytan/gstack/blob/main/review/SKILL.md), [gstack QA](https://github.com/garrytan/gstack/blob/main/qa/SKILL.md).
- [Superpowers writing-plans](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md), [test-driven-development](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md), [verification-before-completion](https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md), [requesting-code-review](https://github.com/obra/superpowers/blob/main/skills/requesting-code-review/SKILL.md).

**Release decision:** private research may continue. Public publication, indexing, merge, affiliate applications/activation and spending remain NO-GO without separate owner approval.
