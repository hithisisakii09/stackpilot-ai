# StackPilot AI — Production Rollback & Incident Playbook

**Document date:** 2026-11-03 (Asia/Kolkata)  
**Status:** Preparation only; no rollback or production action is authorized  
**Scope:** Incident triage, protected-preview containment, provider rollback planning, and Git recovery  
**Binding controls:** ₹0 spend; no direct changes to `main`; draft PR #1 stays open and unmerged

> [!CAUTION]
> This is a runbook, not permission to act. Any action that changes production visibility, publishes a deploy, changes hosting access controls, alters DNS, or modifies `main` requires separate explicit owner approval. Agents must not perform these actions autonomously. Do not assume a rollback is instantaneous or that a provider UI label is unchanged.

---

## 1. Incident severity and response targets

These are internal triage targets, not contractual SLAs or 24/7 support commitments.

| Severity | Definition | Examples | Internal response target |
| --- | --- | --- | --- |
| **SEV-1 — Critical** | Suspected security/privacy incident, unauthorized public exposure, malicious code, or complete service outage | Private preview unexpectedly public, credential exposure, unexpected third-party data transmission, compromised release | Triage immediately when detected; notify the owner and preserve evidence |
| **SEV-2 — Major** | A core buyer journey is unusable or material content is wrong | Recommendation flow fails, comparison is materially misleading, calculator exports incorrect values, core routes return errors | Triage during the next active operating window; prioritize containment and reproducibility |
| **SEV-3 — Minor** | Non-blocking usability, content, or visual defect | Cosmetic mobile issue, typo, non-critical stale footnote | Add to the reviewed backlog and fix in a normal sprint |

Do not promise response times to users or customers based on this internal table.

## 2. First-response checklist

For every suspected incident:

1. Record detection time, reporter, affected URL/route, environment (local, preview, or production), observed behavior, and exact Git SHA if known.
2. Preserve relevant GitHub Actions run URLs, deploy identifiers, logs, screenshots, and error messages. Do not delete or overwrite evidence.
3. Determine whether the issue is limited to a local workspace, the private Netlify Deploy Preview, or an actual production deployment.
4. Check whether the reported SHA is the current PR head and whether the affected deployment actually serves that SHA. A green CI run or deploy-preview status is not proof of the currently served application code.
5. Keep the release fail-closed. Do not merge the draft PR, enable indexing, activate affiliates, spend money, or publish a new deploy as part of routine triage.
6. If credentials are genuinely exposed, the owner should revoke/rotate them through the relevant provider and review audit logs. Never paste credentials, tokens, cookies, or secrets into chat or commit them to the repository.

## 3. Containment and rollback decision

### 3.1 Private preview incident

If the issue is confined to the private preview:

- Keep the preview non-public and noindex.
- Record the preview deploy ID, source SHA, and the exact failing route.
- The owner may choose to restrict or disable the affected preview using the provider's current documented controls. Verify the current UI and access state before acting; this document does not assume a specific button or setting name.
- Do not alter the existing production target, DNS, repository visibility, or hosting plan.
- Fix the issue on `feature/phase-1-1-recommendation-engine`, run the required checks, and retain PR #1 as draft.

### 3.2 Production incident — owner-only action

A production rollback is permitted only after the owner explicitly authorizes the specific action.

Before the owner chooses a previous Netlify deploy:

1. Confirm that a public production deployment actually exists and identify its exact site, domain, deploy ID, and served SHA.
2. Identify the last known-good deploy and verify its source SHA, build evidence, and known limitations.
3. Confirm that the target deploy does not reintroduce a known security issue, stale or unapproved vendor claims, or an unsafe indexing state.
4. Confirm that the owner intends to publish that deploy and understands the visibility impact.
5. Use the provider's current documented rollback/publish procedure. Do not rely on a promised duration or assume that the action is atomic.
6. Verify the resulting served SHA, HTTP behavior, access controls, robots/noindex behavior, and core user journeys. Record the evidence.

**Never publish a deploy from the dashboard merely to test it.** The existing preview is not the same as public production, and a provider's “publish” action can change public visibility.

### 3.3 Git recovery — feature branch only

If a bad change exists only on the unmerged draft PR:

- Keep `main` untouched.
- Work only on `feature/phase-1-1-recommendation-engine`.
- Inspect `git status`, branch divergence, current HEAD, and the exact faulty commit before editing.
- Preserve all uncommitted user changes. Do not run `git reset --hard`, `git clean`, force-push, or blind branch synchronization.
- Prefer a normal revert commit for a confirmed bad commit, or a minimal corrective commit when reverting would remove unrelated valid work.
- Run tests, validation, build, release preflight, and browser acceptance; review the diff before pushing the feature branch.
- Keep PR #1 draft and unmerged until the owner separately approves a merge.

Example only, after confirming a clean working tree and the exact target commit:

```bash
git switch feature/phase-1-1-recommendation-engine
git status --short --branch
git log --oneline -8
git revert <confirmed-bad-commit-sha>
npm test
npm run release:preflight
git diff --check
git push origin feature/phase-1-1-recommendation-engine
```

If the working tree is dirty, the branch has diverged, or the revert conflicts, stop and preserve the state for review. Do not improvise destructive recovery commands.

**Prohibited:** `git checkout main`, `git pull origin main` as part of an automated rollback, `git push origin main`, merging PR #1, or force-pushing any branch. Any future change to `main` requires a separate explicit owner decision and is outside this runbook.

## 4. Emergency access lockdown

If a private preview becomes unexpectedly public or sensitive information is exposed:

1. Notify the owner and preserve evidence immediately.
2. The owner decides whether to restrict or disable the affected site using the provider's current documented access-control or incident process.
3. Verify anonymously that the affected content is no longer accessible; do not infer this from a dashboard label alone.
4. Review the repository, deploy artifacts, build logs, and network evidence to identify the exposed material.
5. If a custom domain is ever added in a separately approved future phase, DNS changes are an owner-only last resort after confirming current records and a recovery plan. No domain or DNS change is authorized by this playbook.
6. Do not create a new host, paid service, or external fallback as an emergency workaround without owner approval.

## 5. Post-incident review and evidence preservation

After containment:

1. Record a timeline, affected SHA/deploy ID, impact, detection source, containment action, and verification evidence in `docs/incidents/YYYY-MM-DD-rca.md`.
2. Separate confirmed facts from hypotheses; do not claim user impact, data exposure, or recovery unless evidence supports it.
3. Identify the smallest reproducible failure and write a regression test before the fix where practical (Superpowers RED → GREEN → REFACTOR discipline).
4. Implement the minimal fix on the feature branch, obtain independent review, and run the full CI/browser suite.
5. Update the relevant prelaunch guard, monitoring checklist, and runbook so the same failure mode is less likely to recur.
6. Record any owner-only action separately. Never fabricate approval, incident closure, or a successful production rollback.

---

**Current operating decision:** This runbook authorizes no production publishing, Netlify setting changes, DNS changes, main-branch changes, paid services, or public release. The private preview and draft PR workflow remain in force.
