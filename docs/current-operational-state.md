# StackPilot AI — Current operational state and safe next actions


> **PHASE 2 OWNER ACCEPTANCE UPDATE (2026-11-04):**
> 1. GitHub draft PR #8 (`feature/phase-2-product-readiness`) passed all CI checks at head SHA `dd80aee1c090e7cda8de29b82eb24c8d55056a61`.
> 2. **Owner Acceptance (self-reported, 2026-11-04 ~23:03–23:05 IST):** The authorized repository owner self-reported having logged into private Netlify Deploy Preview 8 at implementation SHA `dd80aee` and confirmed all 12 manual acceptance checks passed. Evidence is owner text in chat; no independent screenshot artifact or cryptographic session token is on record. The docs-update commit `289d1b6` was not separately UAT'd by the owner.
>    - PASS — HTTP 401 canary — private preview blocks anonymous access
>    - PASS — `/preview-build/` shows PR #8 and SHA `dd80aee`
>    - PASS — Homepage and discovery flow
>    - PASS — Recommendation advisor and explainability
>    - PASS — All three pairwise comparison pages (`hubspot-vs-pipedrive`, `semrush-vs-ahrefs`, `kinsta-vs-cloudways`)
>    - PASS — Mobile comparison table scrolling
>    - PASS — CSV worksheet download and formula neutralization
>    - PASS — All six software profiles with cross-links
>    - PASS — Internal navigation and cross-links
>    - PASS — Schema.org JSON-LD structured data output
>    - PASS — Mobile responsiveness
>    - PASS — Live security response headers
> 3. **Verdict on PR #8:** **READY FOR OWNER MERGE APPROVAL**. Do not merge without explicit owner authorization. Public commercial release remains a separate NO-GO gate.

