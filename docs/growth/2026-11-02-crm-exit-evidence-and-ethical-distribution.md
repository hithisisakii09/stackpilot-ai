# StackPilot AI — CRM exit evidence and ethical organic distribution
**Research date:** 2026-11-02 (Asia/Kolkata) · **PRIVATE DRAFT / NOT EDITORIALLY APPROVED / NOT PUBLISHED**
**Work queue:** `draft-evidence-review:hubspot` and `draft-evidence-review:pipedrive` (automatic/advisory, priority 30 in exact-head operations artifact); issue #4 historical editorial backlog, issue #6 current unapproved source spot-check, issue #5 release NO-GO.
**Source classification:** Read-only first-party documentation, **not** a vendor account test, purchased plan, verified feature, regional eligibility determination, affiliate approval, traffic proof or independent benchmark.

## Why this adds value rather than another generic comparison
Existing private materials already cover CRM migration checklists, a fictional reconciliation example, a seat-billing preflight, and a TCO guide. This draft is **not another winner/loser review**. It specifies the **exit-evidence package** a small-team buyer should request *before* signing a CRM contract or switching, emphasizing role-scoped exports, linked records, separately exported activities/files and the short life of download links.

**Decision:** Can a buyer prove the *whole required data set* is recoverable under the real account's permissions and plan, rather than merely obtaining a CSV of contacts? If any critical class is not proven, the decision remains **NOT TESTED / NO-GO**, not “Vendor A is worse.”

### Buyer-intent keyword hypotheses (no keyword-volume data)
| Proposed query family | Stage / specific task | Differentiating buyer utility | Evidence to collect after an approved public launch |
| --- | --- | --- | --- |
| `Pipedrive export activities notes files`, `Pipedrive export permission visibility` | Migration/exit diligence | Separate export-inventory checklist with visibility and external-file questions | Verified Search Console impressions/clicks by page/query, if legally configured |
| `HubSpot export associations contacts deals`, `HubSpot export activities separately` | Migration/exit diligence | Object-to-association completeness audit, explicit activity boundary | Same; record actual page-level query evidence, never estimate |
| `CRM export checklist before switching`, `CRM migration exit plan` | Pre-purchase due diligence | Neutral evidence-request template and no-go decision rule | Same; do not infer conversions from clicks |
| `CRM export download expires`, `CRM data portability contract questions` | Urgent exit planning | Retention window and secure handoff checklist | Same; only count actual opt-in interactions if authorized |

These are editorial **intent hypotheses**, not measured rankings, search volume, guaranteed demand or promises of organic acquisition. Do not create thin keyword-variant pages.

## Fresh first-party research — 2026-11-02, vendor statements only

