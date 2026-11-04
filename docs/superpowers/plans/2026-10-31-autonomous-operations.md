# Autonomous Operations Controller Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use Superpowers test-driven-development and verification-before-completion; use gstack engineering review and QA.

**Goal:** Enable unattended, auditable StackPilot daily decisions and monitoring without bypassing editorial, commercial, security or publishing gates.

**Architecture:** A pure decision engine converts static catalog/research/readiness signals into allowed automated tasks, priority, and a blocked-revenue/publication status. GitHub CI generates a machine-readable operations report. ChatGPT's scheduled operator and incident watch run outside the repo, while developer agents use these guardrails; GitHub Copilot Automations may be enabled separately when eligible. No tokens or third-party API calls required.

**Tech Stack:** Node.js 22, Astro 7, JSON configuration, GitHub Actions (read-only).

**Spec:** `AGENTS.md`, `docs/roadmap-to-launch.md`.

## Global constraints
- Keep `main` unchanged, draft PR unmerged and all public launch/affiliate/financial actions disabled.
- Safe automated scope: read-only research reports, classify blockers, suggest developer tasks, create branch-only fixes with tests and draft PRs where authorized.
- No false statements about having human-reviewed claims or commercial revenue.
- External spending capped at $0 until owner-approved payment and operational budget.
- A scheduled workflow defined on a feature branch **will not receive GitHub `schedule` events** until merged to the repository's default branch; rely on explicitly created ChatGPT scheduled tasks for now.

## Review focus
1. Malformed or absent readiness flags must fail closed.
2. Passing CI must not imply permission to publish.
3. No partner approval must block affiliate activation.
4. Unknown hosting commercial entitlements must block monetization.
5. A project with no research evidence should receive a research task rather than made-up editorial approval.

### Task 1: Pure decision model

**Files:** Create `tests/autonomy-policy.test.mjs` and `src/lib/autonomy-policy.mjs`.

**Interface:** `decideAutonomousActions(input)` -> `{mode, canPublish, canMonetize, tasks, blockers}`.

- [ ] Write tests for failures and allowed work.
- [ ] Run test first and confirm expected RED.
- [ ] Implement a pure no-side-effect model and run test GREEN.
- [ ] Verify full `npm test` and no regression.

### Task 2: Operational report

**Files:** Create `scripts/ops-report.mjs`, modify `package.json`; create `docs/autonomous-business.md`.

- [ ] Read the current catalog and evidence queue without network calls.
- [ ] Print a JSON/console report with required approvals and next autonomous actions.
- [ ] Validate output in CI and add a GitHub Actions read-only report artifact workflow callable by dispatch and PRs.
- [ ] Distinguish work that can be automated today from user/account permissions required for revenue.

### Task 3: Final QA and review
- [ ] Verify read-only CI, no secret exposure and no unintended publishing.
- [ ] Document actual operational limits, hosting constraints and owner approval gates.
- [ ] Update draft PR, verify latest commit's tests and protected preview state.