> **POST-MERGE & OWNER ACCEPTANCE UPDATE (2026-11-04):**
> 1. GitHub draft PR #1 was merged into `main` by the owner on 2026-11-04 (merge commit `c9b9a1345e99ad97dc84376a20527305d9bb0d7c`).
> 2. Follow-up documentation and preview-identity branch `docs/post-merge-operational-state` (PR #7) was fully verified at commit `f3c87ec56dd1588abf9298c325c12c82fe94e1a4`.
> 3. **Owner Acceptance Completed on 2026-11-04 (PR #7):** The authorized repository owner logged into private Netlify Deploy Preview 7 and confirmed all 8 manual acceptance checks passed:
>    - PASS — Logged into private Netlify preview (HTTP 401 canary confirmed)
>    - PASS — Verified PR #7 and exact commit SHA on `/preview-build/`
>    - PASS — Tested homepage and navigation
>    - PASS — Tested comparison and research pages
>    - PASS — Tested all interactive tools
>    - PASS — Tested all six software profile pages
>    - PASS — Checked mobile layout
>    - PASS — Inspected live security response headers in DevTools
> 4. **Verdict on PR #7:** **MERGED** (owner authorized merge of PR #7 into main on 2026-11-04). PR #1 was previously merged.

**Snapshot date:** 2026-11-04 (Asia/Kolkata). **Type:** dated development handoff, not a live Netlify account-state guarantee or public-release approval. Before consequential actions, fetch the current [merged PR #1](https://github.com/hithisisakii09/stackpilot-ai/pull/1) (now closed), exact head SHA, matching GitHub Actions runs, and Netlify commit status. This snapshot records the last verified application-code and readiness audit checkpoint.

## Last verified application-code and readiness audit checkpoint

**Phase 2 checkpoint — implementation commit `dd80aee1c090e7cda8de29b82eb24c8d55056a61`, docs-update commit `289d1b6d05bc1ead2ee81e424d4d8ae72d45cf85` (current PR #8 HEAD):**

| Source | Evidence | Limit |
| --- | --- | --- |
| GitHub draft PR #8 | Branch `feature/phase-2-product-readiness` open as **Draft PR #8**; current head `289d1b6d05bc1ead2ee81e424d4d8ae72d45cf85`; implementation SHA `dd80aee1c090e7cda8de29b82eb24c8d55056a61`; base `main@1672461bea5fa09e01965c5e8bdd4819852b06fd`. Do not merge without fresh explicit owner authorization. | No PR may merge to `main` without fresh explicit owner authorization |
| GitHub Actions CI on `289d1b6` (docs-update HEAD) | All three CI workflows **SUCCESS** at `289d1b6`: "Validate and build" (run 41880028013), "Browser acceptance (Chromium)" (run 41880027538), "Safety and operations" (run 41880027211) — 28 desktop + 28 mobile + axe scans. Netlify checks: Header rules ✅ SUCCESS, Redirect rules ⚪ NEUTRAL (no rules defined), Pages changed ⚪ NEUTRAL (non-blocking diff). | Exact-SHA CI evidence; does not prove hosted access or vendor claim accuracy |
| GitHub Actions CI on `dd80aee` (implementation SHA) | All three CI workflows **SUCCESS**: "Validate and build" (run 41872545266), "Safety and operations" (run 41872545310), "Browser acceptance (Chromium)" (run 41872545274) — 28 desktop + 28 mobile + axe scans. | Exact-SHA CI evidence |
| Validate/build CI | **SUCCESS** at `289d1b6`; **481/481 tests**, **28 generated HTML routes**, **339 internal links**, `npm audit` 0 vulnerabilities | Exact current counts; Phase 1 historical values (468 tests, 25 routes, 226 links) are separately recorded below |
| Safety/operations CI | **SUCCESS**; private preview package: 28 pages; anonymous CI canary returned HTTP 401 on two fixed routes | Two fixed-path probes are not exhaustive anonymous-access verification |
| Chromium browser CI | **SUCCESS**; 28/28 desktop and 28/28 mobile accessibility sweeps; axe WCAG 2.1 A/AA checks passed; all three pairwise comparison pages, all six profiles, all buyer tools | Headless Chromium in Linux container against built assets, not authenticated physical device testing of remote preview |
| Netlify Deploy Preview 8 | Active for draft PR #8 at `deploy-preview-8--inspiring-chaja-cfb85f.netlify.app`. Anonymous CI canary: HTTP 401 ✅. | Provider build status does not prove authenticated route UAT, live headers, or all-route anonymous-denial check. |
| Owner Phase 2 manual acceptance | Owner self-reported **all 12 manual acceptance checks PASSED** on Deploy Preview 8 at `dd80aee` (~2026-11-04T23:03 IST). Evidence is owner self-report in chat; no screenshot artifact, cryptographic token, or independent audit is on record. The documentation update commit `289d1b6` was pushed **after** the owner acceptance session and has not received a separate manual owner UAT. Outstanding: owner should confirm `289d1b6` deploy preview identity (`/preview-build/` page) if a re-verification pass is required before merge. | Owner self-report accepted for now; treat as pending independent corroboration until owner confirms |

**Phase 1 checkpoint (post-merge `main` at `c9b9a1345e99ad97dc84376a20527305d9bb0d7c`):**

| Source | Evidence at verified commit `c9b9a1345e99ad97dc84376a20527305d9bb0d7c` (post-merge `main`) | Limit |
| --- | --- | --- |
| GitHub draft PR #1 | Branch `feature/phase-1-1-recommendation-engine` **merged** into `main` on 2026-11-04 by owner authorization; merge commit `c9b9a1345e99ad97dc84376a20527305d9bb0d7c`. Historical provenance: draft PR #1 was open and **unmerged** at `c6e72f294f55b6a80863d7c5f396333d3a44171d`; `main` previously at `c8fadcbf799e45ec41db2278aa7f84bb48c99895`. | Historical baseline |
| GitHub Actions CI on `main` | **Owner verified 2026-11-04:** all CI jobs green for merge commit `c9b9a1345e99ad97dc84376a20527305d9bb0d7c` (build run `41806714878`). Chromium browser-qa via `workflow_dispatch` on `main` (run `41843736149`) — **SUCCESS** (25 desktop + 25 mobile + axe). | Remote protected preview UAT separately reported. |
| Validate/build CI | **SUCCESS**; **468/468 tests**, 25 generated HTML routes, 226 internal links, `npm audit` 0 vulnerabilities | Phase 1 baseline |
| Safety/operations CI | **SUCCESS**; private preview package: 25 pages / 40 files / 257,462 bytes; anonymous CI canary returned HTTP 401 | Two fixed-path probes only |
| Chromium browser CI | **SUCCESS**; 25/25 desktop and 25/25 mobile accessibility sweeps; axe WCAG 2.1 A/AA checks passed | Headless Chromium only |
| Netlify Deploy Preview | Historical PR #1 preview. Anonymous probe: HTTP 401 ✅. **Owner dashboard verified 2026-11-04:** Auto Publishing **Locked** — production did **not** auto-promote after merge; production still serves `c8fadcbf799e45ec41db2278aa7f84bb48c99895`. Site visibility confirmed **Private**. | Provider build status does not prove authenticated route UAT |
| Owner-observed build identity | On 2026-11-02, owner screenshot showed the authenticated [preview identity page](https://deploy-preview-1--inspiring-chaja-cfb85f.netlify.app/preview-build/) displaying full SHA `ff88a68691e5cf8705250cca5245f03a7fa06957` and `Expected preview PR: 1`, matching PR #1 at that time; fresh observation required for later commits | Visual match of build-time metadata only—not cryptographic provenance, all-served-assets proof, remote route QA, security verification, or release approval |
| Netlify billing snapshot | Owner screenshots showed Free at **$0.00**, 300 monthly credits with **285 remaining**, and Auto Publishing Locked; owner reported no charges | Point-in-time owner observation, not a future billing guarantee or commercial/legal approval |

**Milestone 2 Frontend, a11y & Security Posture:** Complete. Implemented WCAG 2.1 AA bypass blocks (skip-link navigation), semantic <nav> landmarks across all page templates, keyboard-accessible horizontal table scrollers, CWE-1236 CSV spreadsheet formula neutralization across all decision tools, and expanded test suite (446/446 green).

**Phase 3 Quality, Security, Performance & Trust Readiness:** Complete. Audit report documented in `docs/publisher-readiness/2026-11-03-phase-3-quality-security-and-trust-audit.md`. Supporting operational artifacts created: `docs/privacy-inventory-and-data-flows.md`, `docs/mobile-manual-testing-guide.md`, and `docs/security-monitoring-and-incident-playbook.md`.

**Phase 4 Launch Preparation:** Architectural and risk planning documents prepared in `docs/phase-4-launch-preparation/` covering brand/domain clearance, public release checklist, indexing/SEO plan, zero-cost hosting comparison, rollback playbook, and launch risk register. These represent readiness frameworks only—**not an authorization to launch**.

**Phase 2 Product Readiness (PR #8):** Complete. Added dedicated pairwise comparison routing (3 new comparison pages), recommendation explainability engine (`src/lib/recommend-explainability.mjs`), pairwise comparison matrix with CWE-1236 CSV formula protection (`src/lib/comparison-pairs.mjs`), Schema.org JSON-LD structured data builders (`src/lib/structured-data.mjs`), cross-linking from software profiles to comparisons and decision tools, and 13 new tests (481/481 total). Implementation SHA `dd80aee1c090e7cda8de29b82eb24c8d55056a61`. Docs-update SHA `289d1b6d05bc1ead2ee81e424d4d8ae72d45cf85` (current PR #8 HEAD). Owner self-reported 12 manual acceptance checks PASSED on Deploy Preview 8 at implementation SHA `dd80aee` (~2026-11-04T23:03 IST).

**Analytics/privacy note:** Netlify Web Analytics is enabled at the hosting layer. The prototype privacy page distinguishes the absence of client-side analytics scripts/tracking cookies from Netlify's aggregated CDN-log analytics and possible provider network/access logs. Hosting analytics, log retention, and final privacy/legal disclosures still require owner review.

**Editorial status:** all six vendor research-claim records remain candidate-only and unapproved (**0/6 approved**). No affiliate links, partner acceptance, public indexing, or public launch is authorized.

## Current product scope

- Private Astro static MVP with 6 neutral software research candidates (CRM, SEO, hosting). All product feature/price/fit claims **remain unapproved and unverified**; affiliate URLs null and no paid ranking or affiliate activation.
- At the Phase 2 verified checkpoint: **28 generated HTML pages**, including homepage category explorer, pairwise comparison pages (`hubspot-vs-pipedrive`, `semrush-vs-ahrefs`, `kinsta-vs-cloudways`), vendor profiles with cross-links, research/methodology, disclosure/privacy, CRM and hosting migration guides, SaaS cost guide, software requirements worksheet, CRM paid-seat audit, SEO audit-scope planner, software cost calculator, hosting cutover-gate assessor, backup RTO/RPO planner and hosting hidden-cost worksheet.
- At the Phase 1 verified checkpoint: **25 generated HTML pages**.
- Pure client-side tools use user-supplied data, strict input constraints and offline CSV/report exports. Calculators are examples, **not** real vendor quotes. Static link-integrity checks scanned **339 rendered internal links** (Phase 2). A successful local scan is not proof of hosted navigation.
- Automated `stackpilot-private-preview-package` GitHub Actions artifact includes a SHA-bound build manifest, UAT routes, and human-only CSV checklist, retained for **3 days**. Every route begins **UNTESTED**; hosted authentication, security headers, provider billing and owner reviews begin **UNVERIFIED**.

## Working platform and unchangeable current authorization boundary

- **Source:** private GitHub `hithisisakii09/stackpilot-ai`. `main` is now at merged commit `1672461bea5fa09e01965c5e8bdd4819852b06fd` (post-PR #7 merge). Active Phase 2 development is on `feature/phase-2-product-readiness` as a draft PR #8; do not merge without explicit owner authorization.
- **Primary private preview (Phase 2):** Netlify Deploy Preview [`deploy-preview-8--inspiring-chaja-cfb85f.netlify.app`](https://deploy-preview-8--inspiring-chaja-cfb85f.netlify.app/) (active for draft PR #8). Anonymous probe returned HTTP 401 ✅. Do not assume anonymous access is blocked until independently verified; **noindex is not authentication**.
- **Historical previews:** [`deploy-preview-7`](https://deploy-preview-7--inspiring-chaja-cfb85f.netlify.app/) (PR #7, now merged), [`deploy-preview-1`](https://deploy-preview-1--inspiring-chaja-cfb85f.netlify.app/) (PR #1, merged) remain historical.
- **Production:** **Owner dashboard verified 2026-11-04 — Auto Publishing is Locked; production did NOT auto-promote after merge and still serves `main@c8fadcbf799e45ec41db2278aa7f84bb48c99895`**. Anonymous probe of `inspiring-chaja-cfb85f.netlify.app` returned HTTP 401 ✅. Site visibility confirmed **Private** ✅. **Do not unlock, promote, publicize, add public DNS, remove noindex, or change visibility** without separate explicit owner authorization.
- **Vercel:** owner **deleted the former Vercel project** and instructed us to stop deploying there. Do not recreate, trigger a Vercel deployment or infer current production outage from historical Vercel quota reports.
- **Operating limits:** `config/operating-policy.json` fixes monthly budget **₹0**, delegated spend **₹0**, `hostingCandidate: netlify-free`, and **false** for `commercialHostingApproved`, `productionLaunchApproved`, `affiliateActivationApproved`, `paidServicesApproved`. No payments, vendor applications, paid services, contracts, legal assent or banking/KYC work in an autonomous cycle. Netlify Web Analytics is enabled at the hosting layer; the final privacy/retention review is still open.
- **Working publisher name:** ToolChoice Lab, pending trademark/identity/legal review. Owner-provided contact information is **not by itself permission** to publish it or assert business verification.

## Outstanding release blockers (all remain NO-GO)

1. **PR #8 not yet merged:** draft PR #8 awaits explicit owner merge authorization. Owner acceptance passed; CI all green.
2. **Authenticated actual-host UAT (ongoing):** Owner has completed Phase 2 manual acceptance on Deploy Preview 8. Post-merge `main` UAT will be required for any production unlock.
3. **Anonymous access denial:** independently verify the current private preview refuses unauthenticated content. A login redirect alone must not be reported as exhaustive access-control proof. Never request passwords, cookies, private headers or tokens in chat/GitHub.
4. **Live HTTP security/privacy:** compare real hosted security headers and noindex response with the local `_headers`, verify analytics behavior and provider-side access controls. Source files do not prove network responses.
5. **Netlify account/terms:** authorized owner checks current Private/Locked settings, which commit production now serves (auto-promoted or still `c8fadcb`?), commercial use and plan entitlement, billing, usage/credit limits, possible stored payment methods and provider-side analytics controls. No upgrades permitted.
6. **Editorial, publisher and legal:** original buyer guides and all 6 vendor candidate records still require real evidence review and appropriate legal/privacy/disclosure/brand verification. Affiliate program applications, approval, tracking, real traffic and earnings remain unverified or absent. There is no revenue claim. No affiliate activation is authorized.
7. **Separate publication authorization:** only the owner may approve production/public visibility, indexing, merge, domain, contracts, and partner activation after evidence. A code commit, CI green, autonomous-agent report, closed issue, or historical screenshot cannot provide that authority.

## Next safe autonomous actions

1. **Refresh source facts first:** inspect merged PR #1, current `main` SHA `1672461bea5fa09e01965c5e8bdd4819852b06fd`, exact-head Actions runs and Netlify commit status; inspect `AGENTS.md`, this handoff, `config/operating-policy.json`, and release gates. Do not report a stale checkout as current.
2. **Keep preparing private buyer value:** original research, synthetic sample data, accessibility, validation, local browser QA and non-secret owner checklists. Do not mark vendor claims verified, manufacture visitors or use public SEO indexing before approval.
3. **Prefer material blockers over redundant tools:** fix failing tests/security/accessibility; maintain exact-SHA human UAT packet; do not keep adding calculators just to increase page count.
4. **Follow test-first discipline** on new engineering behavior (Superpowers RED→GREEN, gstack plan/review/QA). Do not install external scripts without consent.
5. **Keep owner tasks bounded:** a reviewer can supply *non-sensitive conclusions* (e.g. route passed/failed, hosted status), but real credentials, KYC, payment methods, contracts and legal documents remain outside GitHub/chat.
6. **Do not duplicate existing daily autonomous operator, growth agent and hourly incident watch.** They may prepare research/advisories under the same NO-GO policy; they may not autonomously authorize production or spend.

## References

- [Merged PR #1](https://github.com/hithisisakii09/stackpilot-ai/pull/1) (merged 2026-11-04; was: GitHub draft PR #1)
- [Merged PR #7](https://github.com/hithisisakii09/stackpilot-ai/pull/7) (documentation state reconciliation; merged 2026-11-04)
- [Draft PR #8](https://github.com/hithisisakii09/stackpilot-ai/pull/8) (Phase 2 product readiness; awaits owner merge authorization)
- [Post-merge verification report](post-merge-verification-report.md)
- [Phase 2 product readiness report](phase-2-product-readiness/2026-11-04-phase-2-autonomous-product-readiness-report.md)
- [Phase 3 Quality, Security, and Trust Audit](publisher-readiness/2026-11-03-phase-3-quality-security-and-trust-audit.md)

- [Privacy inventory and data flows](privacy-inventory-and-data-flows.md)
- [Mobile manual testing guide](mobile-manual-testing-guide.md)
- [Security monitoring and incident playbook](security-monitoring-and-incident-playbook.md)
- [Phase 4 brand and domain clearance](phase-4-launch-preparation/brand-and-domain-clearance.md)
- [Phase 4 public release checklist](phase-4-launch-preparation/public-release-checklist.md)
- [Phase 4 indexing and SEO launch plan](phase-4-launch-preparation/indexing-and-seo-launch-plan.md)
- [Phase 4 hosting cost comparison](phase-4-launch-preparation/hosting-cost-comparison.md)
- [Phase 4 rollback and incident playbook](phase-4-launch-preparation/rollback-and-incident-playbook.md)
- [Phase 4 launch risk register](phase-4-launch-preparation/launch-risk-register.md)

- [Source-bound human UAT packet and approval decision](publisher-readiness/2026-11-01-private-preview-uat-release-decision.md)
- [October historical operational snapshot](history/2026-10-31-operational-state-snapshot.md)
- [Owner release checks, issue #2](https://github.com/hithisisakii09/stackpilot-ai/issues/2) and [commercial decisions, issue #3](https://github.com/hithisisakii09/stackpilot-ai/issues/3)
- [Organic growth research roadmap](growth/2026-10-31-zero-budget-organic-acquisition-pipeline.md)
- `docs/roadmap-to-launch.md`, `docs/zero-budget-hosting.md` and `AGENTS.md`.

**Overall verdict: PR #1 AND PR #7 MERGED TO MAIN — PHASE 2 ENGINEERING CHECKPOINT PASSED at `dd80aee` (implementation) / `289d1b6` (docs update, current PR #8 HEAD) — 481/481 TESTS, 28 ROUTES, 339 LINKS — OWNER SELF-REPORTED ACCEPTANCE AT `dd80aee` — PUBLIC RELEASE NO-GO.** Neither this dated checkpoint nor subsequent independent CI successes can bypass owner-only gates.
