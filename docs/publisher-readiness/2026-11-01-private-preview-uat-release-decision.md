# StackPilot AI — Private preview UAT and owner release-decision packet

**Prepared:** 2026-11-01 (Asia/Kolkata) · **PRIVATE / NO-GO / NOT AN APPROVAL**  
**Baseline:** draft PR #1 head `5976f4fe714f4d8d2a86f6791917297e2f131246` on `feature/phase-1-1-recommendation-engine`. Do not apply this dated CI snapshot to a newer SHA.

## 1. Verified CI/deployment evidence

| Gate | Evidence at exact head | Result |
| --- | --- | --- |
| Unit/build/data validation | https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41229000402 | SUCCESS; 231 tests passed, 0 failed |
| Safety and operations | https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41229000503 | SUCCESS |
| Chromium desktop/mobile/axe | https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41229000599 | SUCCESS |
| Browser screenshots (expires Nov 7, 2026 UTC) | https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41229000599/artifacts/13053257202 | Evidence retained, not remote authenticated UAT |
| Private preview package (expires Nov 3, 2026 UTC) | https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41229000503/artifacts/13052941776 | Available short term |
| Netlify PR deployment | https://deploy-preview-1--inspiring-chaja-cfb85f.netlify.app | GitHub status success; **not an auth or accessibility proof** |
| Vercel | No new Vercel status on exact SHA; old project owner-deleted | Do not recreate or upgrade |

The web reader could not access the Netlify preview in this environment. **Do not record 401, successful anonymous denial, private access enforcement, or authenticated browser acceptance on this basis.** The owner previously reported successful authenticated/Incognito checks on an earlier preview; repeat against this SHA.

## 2. Authenticated protected-preview UAT — manual checklist (not yet executed)

Use a normal browser authenticated to Netlify only through the vendor's legitimate login. **Do not paste passwords, session cookies, tokens, personal screenshots or customer data into GitHub or this chat.** Confirm the exact PR SHA shown for the preview is the baseline, otherwise re-run CI/status inspection and label this evidence as historic.

| Test | Steps and expected result | Result to record |
| --- | --- | --- |
| Gated preview | Open the preview homepage while signed in. Independently open the same URL in a fresh private/incognito session **without** logging in. | Authenticated page works; unauthenticated session denied or login-gated (capture only URL/status, redact account details). |
| Comparison pages | Visit `/compare/`, `/research/`, `/methodology/` and `/privacy/`. | Pages load without runtime error or broken links. |
| Six candidate rows | On `/compare/`, inspect the CRM, SEO and Hosting tables without interacting with JavaScript controls. | HubSpot/Pipedrive, Ahrefs/Semrush, Cloudways/Kinsta each alphabetical; all descriptions marked unverified, team/pricing unverified, review pending. |
| Browser-only comparisons | In `/compare/`, compare each pair, then select the same vendor in both fields. | Six neutral questions preview, no winner; invalid duplicate shows an error and clears export. |
| CSV export and stale-state | Download `stackpilot-vendor-questions-crm.csv`; change first vendor/category after generating results, repeat for SEO and Hosting. | Six questions + header; both vendor answers `Unverified`, blank evidence field; download disabled after changing selections until comparison is regenerated. |
| Mobile and keyboard | Open 390px viewport or a phone; tab to controls and submit, scroll long tables horizontally by keyboard where possible. | Content readable, controls operable, focus visible, no horizontal page overflow. |
| Robots and response protection | In authenticated DevTools network response for representative paths inspect headers. | `X-Robots-Tag: noindex, nofollow, noarchive`, and expected security headers. Note that noindex does **not** protect access. |
| Netlify configuration | In official provider UI inspect preview & production visitor visibility and deploy locks. | Both Private, auto-publishing Locked; verify Free entitlement, credit/billing alerts, and no surprise charges. |
| Analytics/privacy | If Netlify Analytics is enabled, verify provider plan entitlement, server/CDN log collection, disclosure suitability and retention. | Report **human privacy/legal review needed** until actually approved; do not declare tracking absent merely because browser code sends no requests. |

**Evidence template:** `SHA | test name | PASS / FAIL / BLOCKED | date/time + timezone | browser + width | short non-sensitive note | screenshot URL if safe`. Do not attach private auth session data. Keep any authenticated screenshots in an access-controlled location.

## 3. Editorial/research gates (all still unresolved)

Six source-backed research *candidates* exist: HubSpot (record export), Pipedrive (spreadsheet import), Ahrefs (Site Audit credits), Semrush (crawl scope), Kinsta (hosting limits/overages), Cloudways (backup product/billing differences). **Zero of six has authenticated human editorial approval.** Vendor publication does not equal independently tested functionality.

For each: authenticated reviewer, explicit ACCEPT WITH ATTRIBUTION / REVISE / HOLD / REJECT, validated canonical URL, date checked, edition/plan/region/currency/taxes, caveats and evidence location. Never change `approved:false`, `verified:false` or `affiliateUrl:null` from an agent-written note alone.

## 4. Owner-only release gates — separate consent, not a combined checkbox

| Gate | Current observed state | Who can clear |
| --- | --- | --- |
| Approved public brand, publisher identity, public contact address | ToolChoice Lab is a working brand; dedicated email setup owner-reported; public posting/name clearance not authorized | Owner, appropriate legal/brand review |
| Publisher legal/privacy/analytics/affiliate policies | Draft text; Netlify Analytics reported enabled; no final approval | Owner with legal/privacy review |
| Commercial host billing and public use eligibility | Netlify Free is the planned candidate; live account entitlement and usage not independently checked here | Owner/provider dashboard |
| Authenticated current-SHA remote UAT and anonymous denial | Not yet verified for latest SHA | Owner with access or authorized authenticated tester |
| Product-claim editorial signoff | 0/6 approved; no third-party independent product tests proven | Authenticated human editor |
| Affiliate acceptance, tax/KYC/contracts, tracking and payment | No approval; contracts and real data absent | Owner + affiliate networks |
| Public-domain/DNS, branch merge, production unlock, indexing and public launch | Not authorized; main unchanged | **Separate explicit owner approval** |
| Paid services/marketing | ₹0/month, ₹0 delegated spending; no purchases permitted | Separate explicit owner approval to raise budget |

Do not interpret closed historical GitHub issues or checked planning tasks as authorization. No revenue/traffic/click/conversion assertions without first-party actual evidence.

## 5. Operating instructions to autonomous agents

Continue safe read-only source freshness monitoring, independent buyer-tools engineering, draft research and CI repair on the feature branch. Respect the existing daily operator, hourly incident watch and growth agent; do not duplicate automations. Check exact-head CI before new development. On CI red, open/track issue and fix safely; on unknown preview accessibility, report BLOCKED rather than bypassing protection. The PR must remain draft and unmerged; Netlify remains private/locked/noindex; deleted Vercel project must not be recreated; affiliates remain off; spend is ₹0.

**Release verdict: NO-GO.** A human may record one gate as satisfied without satisfying any other gate. The packet documents work, not public publication permission.
