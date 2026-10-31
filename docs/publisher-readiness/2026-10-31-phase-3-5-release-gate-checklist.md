# StackPilot AI — Phase 3.5 fail-closed release-gate execution checklist
**Prepared 2026-10-31 | INTERNAL / PRIVATE | This checklist does not approve publication**

## Starting baseline, time-bound
- At inspection: draft PR #1 at `9f1fb385cbd460a44bb16b1fc89f5f7974bd99ff`, open, draft and unmerged.
- At inspection: Validate and build = SUCCESS; safety/ops = SUCCESS; Chromium browser acceptance = IN PROGRESS. Netlify Deploy Preview commit status = SUCCESS. **Do not call this head fully green until browser check ends successfully.**
- Past owner-reported authenticated functional/mobile/private browser UAT passed at the earlier protected preview; recheck at any release candidate SHA.
- `config/operating-policy.json`: `monthlyBudgetINR=0`, `delegatedSpendINR=0`, `commercialHostingApproved=false`, `productionLaunchApproved=false`, `affiliateActivationApproved=false`, `paidServicesApproved=false`.

## Gate interpretation
- `PASS`: independently or owner-observed evidence tied to a time, route and version; not an inferred assertion.
- `PENDING`: missing evidence. Do not silently pass.
- `BLOCKED`: a real owner/business/legal authorization is missing.
- `FAIL`: confirmed mismatch. Stop and investigate in private development.
- **Public release GO requires every applicable technical gate PASS and every business/legal gate explicitly approved by the owner; code green alone is not permission.**

## Executable preflight actions and evidence fields
| ID | Verification step | Evidence to record | Current state / responsible party |
| --- | --- | --- | --- |
| T01 | Read PR #1 current head; assert `draft=true`, `merged=false`, compare exact SHA | PR URL, SHA, timestamp | PASS as of this document / operator |
| T02 | GitHub Validate/build, Ops and Chromium on exact SHA all successful | Three Actions run IDs and conclusions | PENDING Chromium / operator |
| T03 | GitHub Netlify Deploy Preview status `success` on same SHA | Commit status and preview URL | PASS as of snapshot / operator |
| T04 | Inspect Netlify Production and Deploy Preview visibility, Auto Publishing lock | Fresh owner screenshot (redacted); values PRIVATE/PRIVATE/LOCKED | PREVIOUS OWNER EVIDENCE, latest state pending / owner |
| T05 | Inspect current provider Free subscription, billing/auto top-up settings and credits | Redacted plan/credits UI and applicable terms | Prior Free screenshot; auto-charge guard not verified / owner |
| T06 | Unauthenticated direct checks for homepage, critical route/guide and downloadable assets; no private content returned | URLs, HTTP status, visible outcome, date | Partial sample PASS, complete asset sample pending / operator + owner |
| T07 | Authenticated remote desktop/mobile on exact SHA, feature and negative-input testing | Route, viewport, screenshot summary, date | Prior owner UAT passed; exact future SHA pending / owner |
| T08 | Exact-head headers, robots and canonical URL scan | X-Robots-Tag, noindex, nosniff, frame, referrer, HSTS, permissions; compare asset headers | Prior owner screenshot PASS sampled HTML; exact future SHA pending / operator |
| T09 | Validate no referral activation, external input upload, hidden marketing telemetry, or unsafe persistent storage | Source audits + owner browser Network/Application sampled behavior | Prior browser sample PASS, source recheck pending / operator |
| E01 | Review all six vendor claims by real evidence reviewer with plan/region/edition applicability | Reviewer, date, source and disposition per claim; **never fabricate** | BLOCKED (six candidate flags false) / owner editor |
| E02 | Review CRM, hosting and SEO comparison drafts, originality, content accuracy, license/screenshot provenance | Signed off paragraphs, independent vs vendor-source labels | BLOCKED / owner editor |
| B01 | Publisher operating identity and truthful public contact method | Owner privately confirms details; never save IDs/secrets in GitHub | BLOCKED / owner |
| B02 | Validate actual privacy/data processing (Netlify request logs, retention, processors, actual cookies), jurisdictional policies | Final privacy and terms review, contact and data rights handling | BLOCKED / owner/legal reviewer |
| B03 | Check live commercial hosting suitability and visitor/account billing; verify zero-pay plan does not demand a financial obligation | Current plan terms/settings and owner affirmative statement | BLOCKED / owner |
| B04 | Approve publisher methodology/disclosures, accessibility and claim labels | Editorial/privacy disclosure signoff | BLOCKED / owner |
| B05 | Explicit owner decision for public production deployment and indexing, with approved target SHA | Separate owner instruction with scope/date | NOT AUTHORIZED |
| M01 | Affiliate signup/program terms, KYC/payment methods, tracking URL and disclosure | A **different**, explicit owner authorization per partner; no secrets in repo | NOT AUTHORIZED |

## Decision algorithm (human-readable, no automatic side effects)
1. Obtain current PR exact SHA, checks and Netlify visibility. If any technical safeguard is missing, **NO-GO**; never attempt to fix by unlocking site.
2. Collect per-claim and per-draft editorial evidence. If any human sign-off is absent, **NO-GO**; keep candidate statuses unchanged.
3. Collect actual publisher/contact, privacy and commercially allowed account-plan proof. If evidence missing, **NO-GO**; no speculative business identity.
4. Even when all checks pass, public deployment remains **NO-GO** until B05 separately approved. Affiliate activation independently requires M01.
5. No automated agent may change production visibility, merge PR #1, remove noindex, buy a domain, accept terms, publish, enable paid services, activate links or claim sales from this checklist.

## Automatic safe tasks available immediately
- Reconcile head SHA and CI/deployment status for each new development commit.
- Read source-candidate packets and annotate each claim's uncertainty without changing `approved`.
- Prepare provider-neutral buyer tools, evidence questionnaires and draft copy in this private branch only.
- Find stale links and request authorized human verification; do not infer provider behavior from third-party descriptions.
- Keep issue #2 release gate and issue #4 editorial backlog consistent; no redundant scheduled tasks.

## Owner decision card — only at a future authorized launch decision
**Owner has NOT signed off on these questions**:
1. Is the public operator and professional contact genuine and accessible?
2. Are final privacy/affiliate/legal disclosures reviewed for actual collection and applicable jurisdiction?
3. Have all named product facts and articles passed documented editorial review?
4. Is the commercially permitted host/account setup safe at ₹0 and are unexpected charges prevented?
5. Is the designated release SHA fully verified in production-like conditions?
6. Does the owner **separately authorize** public publishing and indexing of that exact build?

**Final state of this file:** PRIVATE PRELAUNCH PREPARATION; PUBLIC PRODUCTION **NO-GO**. No publication, affiliate activation, spending or branch merging performed.
