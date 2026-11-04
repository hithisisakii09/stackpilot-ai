# Phase 2.5 — Autonomous Research Action Queue Implementation Plan

> **For agentic workers:** Use Superpowers test-driven-development and verification-before-completion plus gstack engineering review and QA. Upstream skill documents are references; do not claim their external CLI is installed.

**Goal:** Give StackPilot's existing daily operator a deterministic, auditable list of the most valuable, allowed next tasks from existing evidence and affiliate-source gaps.

**Architecture:** A pure local module converts the *existing* editorial evidence and affiliate candidate queues into a sorted, typed work queue. It explicitly distinguishes automatic draft/research work from owner approval gates; it never makes a real-world decision or invokes APIs. A read-only CLI and operations artifact expose the queue for scheduled agents.

**Tech Stack:** Node 22.23.4, built-in test runner, Astro static, existing GitHub Actions. Zero new dependencies, no paid services.

**Spec:** AGENTS.md; docs/autonomous-business.md; docs/affiliate-monetization-readiness.md; config/operating-policy.json.

## Global constraints
- Owner monthly cash and delegated budgets remain ₹0; Netlify production and previews stay Private; auto publishing remains Locked; no main merge, public launch, tracking links or contract acceptance.
- All existing vendor claims remain unreviewed; program candidates remain unapplied; actual earnings are unknown.
- Source dates reflect recorded intake only, not verified page contents.
- The task queue is a planning/reporting mechanism, NOT a background worker or permission to publish.

## Engineering review / failure cases
1. Future/invalid reference dates fail validation rather than hiding stale sources.
2. Missing vendor evidence produces a research task, never a fictional review approval.
3. Source age threshold (90 days) creates an explicit refresh action without treating intake age as source truth.
4. Duplicate product IDs and unknown affiliate programs are rejected, not silently merged.
5. Owner-only gates cannot be emitted as autonomously executable tasks.
6. No commission amount, tracked link, invented rank, or fake revenue appears in the queue.

## Task 1: Test-first pure queue model
**Files:** Create tests/operating-backlog.test.mjs, src/lib/operating-backlog.mjs.
**Interface:** buildOperatingBacklog({products,evidenceLeads,affiliateCandidates,policy,today,staleAfterDays?}) -> {asOf,mode,automatic,ownerGates,metrics}; task objects {id,productId,priority,action,reason,autonomy,sourceIds}.
- [ ] Write behavior tests first including stale/missing/malformed and immutable inputs.
- [ ] Watch CI RED due to missing implementation.
- [ ] Implement pure deterministic priority ordering, strictly safe action allow-list, no side effects.
- [ ] Verify GREEN.

## Task 2: Read-only CLI and CI evidence
**Files:** Create scripts/operating-backlog.mjs; tests/operating-backlog-cli.test.mjs; modify scripts/ops-report.mjs, package.json, .github/workflows/agent-ops.yml.
- [ ] `npm run ops:backlog -- --json` emits validated non-sensitive JSON.
- [ ] `ops:report` displays queue summary and retains all launch gates false.
- [ ] Existing read-only GitHub PR ops workflow writes 7-day `artifacts/ops/backlog.json` and uploads it with operations report.
- [ ] Test workflow has no write permissions or deployment, partner enrollment, payments, or publishing commands.

## Task 3: Handoff
- [ ] Verify exact HEAD Node suite, static build, browser QA, operations workflow and private Netlify Deploy Preview.
- [ ] Update draft PR and scheduled operator's task description to consume `ops:backlog` at next permitted run.
- [ ] Do not touch production or make unsupported monetization claims.
