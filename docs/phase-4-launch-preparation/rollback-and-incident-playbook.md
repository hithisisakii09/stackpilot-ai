# StackPilot AI — Phase 4 Production Rollback & Incident Playbook

**Document Date:** 2026-11-03 (Asia/Kolkata)  
**Status:** OPERATIONAL RESILIENCE PLAN / PREPARATION ONLY  
**Scope:** Production emergency rollback, Netlify deployment management, and git reversion.

---

## 1. Incident Severity Classification

| Severity Level | Definition | Examples | SLA / Response Target |
| --- | --- | --- | --- |
| **SEV-1 (Critical)** | Security breach, private data exposure, unauthorized affiliate tracking, broken CSP, complete site outage | Unintended affiliate ID injection, CSP failing to block malicious remote script, data leaking to external domain | Immediate (< 15 minutes) |
| **SEV-2 (Major)** | Core buyer journey failure, calculator / worksheet logic crash, 404 on high-intent routes | Broken comparison matrix, calculator exporting corrupt CSV, broken navigation | Within 2 hours |
| **SEV-3 (Minor)** | Visual defect, minor copy typo, non-blocking CSS cosmetic issue | Minor padding misalignment on mobile, outdated pricing footnote | Next business day / routine sprint |

---

## 2. Emergency Rollback Procedures (SEV-1 / SEV-2)

### 2.1 Netlify Instant Rollback (Fastest — < 2 minutes)
Because Netlify stores all historical immutable deploy builds:
1. Owner opens **Netlify Dashboard** → `Masher / StackPilot` site → **Deploys**.
2. Identify the last known good deploy SHA.
3. Click on the deploy entry.
4. Click **Publish deploy**.
5. Netlify updates the CDN edge routing immediately (instantaneous atomic switch).
6. Verify live production domain returns HTTP 200 with the previous stable SHA.

### 2.2 Git Revert Procedure (Permanent Audit Trail)
To keep git history aligned with production:
```bash
# 1. Checkout main branch
git checkout main
git pull origin main

# 2. Revert the problematic commit
git revert <bad-commit-sha> -m 1  # if merge commit, or standard git revert for single commit

# 3. Verify all tests pass locally
node --test tests/*.test.mjs
node scripts/validate.mjs
node scripts/release-preflight.mjs

# 4. Push revert commit to main
git push origin main
```
5. Netlify will detect the new commit on `main` and build the clean reverted state.

### 2.3 Emergency Fail-Closed Lockdown (Site Disable)
If an active zero-day vulnerability or major data breach occurs:
1. **Option A (Netlify UI):** In Netlify Site Configuration → **Danger Zone** → Click **Stop publishing** or set Site Access to **Password Protected / Restricted**.
2. **Option B (DNS Level):** Change custom domain DNS CNAME to point to a static fallback error page or remove the DNS record temporarily.

---

## 3. Post-Incident Review & Evidence Preservation

Following any rollback:
1. **Preserve Logs:** Export Netlify deploy logs, function/edge logs (if any), and GitHub Actions workflow run logs.
2. **Tag Incident SHA:** Tag the faulty commit in Git for auditing (`git tag incident-YYYY-MM-DD-<sha>`).
3. **Root Cause Analysis (RCA):**
   - Document root cause in `docs/incidents/YYYY-MM-DD-rca.md`.
   - Write a regression test using Superpowers TDD discipline (RED state verifying the bug).
   - Implement minimal fix (GREEN state) with peer code review.
4. **Update Safety Guards:** Enhance `scripts/release-preflight.mjs` or `tests/prelaunch-guards.test.mjs` to permanently block the class of defect from recurring.
