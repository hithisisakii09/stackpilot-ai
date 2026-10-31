# SEO Site Audit scope: synthetic crawl-budget example
**StackPilot AI | private editorial research draft | 2026-10-31**
**UNPUBLISHED. All inputs and calculated outcomes below are fictional; no Ahrefs or Semrush account was accessed.**

## Buyer problem
An SEO team may compare two audit subscriptions based on a single headline "page limit" even when different products distinguish URLs discovered, HTML pages processed, crawl-credit consumption, plan quotas, export rows and additional JavaScript rendering. This exercise teaches how to ask useful questions without inventing a provider benchmark.

## Fictional owned-site inventory
An operator owns an example site consisting of:
| Area | Invented URL count | Notes |
| --- | ---: | --- |
| Canonical product pages | 360 | Indexable HTML |
| Help articles | 140 | Indexable HTML |
| Archived redirects | 55 | Old 301/302 responses |
| Media/assets | 190 | Files rather than HTML |
| Parameter-duplicate URLs | 70 | Deduplication/robots rules need review |
| **Total discovered resources** | **815** | This is NOT automatically 815 billable crawl credits |

500 hypothetical canonical HTML pages exist (360+140). A crawler may request some redirects/assets and skip or deduplicate other URLs. Which requests consume an actual provider's quota depends on its current definitions and settings; do not infer quotas or use 500 as a real billing figure.

## Fictional scheduling exercise
A team wants a weekly audit of 500 canonical HTML pages for four weeks. Its **hypothetical** baseline is 2,000 HTML-page fetch events before rechecks. This is `500 × 4`, **not** a claim of Ahrefs crawl-credit spending or Semrush page entitlement. Extra discovered URLs, JavaScript render work, failures, redirects and provider-specific accounting can change actual usage.

| Control | Buyer question | State before authorized testing |
| --- | --- | --- |
| Crawl scope | Can the selected plan restrict audits to desired host/subfolder? | UNVERIFIED |
| Project/site verification | Is proof of domain control required and does it affect allowances? | UNVERIFIED |
| Per-audit cap | How many pages may be audited in one run? | UNVERIFIED |
| Monthly consumption | What units count in monthly credits and when do they reset? | UNVERIFIED |
| JS rendering | Is it permitted, and how does it affect limits/cost? | UNVERIFIED |
| Export | Are rows, filters, reports, users or API calls separately restricted? | UNVERIFIED |
| Safety | Can the crawl respect load, robots rules and private routes? | NOT TESTED |

## Fail-closed example
If a buyer's essential requirement is to analyze all 500 canonical pages in one weekly run, and the plan-specific audit cap has not been verified, the decision is **NOT READY / NO-GO**, not "supported." If a permitted test later proves a cap below the buyer's required size, record FAIL and discuss shrinking the scope or selecting a different verified plan; do not invent that either vendor wins.

## Controlled verification design — NOT EXECUTED
1. Confirm legal ownership and crawl permission of the test property.
2. Document exact vendor plan, date, country, project ownership status and allowance units.
3. Set the same 500 example URLs, canonical rules, user agent, JS rendering choice and resource constraints where both tools permit.
4. Record the actual processed-page count, skipped URLs, redirect classes, asset handling and quota/credit change separately.
5. Validate each reported issue with a reproducible example rather than counting findings as equal quality.
6. Re-run for schedule and export limits; save redacted evidence, not credentials or private URLs.
7. Mark any unperformed steps **NOT TESTED**.

## Source research leads
- Ahrefs crawl-credit rules: https://help.ahrefs.com/en/articles/3119402-how-are-crawl-credits-in-site-audit-spent
- Ahrefs row/export limits: https://help.ahrefs.com/en/articles/14333008-about-rows-export-rows-and-user-limits
- Semrush audit scope: https://www.semrush.com/kb/539-configuring-site-audit
- Semrush Site Audit overview: https://www.semrush.com/kb/31-site-audit

These links represent vendor documentation only; source reachability is not independent product verification.

## Human reviewer checklist — pending
- [ ] Check arithmetic, fictional labeling and quota-type distinctions
- [ ] Reopen current documentation and note specific product/plan/region scope
- [ ] Remove or qualify unsupported generalizations
- [ ] Verify privacy, crawler permissions and customer data treatment
- [ ] Record genuine reviewer signoff and separately obtain publication authorization

**Restrictions:** No real site crawling, external account activation, paid trials, tracking links, public route, indexing or affiliate action. Keep draft PR unmerged, Netlify private/locked and spending ₹0.
