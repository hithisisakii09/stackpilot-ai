# StackPilot AI — Security Monitoring & Incident Response Playbook

**Document Date:** 2026-11-03 (Asia/Kolkata)  
**Status:** INTERNAL OPERATIONS SPECIFICATION / INCIDENT PLAYBOOK  
**Branch:** `feature/phase-1-1-recommendation-engine` | **PR:** [#1](https://github.com/hithisisakii09/stackpilot-ai/pull/1) (draft)  
**Operating Limit:** ₹0 monthly spend, zero paid alerting services, zero automated production changes.

---

## 1. Monitoring Strategy Under ₹0 Budget

StackPilot AI operates under a strict ₹0 INR budget and cannot subscribe to paid synthetic monitoring services (Datadog, Pingdom, New Relic, etc.). Security and operational health are maintained via three zero-cost monitoring layers:

### 1.1 CI/CD Gatekeeper Monitoring (GitHub Actions)
- **Workflow Triggers:** Every push to `feature/phase-1-1-recommendation-engine` triggers:
  1. `Validate and build` (`.github/workflows/ci.yml`): Unit tests, catalog validation, Astro static build, route smoke checks, and `npm audit --omit=dev --audit-level=high`.
  2. `Safety and operations report` (`.github/workflows/agent-ops.yml`): Policy checks, fail-closed operations report generation, anonymous preview canary probes (asserting HTTP 401 on private endpoints).
  3. `Browser acceptance` (`.github/workflows/browser-qa.yml`): Desktop/mobile Chromium and axe-core WCAG scans.
- **Fail-Closed Threshold:** Any single failure halts CI and marks PR #1 checks as failed.

### 1.2 Hourly Incident Watch (External Scheduled Task)
- **Frequency:** Configured at the ChatGPT scheduling layer outside GitHub.
- **Responsibilities:**
  - Inspects GitHub Actions run statuses for PR #1.
  - Inspects Netlify Deploy Preview commit status.
  - Alerts the operator only on material failures: broken build, security header omission, anonymous access canary breach (2xx returned on private preview), or dependency vulnerability alert.
- **Rate-Limiting:** Silence by default; notifications are emitted only on status transition or failure.

### 1.3 Daily Autonomous Operator (External Scheduled Task)
- **Frequency:** Daily scheduled cycle.
- **Responsibilities:**
  - Runs `npm run ops:report -- --json` and `npm run ops:backlog -- --json`.
  - Prioritizes safe, non-commercial advisory tasks (P30 research review, P40 partner discovery, P50 eligibility rechecks).
  - Enforces all owner release gates (11 owner gates remain unverified).

---

## 2. Threat Scenarios & Detection Thresholds

| Threat / Incident Scenario | Detection Mechanism | Severity | Automatic Response |
|---|---|---|---|
| **Accidental Production Unlock** | CI canary / Netlify status check | Critical | Halt autonomous cycle; alert owner immediately; do not proceed. |
| **Anonymous Access Exposure (HTTP 200 on Private Preview)** | `anonymous-preview-probe.mjs` returns `POTENTIAL_ANONYMOUS_RESPONSE` | High | CI operations workflow exits with code 1; build artifact fails. |
| **Dependency Vulnerability (CVE)** | `npm audit` in CI | High | `npm test` fails in `Validate and build`; release blocked. |
| **Crawl Leakage (Missing Noindex)** | `scripts/check-build.mjs` or `release-preflight.mjs` | High | Build preflight halts; non-indexed asset packaging aborted. |
| **External Resource Injection** | `scripts/release-preflight.mjs` scans emitted HTML/CSS | High | Preflight exits code 1; PR blocked. |
| **Netlify Free Credit Depletion** | Owner inspection of Netlify Billing UI | Medium | Service paused by provider; owner alerted (zero upgrades permitted). |

---

## 3. Incident Response & Rollback Procedures

### 3.1 Scenario: Netlify Deploy Preview Returns HTTP 200 to Anonymous Requests
**Problem:** Netlify visitor visibility accidentally changed from Private to Public.
**Immediate Response:**
1. Do **not** attempt automated account actions.
2. Owner must immediately log into **Netlify Admin $\rightarrow$ Site configuration $\rightarrow$ Access & security $\rightarrow$ Visitor access**.
3. Re-enable **Private** visitor access.
4. Verify from an incognito window that the site prompts for login or returns 401/404.

### 3.2 Scenario: Regressive Commit Introduced in Development Branch
**Problem:** A commit introduces a failing test or security preflight violation.
**Rollback Procedure:**
1. In the local repository on `feature/phase-1-1-recommendation-engine`:
   ```bash
   git log -2 --oneline
   ```
2. Revert the offending commit cleanly using standard git revert:
   ```bash
   git revert <bad-commit-sha> -m "revert: rollback regressive commit"
   ```
3. Run the full test suite to confirm health:
   ```bash
   npm test
   ```
4. Push the revert commit to `origin feature/phase-1-1-recommendation-engine`.
5. PR #1 will automatically update and re-run all three CI workflows.

### 3.3 Scenario: Netlify Free Build Credits Near Depletion (< 20 Credits)
**Policy Rule:** The owner operating budget is ₹0 INR. No paid upgrades or credit purchases are permitted.
**Action:**
1. Pause non-essential commit pushes to `feature/phase-1-1-recommendation-engine`.
2. Batch multiple documentation or code updates into single commits to minimize build credit usage.
3. Lock Auto Publishing in Netlify UI until the next monthly billing cycle resets the 300 free credits.

---

## 4. Post-Incident Review Protocol
Every incident must be documented in `docs/history/` with:
- Exact date, time, and commit SHA.
- Failure description and detection method.
- Root cause analysis.
- Corrective actions implemented.
- Affirmation that ₹0 budget and no-public-launch invariants were preserved throughout.

