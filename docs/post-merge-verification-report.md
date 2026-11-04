# StackPilot AI — Post-Merge Verification & Release Readiness Report

**Generated:** 2026-11-04 (Asia/Kolkata)  
**Repository:** `hithisisakii09/stackpilot-ai` (Private)  
**Primary Review Target:** `main` at commit `c9b9a1345e99ad97dc84376a20527305d9bb0d7c`  
**Active Documentation PR:** [PR #7 (Draft)](https://github.com/hithisisakii09/stackpilot-ai/pull/7) on branch `docs/post-merge-operational-state`

---

## 1. Executive Summary & Verification Matrix

| Area | Status | Evidence Source | Key Finding |
|---|---|---|---|
| **Git Merge Integrity** | ✅ PASS | Git log / GitHub API | PR #1 merged into `main` at `c9b9a13`; parents `c8fadcb` + `f17d143`; no history rewrites |
| **Unit & Integration Tests** | ✅ PASS | Local Node runner | **466 / 466 tests pass**; 0 failures; duration ~4.2s |
| **Catalog & Partner Validation** | ✅ PASS | `scripts/validate.mjs` | 6 products, 6 source leads, 6 partner records; 0 affiliate URLs |
| **Route Preflight & Link Audit** | ✅ PASS | `scripts/release-preflight.mjs` | 25 generated routes, 255 internal links, 10 static asset refs |
| **Build & Route Smoke Check** | ✅ PASS | `scripts/check-build.mjs` | 25 static HTML pages compiled and verified in `dist/` |
| **Dependency Security Audit** | ✅ PASS | `npm audit` | **0 vulnerabilities** (0 low, 0 moderate, 0 high, 0 critical) |
| **Main CI Build Workflow** | ✅ PASS | GitHub Actions Run `41806714878` | "Validate and build" on `main@c9b9a13` completed with SUCCESS |
| **Main Browser QA Workflow** | ✅ PASS | GitHub Actions Run `41843736149` | "Browser acceptance (Chromium)" on `main@c9b9a13` dispatched via `workflow_dispatch` — SUCCESS (25 desktop + 25 mobile + axe scans passed) |
| **PR #7 CI Workflows** | ✅ PASS | GitHub Actions Runs `41827091619`, `41827091353`, `41827091032` | All 3 workflows on `docs/post-merge-operational-state` completed with SUCCESS |
| **Netlify Production State** | ✅ VERIFIED | Owner dashboard (2026-11-04) | Serves `c8fadcb`; Auto Publishing is **Locked** (merge did NOT auto-promote) |
| **Netlify Site Visibility** | ✅ VERIFIED | Owner dashboard & live canary | Confirmed **Private**; anonymous HTTP request returns 401 |
| **Commercial / Budget Gate** | ✅ VERIFIED | `config/operating-policy.json` | Monthly budget ₹0, delegated spend ₹0; 0 paid services |
| **Editorial Evidence Boundary** | ⚠️ UNAPPROVED | Editorial ledger | 6/6 vendor records remain `prepared-unapproved`; 0 affiliate links |
| **Live DevTools Header Check** | ⚠️ PENDING OWNER | Netlify authenticated access | Owner verification instructions provided below |
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
| Draft Pull Request | **PR #7** (`docs/post-merge-operational-state` → `main`) | GitHub REST API (`draft: true`, `state: "open"`) |
| Working Tree | Clean | `git status -sb` |

---

## 3. Automated Test & Validation Evidence

### 3.1 Node Test Runner (466 / 466 PASS)
Command: `node --test tests/*.test.mjs`  
Result: **466 passing tests**, 0 failures, 0 skipped, 0 cancelled.
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

### 3.2 Catalog & Partner Integrity
Command: `node scripts/validate.mjs`  
Result:
- Validated 6 products: `hubspot`, `pipedrive`, `semrush`, `ahrefs`, `kinsta`, `cloudways`.
- All `affiliateUrl` properties strictly `null`.
- Validated 6 unreviewed source leads (no approved claims).
- Validated 6 candidate partner records (no applications submitted, no tracking authorized).
- Validated 6 vendor-source statements as unapproved research candidates.

### 3.3 Release Preflight & Link Auditing
Command: `node scripts/release-preflight.mjs`  
Result:
- Generated routes scanned: **25 / 25**.
- Internal links verified: **255 / 255** (0 broken links).
- Static asset references verified: **10 / 10**.

### 3.4 Build Check
Command: `node scripts/check-build.mjs`  
Result: Static route smoke passed for all 25 output HTML pages in `dist/`.

### 3.5 Dependency Audit
Command: `npm audit --omit=dev --audit-level=high`  
Result: **0 vulnerabilities** found.

---

## 4. GitHub Actions CI Evidence

| Run ID | Workflow | Branch / Ref | Event | Status | Conclusion | URL |
|---|---|---|---|---|---|---|
| **41843736149** | Browser acceptance (Chromium) | `main@c9b9a13` | `workflow_dispatch` | completed | **success** | [Run 41843736149](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41843736149) |
| **41806714878** | Validate and build | `main@c9b9a13` | `push` | completed | **success** | [Run 41806714878](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41806714878) |
| **41827091619** | Browser acceptance (Chromium) | `docs/post-merge-operational-state` | `pull_request` (PR #7) | completed | **success** | [Run 41827091619](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41827091619) |
| **41827091353** | Validate and build | `docs/post-merge-operational-state` | `pull_request` (PR #7) | completed | **success** | [Run 41827091353](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41827091353) |
| **41827091032** | StackPilot safety and ops report | `docs/post-merge-operational-state` | `pull_request` (PR #7) | completed | **success** | [Run 41827091032](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41827091032) |

> [!NOTE]
> Run `41843736149` proves that the Chromium browser test suite (25 desktop and 25 mobile sweeps with axe WCAG 2.1 A/AA compliance) passed directly against the merged `main` commit `c9b9a1345e99ad97dc84376a20527305d9bb0d7c`.

---

## 5. Netlify Hosting & Deployment Status

- **Production URL:** `https://inspiring-chaja-cfb85f.netlify.app/`
- **Deploy Preview 1 URL (historical):** `https://deploy-preview-1--inspiring-chaja-cfb85f.netlify.app/`
- **Site Visibility:** **Private** (confirmed via owner dashboard on 2026-11-04 and external canary probe).
- **Auto Publishing:** **Locked** (confirmed via owner dashboard on 2026-11-04).
- **Active Production Commit:** Confirmed still serving `c8fadcbf799e45ec41db2278aa7f84bb48c99895` because Auto Publishing was Locked when PR #1 was merged. The new code in `c9b9a13` has **not** been auto-promoted to public or private production.
- **Anonymous Canary Probes:**
  - `GET https://inspiring-chaja-cfb85f.netlify.app/` → **HTTP 401** (Unauthorized / Netlify Identity challenge).
  - `GET https://deploy-preview-1--inspiring-chaja-cfb85f.netlify.app/` → **HTTP 401** (Unauthorized).
- **Billing Tier:** Netlify Free ($0.00/mo; 285/300 build credits remaining as of 2026-11-02 check).

---

## 6. Instructions for Owner Verification of Live HTTP Headers

Because the Netlify site is configured as **Private**, external unauthenticated HTTP requests only receive the Netlify authentication challenge (HTTP 401) rather than the application headers configured in `public/_headers`.

To inspect the real served security headers as an authenticated user:

### Step-by-Step DevTools Inspection Guide

1. **Open an Authenticated Session:**
   - Open Google Chrome, Chromium, or Brave.
   - Navigate to the private Netlify deployment: `https://inspiring-chaja-cfb85f.netlify.app/` (or authenticated Deploy Preview).
   - Enter your Netlify credentials or site password when prompted.

2. **Open Developer Tools:**
   - Press `F12` (or `Ctrl + Shift + I` on Windows/Linux; `Cmd + Option + I` on macOS).
   - Click on the **Network** tab in the DevTools panel.
   - Check the **Disable cache** checkbox in the Network toolbar.

3. **Navigate to the Root Page:**
   - Refresh the page (`Ctrl + R` or `F5`).
   - In the Network request list, select the very first request (Document type, named `inspiring-chaja-cfb85f.netlify.app` or `/`).

4. **Inspect Response Headers:**
   - In the right-hand panel, click the **Headers** tab.
   - Scroll down to the **Response Headers** section.
   - Verify that the following security headers are present with the exact values:

   | Header | Expected Value | Purpose |
   |---|---|---|
   | `X-Robots-Tag` | `noindex, nofollow, noarchive` | Search engine exclusion (crawl prevention) |
   | `Content-Security-Policy` | `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'; object-src 'none'; base-uri 'self'; worker-src 'none'; media-src 'self'; manifest-src 'self'; upgrade-insecure-requests` | Script injection & XSS prevention |
   | `X-Frame-Options` | `DENY` | Clickjacking prevention |
   | `X-Content-Type-Options` | `nosniff` | MIME-type confusion protection |
   | `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer leakage control |
   | `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Browser feature restriction |

5. **Verify Secondary Static Assets:**
   - In the Network tab, filter by **CSS** or **JS**.
   - Click on a compiled stylesheet or script file.
   - Verify that `X-Content-Type-Options: nosniff` and `X-Robots-Tag: noindex` are applied.

6. **Verify Incognito Denial:**
   - Open a fresh Incognito / Private browsing window (`Ctrl + Shift + N`).
   - Navigate to `https://inspiring-chaja-cfb85f.netlify.app/preview-build/`.
   - Confirm that Netlify immediately presents a login wall (HTTP 401) and does not display application content.

---

## 7. Editorial & Commercial Governance

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

## 8. Pull Request Status

- **PR #1:** `feature/phase-1-1-recommendation-engine` → `main`
  - Status: **Merged & Closed** on 2026-11-04 by owner.
  - Merge commit: `c9b9a1345e99ad97dc84376a20527305d9bb0d7c`.
- **PR #7:** `docs/post-merge-operational-state` → `main`
  - Status: **Open (Draft)**.
  - URL: [https://github.com/hithisisakii09/stackpilot-ai/pull/7](https://github.com/hithisisakii09/stackpilot-ai/pull/7)
  - Purpose: Reconcile operational documentation, snapshot dates, and checkpoint SHAs.
  - Action: **Must remain Draft**; do NOT merge without explicit owner authorization.

---

## 9. Outstanding Owner Decision Gates

| # | Gate | Required Action | Status |
|---|---|---|---|
| 1 | **PR #7 Review** | Review documentation reconciliation PR #7 in GitHub UI; keep in Draft until ready | 📋 PENDING OWNER |
| 2 | **Live Header DevTools Check** | Perform authenticated Netlify DevTools inspection following Section 6 guide | 📋 PENDING OWNER |
| 3 | **Full UAT Across 25 Routes** | Execute test cases from `uat-cases.csv` on authenticated private deployment | 📋 PENDING OWNER |
| 4 | **Production Promotion Decision** | If owner desires production deployment to reflect `c9b9a13`, unlock Auto Publishing in Netlify or trigger manual deploy | 🔴 OWNER-ONLY GATE |
| 5 | **Publisher Brand & Entity Clearance** | Decide on publisher entity (provisional: ToolChoice Lab) and legal jurisdiction | 🔴 OWNER-ONLY GATE |
| 6 | **Editorial Claim Verification (x6)** | Human editor review and sign-off for candidate packets in `src/data/editorial-packet-ledger.json` | 🔴 OWNER-ONLY GATE |
| 7 | **Commercial Hosting & Affiliate Programs** | Review Netlify commercial eligibility and submit official affiliate program applications | 🔴 OWNER-ONLY GATE |
| 8 | **Public Release Authorization** | Explicit owner approval required before removing noindex, adding custom domain, or enabling crawling | 🔴 OWNER-ONLY GATE |

---

## 10. Conclusion & Final Verdict

**OVERALL: APPLICATION MERGE VERIFIED · CI RUNS GREEN · DOCUMENTATION PR #7 ACTIVE IN DRAFT · PUBLIC RELEASE NO-GO**

All automated technical verification requirements have been satisfied. GitHub Actions CI passed completely on both `main` (build run `41806714878` and Chromium browser QA run `41843736149`) and `docs/post-merge-operational-state` (runs `41827091619`, `41827091353`, `41827091032`). The repository remains private, fail-closed, unmonetized, with ₹0 expenditure, and strictly non-indexed.
