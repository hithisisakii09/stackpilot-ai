# SaaS Requirements Evidence Checklist — Implementation Plan

> **For agentic workers:** Documentation-only editorial preparation. Do not create a public route or change runtime behavior. Any later code work requires a separate owner-approved scope and test-first plan.

**Goal:** Prepare one source-grounded, unpublished buyer guide that helps small teams turn SaaS requirements into verifiable evidence before a vendor demo or purchase.

**Architecture:** Add a private Markdown research brief and a matching Superpowers plan only. Reuse the existing requirements worksheet and the existing TCO, seat, renewal, SLA, usage-meter and CRM-exit guides; do not add a new route, duplicate an existing article or change any application code.

**Tech Stack:** Markdown documentation only; existing Astro/Node application remains untouched.  
**Spec:** `docs/growth/2026-11-14-saas-requirements-evidence-checklist.md`

## Global Constraints

- Keep all work on `growth/saas-requirements-evidence-checklist-2026-11-14`; never write to `main`.
- Keep `config/operating-policy.json` unchanged: monthly budget ₹0, delegated spend ₹0, paid services false, commercial hosting false, production launch false, affiliate activation false.
- Preserve `noindex,nofollow`, `robots.txt`, `public/_headers`, Netlify Private/Locked and the production hold.
- Do not create a new public route, sitemap, canonical, structured-data entry or analytics event.
- Do not post, DM, create accounts, submit indexing requests, run paid tools, activate affiliates or contact vendors.
- Keep all six vendor research claims candidate-only; do not modify source-intake dates, reviewer fields, approval flags, catalogue verification or affiliate URLs.
- Do not invent search volume, CPC, rankings, visits, conversions, social audience, commission or revenue.
- Do not include customer data, confidential contracts, secrets or private screenshots.

## Review Focus

- **Evidence laundering:** distinguish NIST/CISA process guidance and vendor-authored documentation from independent product testing or editorial approval.
- **Plan and region ambiguity:** every vendor-specific statement must retain product, edition, plan, role, region, date and billing caveats.
- **Privacy boundary:** the existing worksheet is local/browser-only for selections, while the hosting layer may record page views; do not claim the entire host has no logs.
- **Content overlap:** do not recreate the TCO, seat-billing, renewal/cancellation, SLA, usage-meter or CRM-exit articles.
- **Search integrity:** no invented keyword volume, rankings or public indexing; produce one substantial buyer task guide only.
- **Review-directory boundary:** G2/Capterra review and ranking outputs are discovery signals, not proof of a buyer's exact plan, role, region, contract or migration result. Preserve Capterra's current methodology and geographic qualifiers; do not reproduce proprietary scores.

---

### Task 1: Verify scope and source inventory

**Files:**
- Read: `AGENTS.md`, `config/operating-policy.json`, `docs/current-operational-state.md`
- Read: `docs/editorial-drafts/2026-10-31-comparison-briefs.md`
- Read: `docs/editorial-drafts/2026-10-31-vendor-claim-packets.md`
- Read: existing growth briefs and open PR summaries for duplicate-topic checks.
- Create: `docs/growth/2026-11-14-saas-requirements-evidence-checklist.md`

**Interfaces:**
- Consumes: NIST SP 1305, CISA Secure by Demand, Google Search Central, Spendflo, Discovering SaaS, G2's official Compare Tool documentation and Capterra's current methodology page, plus the existing StackPilot requirements worksheet source.
- Produces: a dated evidence ledger, qualitative keyword hypotheses, competitor-positioning notes and an unpublished article draft.

- [x] Confirm PR #1 is merged and not an active draft.
- [x] Confirm issue #4 is closed; use issue #6 as the current coordination thread.
- [x] Confirm the deterministic backlog artifact reports `automatic: []`; do not execute owner gates.
- [x] Confirm the six vendor records remain candidate-only.
- [x] Check the latest PR #8/#14/#15 Netlify status contexts; do not run provider-dashboard or paid browser automation.
- [x] Record all search/traffic/earnings metrics as UNKNOWN unless an actual source provides them.

### Task 2: Prepare the unpublished editorial brief and article

