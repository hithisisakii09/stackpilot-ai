# StackPilot AI — Operational Reliability & Incident Response Runbook

**Document Date:** 2026-11-04 (Asia/Kolkata)  
**Status:** PRODUCTION OPERATIONAL SPECIFICATION / RELIABILITY RUNBOOK  
**Branch:** `feature/phase-1-1-recommendation-engine` | **PR:** [#1](https://github.com/hithisisakii09/stackpilot-ai/pull/1) (Draft)  
**Operating Limit:** ₹0 INR monthly spend, zero paid alerting infrastructure, fail-closed security.

---

## 1. Operational Threat Models & Incident Classification

StackPilot AI distinguishes between its current private preview posture and future public production operations:

### 1.1 Private Development Threat Model (Current State)
- **Primary Risks:** Confidentiality breach, accidental public exposure, search engine indexing leakage, unapproved vendor claims leakage, or accidental affiliate tracking activation.
- **Incident Triggers:**
  - Anonymous visitor probe returns HTTP 200 on Netlify Deploy Preview instead of HTTP 401.
  - Absence of `X-Robots-Tag: noindex, nofollow` or removal of `Disallow: /` from `robots.txt`.
  - Accidental promotion or unlocked Auto Publishing on Netlify production.
  - Active affiliate link detected in committed catalog (`affiliateUrl !== null`).

### 1.2 Public Production Threat Model (Future Post-Launch State)
- **Primary Risks:** Availability disruption, calculator computation errors, CSP enforcement failure, or corrupted data exports.
- **Incident Triggers:**
  - Complete site outage or CDN edge degradation.
  - Broken buyer decision tools or unhandled JavaScript runtime exceptions.
  - Content Security Policy failing to block unexpected remote asset injection.

### 1.3 Incident Severity Matrix

| Severity Level | Definition | Examples | Response Target |
|---|---|---|---|
| **SEV-1 (Critical)** | Security/privacy breach, anonymous access leakage, unauthorized affiliate tracking, broken CSP, total site outage | Canary probe returns HTTP 200 on private preview; affiliate tracking URL deployed; CSP header dropped | **< 15 minutes** |
| **SEV-2 (Major)** | Core buyer journey failure, calculator / decision tool logic error, 404 on high-intent routes | Inaccurate seat calculation; CSV export formula corruption; broken category comparison matrix | **< 2 hours** |
| **SEV-3 (Minor)** | Non-blocking visual defect, minor layout shift, outdated non-critical documentation | Minor padding misalignment on mobile; non-blocking copy typo in guide | Next scheduled development cycle |

---

## 2. Deterministic Rollback Hierarchy

StackPilot AI employs a three-tier rapid rollback hierarchy:

```
[Incident Detected]
       │
       ├── Tier 1 (< 2 min): Netlify Dashboard -> "Publish deploy" (Instant CDN edge switch)
       │
       ├── Tier 2 (< 10 min): Git revert on feature branch / main -> standard CI validation
       │
       └── Tier 3 (Disaster): Emergency stop-publishing or DNS CNAME removal
```

### 2.1 Tier 1: Netlify Instant Deploy Rollback (< 2 Minutes)
Netlify compiles and stores immutable, SHA-tagged static build directories. Edge routing can be switched atomically to any historical deploy:
1. Owner opens **Netlify Dashboard** $\rightarrow$ **Masher / StackPilot** $\rightarrow$ **Deploys**.
2. Locate the last verified green deploy commit SHA.
3. Click the deploy entry $\rightarrow$ Click **Publish deploy**.
4. Edge routing switches immediately (< 2 minutes global propagation).
5. Verify rollback by checking `/preview-build/` for the matching Git commit SHA.

### 2.2 Tier 2: Git Revert Procedure (< 10 Minutes)
To reconcile the source repository after a Tier 1 rollback:
```bash
# 1. Ensure clean working branch
git checkout feature/phase-1-1-recommendation-engine
git pull origin feature/phase-1-1-recommendation-engine

# 2. Revert the regressive commit
git revert <bad-commit-sha> -m "revert: rollback regressive commit"

# 3. Run full verification suite
node --test tests/*.test.mjs
node scripts/validate.mjs
node scripts/release-preflight.mjs

# 4. Push revert commit
git push origin feature/phase-1-1-recommendation-engine
```

### 2.3 Tier 3: Emergency Fail-Closed Lockdown
If an active vulnerability or credential exposure is detected:
- **Netlify UI:** Navigate to **Site configuration $\rightarrow$ Danger Zone $\rightarrow$ Stop publishing**, or set Site Access to **Password Protected / Restricted**.
- **DNS Level:** Remove or repoint the DNS CNAME record away from Netlify to immediately sever ingress.

---

## 3. Platform Recovery Objectives (RTO & RPO)

### 3.1 Recovery Point Objective (RPO) = 0 Minutes
- **Zero Data Loss:** StackPilot AI is an entirely static site compiled via Astro. All catalogs (`products.json`, `research-claims.json`, `evidence-leads.json`), schemas, templates, and decision tools reside in Git.
- There are zero client-side databases, zero runtime databases, and zero dynamic state stores. Every deployed state maps 1:1 to a Git commit SHA.
- **RPO Target:** 0 minutes (all state is preserved in the Git commit graph).

### 3.2 Recovery Time Objective (RTO)
- **Operational Rollback (Tier 1):** $\le$ **2 minutes** (atomic Netlify edge switch).
- **Codebase Rollback (Tier 2):** $\le$ **10 minutes** (Git revert, CI pipeline, automated deploy).
- **Disaster Host Migration (Cloudflare Pages):** $\le$ **30 minutes** (re-pointing build to Cloudflare Pages zero-cost fallback).

---

## 4. Hosting Quota Management & Fallback Protocol

### 4.1 Netlify Free Quota Monitoring
- Netlify Free provides a hard allowance of **300 build minutes / month** and **100 GB bandwidth / month**.
- Under Netlify Free terms, sites pause when limits are reached; no unexpected charges are billed.
- **Quota Alert Levels:**
  - **Green:** $> 50$ build credits remaining. Normal continuous integration.
  - **Amber (Warning):** $20–50$ build credits remaining. Batch commits; avoid frequent preview triggers; maintain Auto Publishing Locked.
  - **Red (Critical):** $< 20$ build credits remaining. Freeze non-essential pushes; conduct local testing only until monthly billing cycle reset.

### 4.2 Cloudflare Pages Zero-Cost Fallback
Should Netlify availability or quota become unavailable:
1. **Zero Code Changes:** Astro static build output (`dist/`) is 100% standard static HTML/CSS/JS.
2. **Platform Terms:** Cloudflare Pages Free permits commercial projects, offers unlimited bandwidth, and 500 builds/month at ₹0 INR cost.
3. **Execution Command:** `npx wrangler pages deploy dist` or connecting the repository directly to Cloudflare Pages.

---

## 5. Decommissioned Vercel Artifact Disambiguation

- The former Vercel project `masher2/stackpilot-ai` was deleted by the owner on 2026-10-31 (confirmed HTTP 404).
- **Historical Commit Statuses:** Historical failed Vercel commit statuses (e.g. rate limit notifications on older commits `2f312c3`, `be2c6f2`) must NOT be interpreted as active deployment failures.
- **Rule:** Only status checks on *new, exact PR commit SHAs* indicate active CI status.
- **Defense-in-Depth:** Root `vercel.json` is preserved with `X-Robots-Tag: noindex, nofollow, noarchive`. Agents must never recreate Vercel projects or spend funds on Vercel.

---

## 6. Post-Incident Review Protocol

Following resolution of any SEV-1 or SEV-2 incident:
1. **Log Preservation:** Export Netlify deploy logs and GitHub Actions run logs.
2. **Root Cause Analysis (RCA):** File a dated RCA report in `docs/incidents/YYYY-MM-DD-rca.md`.
3. **Test-Driven Defense (TDD):**
   - Write a regression test verifying the failure mode (RED state).
   - Implement minimal remediation (GREEN state).
   - Verify all tests pass without regressions.
4. **Preflight Guard Hardening:** If applicable, add a static guard check to `scripts/release-preflight.mjs` or `tests/prelaunch-guards.test.mjs` to make the failure mode physically impossible in future builds.
