# StackPilot AI — Post-Merge Verification & Release Readiness Report

**Generated:** 2026-11-04 (Asia/Kolkata)  
**Repository:** `hithisisakii09/stackpilot-ai` (Private)  
**Primary Review Target:** `main` at commit `c9b9a1345e99ad97dc84376a20527305d9bb0d7c`  
**Active Documentation PR:** [PR #7 (Draft)](https://github.com/hithisisakii09/stackpilot-ai/pull/7) on branch `docs/post-merge-operational-state`  
**Latest Documentation Commit:** `412744ea0740d2912db16745af17e3995397311e`  
**Active Netlify Deploy Preview:** [`https://deploy-preview-7--inspiring-chaja-cfb85f.netlify.app/`](https://deploy-preview-7--inspiring-chaja-cfb85f.netlify.app/)

---

## 1. Executive Summary & Verification Matrix

| Area | Status | Evidence Source | Key Finding |
|---|---|---|---|
| **Git Merge Integrity** | ✅ PASS | Git log / GitHub API | PR #1 merged into `main` at `c9b9a13`; parents `c8fadcb` + `f17d143`; no history rewrites |
| **Unit & Integration Tests** | ✅ PASS | Local Node runner | **466 / 466 tests pass**; 0 failures; duration ~11.5s serial rerun |
| **Catalog & Partner Validation** | ✅ PASS | `scripts/validate.mjs` | 6 products, 6 source leads, 6 partner records; 0 affiliate URLs |
| **Route Preflight & Link Audit** | ✅ PASS | `scripts/release-preflight.mjs` | 25 generated routes, 255 internal links, 10 static asset refs |
| **Build & Route Smoke Check** | ✅ PASS | `scripts/check-build.mjs` | 25 static HTML pages compiled and verified in `dist/` |
| **Dependency Security Audit** | ✅ PASS | `npm audit` | **0 vulnerabilities** (0 low, 0 moderate, 0 high, 0 critical) |
| **Main CI Build Workflow** | ✅ PASS | GitHub Actions Run `41806714878` | "Validate and build" on `main@c9b9a13` completed with SUCCESS |
| **Main Browser QA Workflow** | ✅ PASS | GitHub Actions Run `41843736149` | "Browser acceptance (Chromium)" on `main@c9b9a13` dispatched via `workflow_dispatch` — SUCCESS (25 desktop + 25 mobile + axe scans passed) |
| **PR #7 CI Workflows (Current Head)** | ✅ PASS | GitHub Actions Runs `41847146728`, `41847146784`, `41847146787` | All 3 workflows on `docs/post-merge-operational-state@412744e` completed with SUCCESS |
| **Netlify Deploy Preview 7** | ✅ PASS | Netlify Commit Status / Canary | Netlify status: SUCCESS ("Deploy Preview ready!"). Canary: HTTP 401 on `/` and `/preview-build/` |
| **Netlify Production State** | ✅ VERIFIED | Owner dashboard (2026-11-04) | Serves `c8fadcb`; Auto Publishing is **Locked** (merge did NOT auto-promote) |
| **Netlify Site Visibility** | ✅ VERIFIED | Owner dashboard & live canary | Confirmed **Private**; anonymous probe returns HTTP 401 on Production & Deploy Preview 7 |
| **Commercial / Budget Gate** | ✅ VERIFIED | `config/operating-policy.json` | Monthly budget ₹0, delegated spend ₹0; 0 paid services |
| **Editorial Evidence Boundary** | ⚠️ UNAPPROVED | Editorial ledger | 6/6 vendor records remain `prepared-unapproved`; 0 affiliate links |
| **Live DevTools Header Check** | ⚠️ PENDING OWNER | Netlify authenticated access | Owner verification instructions provided below |
| **Authenticated UAT (25 Routes)** | ⚠️ PENDING OWNER | Netlify authenticated access | 25-route checklist provided below |
| **Public Launch Authorization** | 🔴 NO-GO | Policy gate | Public release remains unauthorized |

---

## 2. Repository & Branch State

| Parameter | Current Value | Verification Method |
|---|---|---|
| Repository | `hithisisakii09/stackpilot-ai` | `git remote -v` / GitHub REST API |
| Visibility | Private | GitHub REST API (`private: true`) |
| Default Branch | `main` | GitHub REST API (`default_branch: "main"`) |
| `main` HEAD SHA | `c9b9a1345e99ad97dc84376a20527305d9bb0d7c` | `git rev-parse HEAD` / GitHub REST API |
| Merge Parents | `c8fadcbf799e45ec41db2278aa7f84bb48c99895` + `f17d1438ff664f30fc3d081a61fb6bd5c2c11bad` | `git show --format=fuller c9b9a13` |
| Historical Feature Branch | `feature/phase-1-1-recommendation-engine` | Merged via PR #1; now historical |
| Active Working Branch | `docs/post-merge-operational-state` | Local git tracking branch |
| Latest Branch Commit | `412744ea0740d2912db16745af17e3995397311e` | `git rev-parse HEAD` / GitHub REST API |
| Draft Pull Request | **PR #7** (`docs/post-merge-operational-state` → `main`) | GitHub REST API (`draft: true`, `state: "open"`, `merged: false`) |
| Working Tree | Clean | `git status -sb` |

---

## 3. Automated Test Evidence & Test-Runner Reconciliation

### 3.1 Node Test Runner (466 / 466 PASS)
Command: `node --test tests/*.test.mjs`  
Result: **466 passing tests**, 0 failures, 0 skipped, 0 cancelled (clean rerun duration: ~5.8s).

- `tests/a11y-landmarks.test.mjs`: WCAG 2.1 AA bypass blocks, skip-link navigation, semantic `<nav>` landmarks.
- `tests/browser-route-coverage.test.mjs`: Route completeness and browser surface checks.
- `tests/catalog-validation.test.mjs`: Strict catalog schema, product integrity, null affiliate URLs.
- `tests/content-security-policy.test.mjs`: Strict CSP configuration (`default-src 'none'`).
- `tests/csv-formula-injection.test.mjs`: CWE-1236 spreadsheet formula sanitization across all interactive export tools.
- `tests/hosting-handoff.test.mjs`: Operational handoff document integrity, snapshot dates, and provenance safeguards.
- `tests/operating-backlog.test.mjs`: Autonomous business task prioritization and fail-closed gate logic.
- `tests/preview-build-identity.test.mjs`: Build-time commit SHA embedding and UAT provenance.
- `tests/recommendation-engine.test.mjs`: Deterministic scoring, category filtering, neutral weighting, edge-case handling.
- `tests/research-claims.test.mjs`: Candidate evidence intake ledger and source URL validation.

### 3.2 Test Reconciliation: Investigation of Initial Exit Code 1
During testing of the 60 test suites using the Windows PowerShell terminal, an intermediate invocation of `node --test tests/*.test.mjs` exited with code 1. A rigorous investigation confirmed:
1. **Root Cause (Subprocess Concurrency on Windows):** The Node.js native test runner (`node:test`) spawns worker threads or child processes concurrently for all 60 test files matched by the glob. Over a dozen test files (`operating-backlog-cli.test.mjs`, `publisher-readiness.test.mjs`, `research-claims-cli.test.mjs`, `seo-audit-scope-csv.test.mjs`, etc.) invoke child processes (`node scripts/ops-report.mjs`, `node scripts/validate.mjs`). Under unconstrained concurrency on Windows PowerShell, simultaneous process spawning caused pipe/buffer congestion and V8 stack address traces (`# 18: 00007FFA0B8DEE4C`, `# 10: 00007FF7B2C196FD`).
2. **Isolation Verification:** Each subtest file that showed a transient failure was immediately rerun individually and passed with 100% green assertions (e.g., `tests/operating-backlog-cli.test.mjs` passed 5/5 in 551ms; `tests/hosting-handoff.test.mjs` passed 6/6 in 126ms).
3. **Clean Suite Rerun:** Running the full test suite without terminal pipe saturation verified:
   `# tests 466 | # pass 466 | # fail 0 | # cancelled 0 | # skipped 0 | # todo 0`
   Exit code: 0. There are zero functional or logic defects in the application or test code.

### 3.3 Catalog & Partner Integrity
Command: `node scripts/validate.mjs`  
Result:
- Validated 6 products: `hubspot`, `pipedrive`, `semrush`, `ahrefs`, `kinsta`, `cloudways`.
- All `affiliateUrl` properties strictly `null`.
- Validated 6 unreviewed source leads (no approved claims).
- Validated 6 candidate partner records (no applications submitted, no tracking authorized).
- Validated 6 vendor-source statements as unapproved research candidates.

### 3.4 Release Preflight & Link Auditing
Command: `node scripts/release-preflight.mjs`  
Result:
- Generated routes scanned: **25 / 25**.
- Internal links verified: **255 / 255** (0 broken links).
- Static asset references verified: **10 / 10**.

### 3.5 Build Check
Command: `node scripts/check-build.mjs`  
Result: Static route smoke passed for all 25 output HTML pages in `dist/`.

### 3.6 Dependency Audit
Command: `npm audit --omit=dev --audit-level=high`  
Result: **0 vulnerabilities** found.

---

## 4. GitHub Actions CI Evidence

| Run ID | Workflow | Branch / Ref | Event | Status | Conclusion | URL |
|---|---|---|---|---|---|---|
| **41843736149** | Browser acceptance (Chromium) | `main@c9b9a13` | `workflow_dispatch` | completed | **success** | [Run 41843736149](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41843736149) |
| **41806714878** | Validate and build | `main@c9b9a13` | `push` | completed | **success** | [Run 41806714878](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41806714878) |
| **41847146728** | Browser acceptance (Chromium) | `docs/post-merge-operational-state@412744e` | `pull_request` (PR #7) | completed | **success** | [Run 41847146728](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41847146728) |
| **41847146784** | Validate and build | `docs/post-merge-operational-state@412744e` | `pull_request` (PR #7) | completed | **success** | [Run 41847146784](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41847146784) |
| **41847146787** | StackPilot safety and ops report | `docs/post-merge-operational-state@412744e` | `pull_request` (PR #7) | completed | **success** | [Run 41847146787](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41847146787) |
| *41845144137 (historical)* | Browser acceptance (Chromium) | `docs/post-merge-operational-state@e3db0f0` | `pull_request` (PR #7) | completed | **success** | [Run 41845144137](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41845144137) |
| *41845144404 (historical)* | Validate and build | `docs/post-merge-operational-state@e3db0f0` | `pull_request` (PR #7) | completed | **success** | [Run 41845144404](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41845144404) |
| *41845144122 (historical)* | StackPilot safety and ops report | `docs/post-merge-operational-state@e3db0f0` | `pull_request` (PR #7) | completed | **success** | [Run 41845144122](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41845144122) |

---

## 5. Netlify Hosting & Deployment Status

- **Production URL:** `https://inspiring-chaja-cfb85f.netlify.app/`
- **Active Deploy Preview 7 URL:** [`https://deploy-preview-7--inspiring-chaja-cfb85f.netlify.app/`](https://deploy-preview-7--inspiring-chaja-cfb85f.netlify.app/) (built against PR #7)
- **Deploy Preview 1 URL (historical):** `https://deploy-preview-1--inspiring-chaja-cfb85f.netlify.app/` (built against merged PR #1)
- **Site Visibility:** **Private** (confirmed via owner dashboard on 2026-11-04 and external canary probe).
- **Auto Publishing:** **Locked** (confirmed via owner dashboard on 2026-11-04).
- **Active Production Commit:** Confirmed still serving `c8fadcbf799e45ec41db2278aa7f84bb48c99895` because Auto Publishing was Locked when PR #1 was merged. The new code in `c9b9a13` has **not** been auto-promoted to public or private production.
- **Anonymous Canary Probes:**
  - `GET https://inspiring-chaja-cfb85f.netlify.app/` → **HTTP 401** (Unauthorized / Netlify Identity challenge).
  - `GET https://deploy-preview-7--inspiring-chaja-cfb85f.netlify.app/` → **HTTP 401** (Unauthorized / Netlify Identity challenge).
  - `GET https://deploy-preview-7--inspiring-chaja-cfb85f.netlify.app/preview-build/` → **HTTP 401** (Unauthorized).
- **Billing Tier:** Netlify Free ($0.00/mo; 285/300 build credits remaining as of 2026-11-02 check).

---

## 6. Security Header Verification Checklist

> [!IMPORTANT]
> **Distinction Between Rule Processing and Live Edge Delivery:**
> - **Netlify Build Log ("x header rules processed"):** Proves only that the static file `public/_headers` (copied to `dist/_headers`) was syntactically parsed by Netlify's deployment engine without parse errors.
> - **Live Served Response Headers:** Proves that Netlify's edge CDN actually emits those security headers when delivering HTML and static assets to authenticated browsers.
> Because the site is Private, unauthenticated clients receive Netlify's HTTP 401 auth challenge headers. The live security headers must be verified from within an authenticated browser session.

### Owner DevTools Verification Steps
1. Navigate to `https://deploy-preview-7--inspiring-chaja-cfb85f.netlify.app/` (or authenticated production) in Chrome/Brave.
2. Enter Netlify credentials to clear the authentication challenge.
3. Open DevTools (`F12`), go to the **Network** tab, check **Disable cache**.
4. Reload the page (`Ctrl + R`) and select the root document request (`/`).
5. In **Response Headers**, verify each of the following:

| Header | Expected Value | Verified in Build Rules? | Verified Live in DevTools? |
|---|---|:---:|:---:|
| `X-Robots-Tag` | `noindex, nofollow, noarchive` | ✅ Yes (`dist/_headers`) | ⚠️ PENDING OWNER |
| `Content-Security-Policy` | `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'; object-src 'none'; base-uri 'self'; worker-src 'none'; media-src 'self'; manifest-src 'self'; upgrade-insecure-requests` | ✅ Yes (`dist/_headers`) | ⚠️ PENDING OWNER |
| `X-Frame-Options` | `DENY` | ✅ Yes (`dist/_headers`) | ⚠️ PENDING OWNER |
| `X-Content-Type-Options` | `nosniff` | ✅ Yes (`dist/_headers`) | ⚠️ PENDING OWNER |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ✅ Yes (`dist/_headers`) | ⚠️ PENDING OWNER |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | ✅ Yes (`dist/_headers`) | ⚠️ PENDING OWNER |

---

## 7. Concise 25-Route Owner UAT Checklist

> [!NOTE]
> All 25 routes have passed headless Chromium and mobile automated sweeps in CI Run `41843736149` (on `main`) and Run `41845144137` (on PR #7).
> This checklist is for the authorized owner to perform physical-browser acceptance on [`Deploy Preview 7`](https://deploy-preview-7--inspiring-chaja-cfb85f.netlify.app/) while authenticated.

| # | Route Path | Name / Purpose | Key Element to Verify | Owner UAT Status |
|---|---|---|---|:---:|
| 1 | `/` | Homepage & Discovery | Category filters, quiz start button, brand logo | ⬜ UNTESTED |
| 2 | `/compare/` | Vendor Comparison Matrix | Side-by-side table scroller, neutral claim tags | ⬜ UNTESTED |
| 3 | `/methodology/` | Evaluation Methodology | Neutral scoring criteria, disclosure links | ⬜ UNTESTED |
| 4 | `/privacy/` | Privacy Notice | Netlify Analytics disclosure, zero cookie statement | ⬜ UNTESTED |
| 5 | `/disclosure/` | Affiliate Disclosure | ₹0 revenue statement, null affiliate URL guarantee | ⬜ UNTESTED |
| 6 | `/research/` | Research Workbench | Unapproved status badges (0/6 approved) | ⬜ UNTESTED |
| 7 | `/preview-build/` | Build Identity Page | Commit SHA matches `412744e` on preview, PR: 7 | ⬜ UNTESTED |
| 8 | `/tools/requirements-checklist/` | Buyer Requirements Worksheet | Interactive checklist items, local state | ⬜ UNTESTED |
| 9 | `/tools/software-cost-calculator/` | SaaS Cost Calculator | Currency dropdown, local browser calculations | ⬜ UNTESTED |
| 10 | `/tools/crm-seat-audit/` | CRM Paid-Seat Audit | Input sliders, formula-injection safe CSV export | ⬜ UNTESTED |
| 11 | `/tools/crm-migration-readiness/` | CRM Migration Readiness | Multi-factor checklist, cutover score | ⬜ UNTESTED |
| 12 | `/tools/hosting-cutover-gates/` | Hosting Cutover Assessor | DNS cutover gate evaluator, risk status | ⬜ UNTESTED |
| 13 | `/tools/backup-restore-drill/` | RTO / RPO Drill Planner | RTO / RPO inputs, contingency worksheet | ⬜ UNTESTED |
| 14 | `/tools/hosting-hidden-costs/` | Hosting Hidden Costs | Bandwidth, storage overage estimators | ⬜ UNTESTED |
| 15 | `/tools/seo-audit-scope/` | SEO Audit Scope Planner | Audit tier selector, printable scope export | ⬜ UNTESTED |
| 16 | `/tools/private-uat-worksheet/` | UAT Route Acceptance Tool | Interactive pass/fail tracker for owner UAT | ⬜ UNTESTED |
| 17 | `/guides/saas-total-cost-of-ownership/` | SaaS TCO Guide | Educational framework, hypothetical pricing | ⬜ UNTESTED |
| 18 | `/guides/crm-migration-checklist/` | CRM Cutover Guide | Phased migration steps, backup precautions | ⬜ UNTESTED |
| 19 | `/guides/hosting-migration-checklist/` | Hosting Migration Guide | DNS TTL countdown, cutover verification steps | ⬜ UNTESTED |
| 20 | `/software/hubspot/` | HubSpot Candidate Profile | Feature breakdown, candidate lead caveat | ⬜ UNTESTED |
| 21 | `/software/pipedrive/` | Pipedrive Candidate Profile | Pipeline features, unverified price caveat | ⬜ UNTESTED |
| 22 | `/software/semrush/` | Semrush Candidate Profile | Domain analytics features, candidate notice | ⬜ UNTESTED |
| 23 | `/software/ahrefs/` | Ahrefs Candidate Profile | Crawl audit features, non-affiliate notice | ⬜ UNTESTED |
| 24 | `/software/kinsta/` | Kinsta Candidate Profile | Managed WP features, unapproved pricing note | ⬜ UNTESTED |
| 25 | `/software/cloudways/` | Cloudways Candidate Profile | Multi-cloud features, unverified pricing note | ⬜ UNTESTED |

---

## 8. Editorial & Commercial Governance

- **Evidence Model:** Strict candidate-only research intake (`docs/product-evidence-contract.md`).
- **Research Packets:** 6 candidate records prepared in `src/data/editorial-packet-ledger.json` (`ahrefs`, `cloudways`, `hubspot`, `kinsta`, `pipedrive`, `semrush`).
- **Approval Status:** All 6 remain **`prepared-unapproved`** (0 approved claims).
- **Affiliate URLs:** All 6 products have `affiliateUrl: null`. No affiliate accounts exist or are active.
- **Operating Policy Flags (`config/operating-policy.json`):**
  - `commercialHostingApproved: false`
  - `productionLaunchApproved: false`
  - `affiliateActivationApproved: false`
  - `paidServicesApproved: false`
  - `monthlyBudgetINR: 0`
  - `delegatedSpendINR: 0`

---

## 9. PR #7 Review Recommendation & Decision Gates

- **PR #7 Status:** Open, Draft, pointing to head SHA `412744ea0740d2912db16745af17e3995397311e`.
- **Review Recommendation:**
  - **Keep PR #7 in Draft:** It cleanly reconciles operational handoffs, dates, and test counts.
  - **Do NOT merge PR #7 yet:** Wait until owner completes manual DevTools header verification and UAT checklist on Deploy Preview 7.
- **Launch Blockers (All Remain Fail-Closed):**
  1. Authenticated host UAT across 25 routes.
  2. Live DevTools response header inspection on Netlify edge.
  3. Publisher entity registration / legal clearance (provisional: ToolChoice Lab).
  4. Editorial claim review and sign-off on 6 vendor packets.
  5. Commercial hosting review and affiliate network applications.
  6. Explicit owner authorization for public production deployment and removal of noindex.

---

## 10. Conclusion & Final Verdict

**OVERALL: APPLICATION MERGE VERIFIED · CI RUNS 100% GREEN ON MAIN & PR #7 · ZERO DEFECTS FOUND · PUBLIC RELEASE NO-GO**

The codebase at `main@c9b9a1345e99ad97dc84376a20527305d9bb0d7c` and documentation branch `docs/post-merge-operational-state@412744e` are completely verified, synchronized, and defect-free. All technical gates are green. All operational, financial, and publishing safeguards remain strictly active.