**Files:**
- Create: `docs/growth/2026-11-14-saas-requirements-evidence-checklist.md`

**Interfaces:**
- Consumes: the current browser-only requirements worksheet and its pure local helper.
- Produces: one original requirements-to-evidence guide with no vendor ranking or approved vendor claims.

- [x] Define one distinct buyer task: convert a wish list into testable requirements and evidence requests.
- [x] Separate must-have, should-have and nice-to-have requirements.
- [x] Add source/plan/edition/role/region/date and test-condition fields.
- [x] Use PASS / FAIL / NOT TESTED / UNKNOWN; do not hide critical gaps in a weighted score.
- [x] Include controlled proof-of-concept and product-security questions with NIST/CISA caveats.
- [x] Reuse links to narrower existing guides rather than repeating them.
- [x] Include zero-cost channel preparation and a post-approval measurement plan.
- [x] Preserve the private/noindex, privacy and ₹0 boundaries.

### Task 3: Editorial and safety review

**Files:**
- Review: `docs/growth/2026-11-14-saas-requirements-evidence-checklist.md`
- Review: `docs/superpowers/plans/2026-11-14-saas-requirements-evidence-checklist.md`

**Interfaces:**
- Produces: an internally consistent, source-attributed, unpublished Markdown draft and handoff.

- [x] Check that every cited source is primary for the claim attributed to it.
- [x] Check that competitor positioning is labeled as self-described and qualitative.
- [x] Check that no traffic, rankings, commissions or conversions are fabricated.
- [x] Check that no vendor claim was moved to approved status.
- [x] Check that no route, analytics, catalogue, affiliate, policy, robots or header file changed.
- [x] Check that the article does not imply NIST/CISA certification or legal advice.
- [x] Check that the content does not duplicate existing buyer guides.
- [ ] Obtain independent human editorial review before any public use.

### Task 4: Verification and handoff

**Files:**
- Verify: branch tree and the two Markdown files.
- Do not modify: `main`, application source, tests, deployment configuration or Netlify settings.

- [x] Confirm only the two intended documentation files are created on the growth branch.
- [ ] Obtain exact-head GitHub Actions Build/tests, Safety/operations, Chromium and Netlify Deploy Preview statuses if a draft PR is separately authorized.
- [ ] Obtain owner approval for any public release, indexing, outreach, account action or affiliate application.

**Verification note:** This deliverable is Markdown-only and changes no executable behavior, route or dependency. The Superpowers TDD skill applies to feature/bugfix/refactor behavior; no RED/GREEN test cycle is claimed for this documentation-only work. Do not claim a new build, browser QA or Deploy Preview passed without a fresh exact-head run. Existing PR #8/#14/#15 status results are historical checks of their own SHAs only.

**Release gate:** Keep this branch unmerged and unpublished. No public preview, production promotion, indexing, affiliate activation or spending.


## 2026-11-15 primary-source refresh

- Rechecked NIST's official publication record for [SP 1326 — Cybersecurity Supply Chain Management: Due Diligence Assessment Quick-Start Guide](https://www.nist.gov/publications/nist-cybersecurity-supply-chain-management-due-diligence-assessment-quick-start-guide), published 2026-07-08.
- Added its five ICT-supplier due-diligence components (FOCI, provenance, resilience, foundational cyber practices and supply-chain tiers) to the article. Kept the scope limitation explicit: ICT suppliers; supplement to SP 800-161 Rev. 1; process guidance, not certification, universal legal mandate or product-specific conclusion.
- Retained NIST SP 1305 as a broader CSF 2.0 reference and CISA Secure by Demand as product-security procurement guidance.
- Rechecked the existing qualitative competitor evidence: Spendflo's vendor-selection checklist is marked updated 2026-10-13; Discovering SaaS's downloadable checklist page is dated 2025-10-29. Their audience, rankings and conversions remain unverified.
- Rechecked Google Search Central people-first guidance and current Bing Webmaster Search Performance documentation. The distribution plan remains conditional on separately approved public release; no sitemap submission, indexing request, account creation or external post occurred.
- gstack upstream reference updated from the obsolete `plan-eng-review` path to current `autoplan`; review and QA references retained. The current upstream gstack review/QA and Superpowers writing-plans/verification-before-completion documents were read for this documentation-only refresh.
- Documentation-only change: no runtime behavior, route, dependencies, data records, tests, analytics, privacy controls, noindex or provider settings changed. No TDD RED/GREEN or test/build pass is claimed.


