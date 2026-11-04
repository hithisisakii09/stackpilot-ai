# StackPilot AI — Private preview UAT and owner release-decision packet

**Updated:** 2026-11-02 (Asia/Kolkata) · **PRIVATE / RELEASE NO-GO / NOT AN APPROVAL**

**Living reference:** [Release blocker #5](https://github.com/hithisisakii09/stackpilot-ai/issues/5). Check current [draft PR #1](https://github.com/hithisisakii09/stackpilot-ai/pull/1) and its exact HEAD before testing. **Never treat a past passing SHA as a present one.**

## Current next-action: refresh build identity, then complete authenticated owner UAT

**Last build-identity check: OWNER-OBSERVED PASS (2026-11-02) for the then-current SHA.** The owner supplied a screenshot of the authenticated [Preview build identity page](https://deploy-preview-1--inspiring-chaja-cfb85f.netlify.app/preview-build/) showing full SHA `ff88a68691e5cf8705250cca5245f03a7fa06957` and `Expected preview PR: 1`, matching PR #1 HEAD at that time. This is a visual match of build-time metadata only—not cryptographic provenance, proof of every served asset, authenticated route coverage, anonymous-access denial, live security headers or release approval.

**Any subsequent documentation or code commit changes PR #1 HEAD.** After the latest commit lands and Netlify finishes the private Deploy Preview, re-open the identity page while signed in and compare all 40 SHA characters to the current PR #1 HEAD. The previous `ff88...` screenshot does not certify a later commit.

1. Open the protected [Preview build identity page](https://deploy-preview-1--inspiring-chaja-cfb85f.netlify.app/preview-build/) in the **authenticated Netlify Deploy Preview**. If it says UNKNOWN, differs from the new PR HEAD, or cannot be accessed with authorized login, record **FAIL/BLOCKED**, not PASS.
2. Once the SHA matches, use the current SHA-bound private GitHub Actions `stackpilot-private-preview-package` and its `uat-cases.csv` to exercise every hosted route and buyer-tool workflow. Mark each result only from your own actual observation. Never upload account credentials, cookies, customer records, or Netlify tokens.
3. Independently test anonymous denial, live response headers, analytics/logging behavior and current Netlify Private/Locked settings. A two-path CI 401 canary or noindex directive is not exhaustive access-control proof.
4. Matching printed build metadata is **not independently cryptographic evidence**, not a live-header, provider account or anonymous-access security audit, not remote-route UAT and never release approval. Production, contract, affiliate and spending gates remain **NO-GO**.

**Historical reference table below is deliberately retained as an old checkpoint, not the latest CI result.** Always inspect the PR's exact current SHA and Actions runs before making any claim.

## 1. Historical application checkpoint (NOT CURRENT)

The last application HEAD before this documentation refresh was `0a07ce3657eb4517322e88c0bd2a0ce84d755e14`. That commit had all the following GitHub evidence:

| Evidence | Link and measured result | Limit |
| --- | --- | --- |
| Unit/build/data validation | [GitHub run 41275501086](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41275501086) — SUCCESS; **260/260 unit tests**, **18/18 static routes**, release preflight PASS, npm audit 0 reported vulnerabilities | Local CI/build, not provider account verification |
| Browser acceptance | [GitHub run 41275501083](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41275501083) — SUCCESS | Local browser / axe, not authenticated hosted preview |
| Operations/safety | [GitHub run 41275501128](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41275501128) — SUCCESS | Does not confer any approval |
| Netlify Deploy Preview | [Private PR preview](https://deploy-preview-1--inspiring-chaja-cfb85f.netlify.app/) — GitHub deployment status SUCCESS on this SHA | Does **not** prove visitor access, actual response headers or remote browser acceptance |
| Main/production | `main@c8fadcbf799e45ec41db2278aa7f84bb48c99895` as checked 2026-11-01 | Do not merge or unlock production |

**This document revision creates a new GitHub SHA.** Recheck CI and Netlify status on that resulting HEAD before presenting it as fully verified. Documentation-only changes do not authorize anything.

Current private features include a neutral six-vendor comparison, source-status research, CRM and hosting migration checklists, user-entered cost calculator, requirements CSV worksheet and a **CRM paid-seat audit**. The homepage now links to the audit. All product/catalog claims remain unreviewed; no affiliate tracking is active.

## 2. Authenticated private preview UAT — evidence not yet collected

Use a browser legitimately signed in to the owner's Netlify account. Do **not** disclose passwords, cookies, identity documents, access tokens or customer data in GitHub, chat or screenshots. Keep any sensitive screenshots in private access-controlled storage and record only redacted status notes.

Before each test: inspect the deployed preview commit in Netlify and match it to the **current draft PR HEAD**, not the historical reference above. Record `SHA | UTC/IST time | browser and viewport | test | PASS/FAIL/BLOCKED | redacted evidence location`. A 404, login page, or inaccessible web reader alone is **not proof** of anonymous denial.

| Test | Action | Expected / record |
| --- | --- | --- |
| Private gated access | In authenticated browser open PR preview; in completely separate incognito browser without login open the same URL | Authenticated content works; anonymous visitor cannot see project content. Document actual observed status/screen and access scope |
| Homepage discovery | Open homepage; use Tab/Enter on the **CRM seat audit** navigation entry | Keyboard navigation loads `/tools/crm-seat-audit/` with focus indicators |
| CRM paid-seat arithmetic | Enter billed **8**, occupied **5**, active **5**, with no account checks | **3 vacant**, **62.50%** utilization; **INCOMPLETE**, billing impact **UNKNOWN**; no savings/refund promise |
| CRM stale/invalid state | Check all 3 provider/account boxes and regenerate; then edit a seat count; attempt 9 occupied vs 8 billed | Human-review status (not approval); input edit clears stale report; invalid count reports error, report blank, copying disabled |
| Cost calculator stale state | Enter two fictional quotes, calculate; then change **price**, **currency**, and **month horizon** separately | Previously generated estimate clears on each change, copy disabled until recalculation; user-entered-only caveats remain |
| Requirements worksheet | Select CRM questions; generate and download `stackpilot-requirements-crm.csv`; change selections | Download contains only selected questions and blank unverified vendor answers; stale CSV disabled after editing |
| Neutral comparison | Browse six candidates and compare CRM, SEO, and hosting pairs; select same vendor twice | No paid winner, unverifiable prices or affiliate links; invalid comparison clears preview/export |
| Other routes | Visit `/research/`, `/methodology/`, `/privacy/`, `/disclosure/`, migration guides | 200/page loads in authenticated session, no console exceptions or broken routes |
| Mobile accessibility | Repeat key CRM/cost/checklist interactions at 390px / real phone; use keyboard as practical | No horizontal document overflow, readable controls, accessible focus, working form and export |
| Actual HTTP headers | In authenticated browser DevTools inspect response headers for homepage and a tool | `X-Robots-Tag: noindex, nofollow, noarchive`, CSP, `X-Content-Type-Options: nosniff`, and expected protections actually present; record **observed**, not just repo config |
| No unexpected client transmission | In DevTools Network inspect form interactions with synthetic counts | No unexpected form submission or third-party requests containing input. Distinguish browser behavior from Netlify CDN/provider logs |

**No current-SHA authenticated UAT or unauthenticated-denial result has been demonstrated to this operator.** Local Chromium PASS is valuable but insufficient. Never claim completion or tick issue #5 without independent evidence.

## 3. Netlify account verification — owner/provider-only

Official provider documentation:
- [Netlify Project visibility](https://docs.netlify.com/manage/security/secure-access-to-sites/project-visibility/)
- [Netlify Protect deploys](https://docs.netlify.com/deploy/protect-deploys/)

For credit-based plans, Netlify's documented UI path is **Project configuration → General → Visitor access → Project visibility**. Confirm visitor visibility **Private** for **production and previews**, and that the production auto-publishing lock remains effective. This is an account control, not something that `netlify.toml`, a deploy-success check, or robots meta tags can certify. Record plan/credit-usage/alerts/billing information from authenticated provider UI **without** exposing payment details.

Investigate provider-side Netlify Analytics, server/CDN logs, retention, privacy notice and account billing eligibility rather than assuming no analytics because the browser source has no tracking script. **₹0 monthly and ₹0 delegated spend remain binding; do not enable add-ons, upgrades, auto-reload, or new external browser automation charges.** If verification is unavailable, mark **BLOCKED**.

## 4. Editorial claims — six separate human decisions

Candidates requiring independent human review:
1. HubSpot export/association limits
2. Pipedrive spreadsheet import limits
3. Ahrefs Site Audit crawl credit differences
4. Semrush crawl/scope restrictions
5. Kinsta hosting limits/overage conditions
6. Cloudways backups and restore/billing differences (public documents contain a potentially conflicting description)

Each needs reviewer identity (privately tracked), dated official URL, edition/plan/region/time caveats, decision **ACCEPT WITH ATTRIBUTION / REVISE / HOLD / REJECT**, and supporting redacted evidence. Research agents may collect links and drafts but **may not self-approve**. Currently **0/6 approved**. Do not set any `verified` flag true or activate `affiliateUrl` from research alone.

## 5. Distinct owner/legal/commercial gates

- Confirm public brand and owner/publisher identity. *ToolChoice Lab* is a working label only; public trademark/brand clearance and renaming are not authorized.
- Approve the contact address, accurate publisher privacy/disclosure terms, hosting/account logging and any analytics use, through suitable human/legal review.
- Verify account-specific free commercial hosting eligibility, the privacy/lock controls and non-metered budget in Netlify dashboard.
- Collect actual affiliate-program acceptance and required agreements/KYC/tax details **outside GitHub**. No applications, tracked links or revenue are approved or demonstrated by a draft.
- Authorize **main merge**, **public production unlock**, **DNS/domain exposure**, **indexing**, **affiliate activation**, and **public launch** as distinct explicit future decisions, not one blanket approval.
- Respect **₹0 spend**, no contracts, and no recreation of the owner-deleted Vercel project.

**Release verdict: NO-GO** until the above prerequisites are separately fulfilled. Do not infer release permission from CI, an owner checklist planning checkmark, an old private-preview test, or a successful Netlify build.

## 6. Agent handoff

Safe autonomous work may continue on the development branch: reproducible test-first improvements, source freshness research, editorial drafts, and CI failure repairs. The existing engineering operator, growth agent and incident watch remain scheduled. Do not launch duplicate schedules or incur metered services. Keep PR #1 draft, main stable, preview private/nonindexed, affiliates inactive and policy budget ₹0. The live release blocker is [issue #5](https://github.com/hithisisakii09/stackpilot-ai/issues/5), not this document's historical commit SHA.