**HubSpot:** [Export your records](https://knowledge.hubspot.com/import-and-export/export-records), vendor page last updated **2026-04-02**. The guide says an Export permission is needed and a record export covers current property values and associations. The default view export includes only selected properties/associations; the article describes an association-column default of up to 1,000 associated IDs and a CSV-specific “all associated records” option. For contact activities (calls, notes), the guide points to other routes such as individual contact data, selected activity reports or the engagements API. Export download links expire after **30 days**. **Do not infer** that a default record export contains full activity history, that the API is available to a particular account, or that a selected subscription/region supports every object.

**Pipedrive:** [Exporting data from Pipedrive](https://support.pipedrive.com/en/article/exporting-data-from-pipedrive), vendor page last updated **2026-09-03**. The guide distinguishes admin-only “Export data” from permissioned list-view exports and says visibility groups/item visibility still limit what a user can export. Activities, notes and files linked to deals/contacts must be exported **separately**. It says files stored in Google Drive are **not** exported during global export; Projects availability is **Premium and higher or the Projects add-on**. Generated exports are available for **28 days**. These are vendor statements, not proof of a specific customer's accessible fields or plan.

**Pipedrive import countercheck:** [Importing data with spreadsheets](https://support.pipedrive.com/en/article/importing-data-into-pipedrive-with-spreadsheets), vendor page last updated **2026-10-19**. It describes CSV/XLS/XLSX import, mandatory fields, mapping, duplicate handling, a maximum of **200,000 rows** and file size **under 50 MB**; it describes an admin-only revert window of **48 hours**. The import-revert feature is **not** a substitute for a verified source backup or a general migration rollback guarantee. Limits and permissions require account-level confirmation before editorial approval.

**Plan/region questions still open:** actual user permissions and visibility groups; subscription edition and legacy models; Projects/custom-object entitlements; API authorization; activity/attachment export formats; EU/other regional processing or export conditions; account-specific file expiry and billing/renewal terms. Do not insert vendor prices, availability verdicts or comparisons into catalog data.

## Unpublished article brief — “Before you leave a CRM: prove the export is complete”
**Proposed article:** Private editorial draft only; no route or public URL is being created.
**Audience:** sales operations lead, small agency owner or operations administrator responsible for a permissioned CRM migration.
**Proposed introduction:** “An exported contacts spreadsheet is evidence of a spreadsheet, not evidence of a recoverable CRM. Before committing to a replacement, ask for an inventory that distinguishes record fields, associations, activities, notes, attachments, role visibility and restore testing.”

### Original reusable exit-evidence request (buyer can copy locally)
Ask the authorized CRM administrator/vendor to complete this **without sharing personal customer records with StackPilot**:

| Evidence class | What to request | Why it can be missing | Status allowed |
| --- | --- | --- | --- |
| Object inventory | Counts by contacts, organizations, deals, leads, projects, custom objects and archived state | Different views, object entitlements, archive filters | PASS / FAIL / NOT TESTED |
| Fields and identifiers | Exported stable IDs, field dictionary, required and custom fields | View-only exports and hidden/unsupported fields | PASS / FAIL / NOT TESTED |
| Relationships | Separate relationship/association counts and sample referential-integrity checks | Linked objects present but connections missing or truncated | PASS / FAIL / NOT TESTED |
| Activities and notes | Separate permitted export with date range and linked-object keys | Activity history may not be part of a record export | PASS / FAIL / NOT TESTED |
| Attachments/external files | Inventory, provenance, authorized downloadable bytes, checksum strategy | External storage and attachment paths may not export | PASS / FAIL / NOT TESTED |
| Permissions | Actual admin and role-scoped export capabilities, visibility exceptions | “Can export” is not “can see all records” | PASS / FAIL / NOT TESTED |
| Delivery window | Generated-file expiry, encrypted storage, access revocation and destruction plan | Download links are temporary; retention may be contractual | PASS / FAIL / NOT TESTED |
| Destination validation | Re-import in an expressly authorized environment; match object counts, keys and relationships | Upload success can conceal missing relationships | PASS / FAIL / NOT TESTED |
| Rollback authority | Named internal approver, independent backup and cutover decision | Import undo may be time-limited or not restore source state | PASS / FAIL / NOT TESTED |

**NO-GO rule:** any critical evidence class marked FAIL or NOT TESTED blocks a claim that migration/exit is proven. Buyer defines materiality and approved tolerance **before** the test. This is a decision framework, not a performed migration.

**Editorial structure:** (1) Export scope is a permission question, (2) inventory objects/links/activities/files separately, (3) retain source and destination evidence without sharing customer data, (4) evaluate time windows and re-import/rollback, (5) capture the true migration labor and seats/add-ons in user-entered TCO, (6) checklist download or printable local copy only after security review.

**Internal links for a future owner-approved release only:** `/guides/crm-migration-checklist/`, `/tools/requirements-checklist/`, `/tools/crm-seat-audit/`, `/tools/software-cost-calculator/`, `/guides/saas-total-cost-of-ownership/`. Do not change current routes or public metadata in this research phase.

**Reviewer acceptance:** source URLs and last-updated dates checked; no assertion of hands-on vendor testing; exact plan/role/region caveats; correct object-vs-activity distinction; no live customer files; legal/editorial reviewer signoff; private hosted-UAT evidence; separate owner public-release approval. All are **pending**, not silently checked.

## Zero-cost distribution feasibility — research only, no posts or accounts

| Channel | Verified platform guidance / opportunity | Allowed **now** | Future gate and truthful measurement |
| --- | --- | --- | --- |
| Google organic search / Search Console | [Google people-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) emphasizes original utility and evidence over scaled thin rewrites. [Search Console + Analytics guide](https://developers.google.com/search/docs/monitor-debug/google-analytics-search-console) defines genuine search impressions, clicks and queries. | Draft original content, proofread, source-check and inspect private internal links. **No sitemap/indexing submission.** | Owner authorizes public site, actual Search Console ownership and privacy review. Only then measure real query/page impressions and clicks; no ranking forecast. |
| Bing organic / Webmaster Tools | [Bing URL Submission](https://www.bing.com/webmasters/help/URL-Submission-62f2860b) says submission does **not guarantee indexing**; [sitemap guidance](https://www.bing.com/webmasters/help/sitemaps-3b5cf6ed) describes discovery. | Read docs only; **no URL submission or IndexNow activation** while private/noindex. | Public-launch and owner authorization, verified site and real indexing evidence. |
| LinkedIn professional education | [LinkedIn article visibility](https://www.linkedin.com/help/linkedin/answer/a517863/visibility-of-your-articles) describes professional relevance and warns that product/service advertisements are not appropriate as articles; [publishing guidelines](https://www.linkedin.com/help/linkedin/answer/a519782) require original/licensed material. | Draft a standalone *educational* CRM export checklist without vendor endorsements or calls to action. **No posting or account creation.** | Owner confirms a genuine, permissioned professional channel, final disclosure, no automated unsolicited outreach; record real post URL/engagement if later authorized. |
| Reddit communities | [Reddit Spam policy](https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam) forbids mass repetitive or unsolicited promotion; [community guidance](https://support.reddithelp.com/hc/en-us/articles/28012014962580-How-do-I-keep-spam-out-of-my-community) notes that local rules can prohibit promotional links. | Read community rules only. **No bot posting, cross-post campaigns, DMs, account creation or link drops.** | Any future participation is manual, relevant and rule-compliant, with explicit owner approval; never claim a guaranteed referral channel. |

**No public-channel proof today:** StackPilot has no verified indexed pages, public audience, owned social distribution channel, authentic post history or affiliate acceptance. A private preview is **not** audience evidence. No content is to be promoted while Netlify remains Private/Locked.

### Publisher-program fit, not signup permission
[Pipedrive's official affiliate page](https://www.pipedrive.com/en/affiliate-partnership) says applicants need a relevant professional website **or** an appropriate professional social channel; it says geographic exceptions are assessed during review. A protected unpublished preview is not proven to qualify. [HubSpot's official affiliate overview](https://www.hubspot.com/partners/affiliates) describes content publishers and SaaS reviewers as potential fit, with acceptance after application review; no acceptance is established here. Do not infer partner eligibility from a draft, submit an application, accept a contract, create a tracking URL or quote commission projections. [Ahrefs' own 2023 article](https://ahrefs.com/blog/ahrefs-affiliate-program/) said its former program was discontinued **in 2023**; current 2026 program availability remains **UNCONFIRMED**, not “definitely no program.”

## Measurement and operating decision
**Baseline as of this research:** real organic visits **UNKNOWN**; search impressions/clicks **UNKNOWN**; keyword rankings **UNKNOWN**; qualified leads/conversions **UNKNOWN**; accepted affiliate programs **0**; active affiliate links **0**; verified earnings **UNKNOWN**; six vendor claims editorially approved **0/6**. **Do not substitute hypothetical examples or Netlify private-preview test hits for public audience.**

**Research progress indicators (not traffic promises):** count of original briefs with an explicit buyer task; official URLs directly revisited with vendor-reported update dates; number of unresolved plan/role/region caveats; number of checklists reviewed by a real editor; actual authenticated hosted-UAT pass count. All currently require a real reviewer before becoming launch evidence.

**Next automatic work:** retain this draft as a source review lead, do not re-open all six claims redundantly (issue #6 already spot-checked them); recheck only changed primary documentation and resolve real factual conflicts. **Next human-only gates:** owner validates editorial statements and publisher identity/channel, Netlify billing and Private/Locked state, then separately decides any public launch, indexing or affiliate application. No autonomous gate is checked by this document.

**Hard holds:** `config/operating-policy.json` monthly and delegated spending **₹0**, Netlify production and previews **PRIVATE**, auto-publishing **LOCKED** (owner's historical screenshots; live account controls not independently verified), `main` unchanged, draft PR #1 unmerged, `robots.txt` and `noindex` intact, all `affiliateUrl:null`, no publishing, external posting, signups, paid tools or tracked links.

**Method:** read AGENTS.md and current operational state; use gstack [engineering review/QA](https://github.com/garrytan/gstack/blob/main/docs/skills.md) and Superpowers [verification-before-completion](https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md) principles. This is **documentation-only source research**, not code behavior: no TDD RED/GREEN claim, no remote-host test or account verification. Exact-SHA CI and provider status must be rechecked after any branch commit.