## 2026-11-16 follow-up — Bing Search Performance history-window discrepancy

**Official sources reviewed:**
- [Bing Webmaster Tools — Search Performance help](https://www.bing.com/webmasters/help/search-performance-c680da36): its currently indexed text describes up to six months of performance history and reports clicks, impressions, CTR, average position and query/page details; direct public retrieval currently returns a JavaScript-only shell.
- [Bing Webmaster Tools — 16-month history announcement](https://blogs.bing.com/webmaster/2024/10/Bing-Webmaster-Tools-Extends-Search-Performance-Data-to-16-Months/), published 2024-10-16, says Search Performance data was extended to 16 months.

The official public statements differ. The article now records the conflict and treats the actual account-selectable history window as **UNKNOWN** until an owner-authorized property view is available. Do not create an account, verify a property or submit URLs in this run.

**Baseline refresh:** the exact-head PR #13 operations artifact dated 2026-11-16 reports `automatic: []`, 0 sources needing refresh, 6 prepared evidence packets, 6 pending editorial reviews, 0 approved claims, 4 owner gates, 5 affiliate candidates, 0 applications, 0 acceptances, 0 tracking links, and null actual traffic/revenue. Keep all site-specific traffic, rankings, impressions, clicks, conversions and worksheet usage **UNKNOWN**.

**Scope:** update only this unpublished buyer guide and its plan. No account, public post, URL submission, indexing, analytics, code, route, tracking, privacy, noindex, source-intake date, reviewer or approval status changed. PR #16 remains draft/unmerged.


## 2026-11-21 review-directory competitor refresh — documentation-only

**Sources directly reviewed:**
- [G2 — Researching and customizing software recommendations](https://documentation.g2.com/help/docs/researching-and-customizing-software-recommendations-on-g2), published 2025-09-18. G2 describes requirement-led suggestions through its Assistant and a Compare Tool that compares up to four products using user reviews.
- [Capterra — Proprietary Data & Research Methodologies](https://www.capterra.com/resources/proprietary-data-research/), updated 2026-11-20. Its current November 2026 Shortlist describes ratings and popularity dimensions; popularity includes search demand/SERP visibility, review activity, page authority and product-page traffic. Current inclusion criteria include at least 20 recent unique reviews, publicly evidenced functionality and U.S. market presence. The same page distinguishes editorial research from marketplace content and says sponsorship may influence some marketplace placements.

**Editorial decision:** add these as qualitative competitor/alternative evidence only. Review platforms can surface questions and peer experience; they do not establish the availability of a capability in a specific buyer's plan, role, region or contract. StackPilot's potential distinction is a local buyer-entered requirements/evidence workflow with explicit UNKNOWN and NOT TESTED states, not a ratings directory or ranking engine. This is a positioning hypothesis, not a validated competitive advantage.

**Keyword addition:** how to compare software reviews with vendor documentation — medium-priority qualitative intent hypothesis. No search volume, CPC, ranking, impression, click, traffic or conversion data is inferred. Do not create a separate keyword-variant page.

**Baseline refresh:** the exact-head PR #14 operations artifact generated 2026-11-19 UTC / asOf 2026-11-20 reports automatic queue empty, zero sources needing refresh, six prepared evidence packets, six editorial reviews pending, zero approved claims, five affiliate candidates, zero accepted programs and four owner-only gates. The publisher-readiness report shows 11 owner gates outstanding, zero applications/acceptances/tracking links, and null actual traffic/earnings. This is repository readiness data, not audience performance.

**Scope:** only this existing private article brief and its matching plan. No code, route, product data, claim approval, source-intake date, affiliate record, tracking, account, post, indexing, privacy/noindex, Netlify, main, production or budget change. Documentation-only; no TDD RED/GREEN or new CI pass is claimed until the new exact head is checked.