# Phase 2A: synthetic durable runner

Starting branch/HEAD verified at `feature/phase-1c-local-identity-approvals-2026-11-12` / `3d1cc31bc5f7dcebb327ec6984049277b28be239`; remote matches; prior CI 43409944691 succeeded. PR #8 remains draft at `29573f0142b2019ba11593569c6d080a5d052c71`, base `1672461bea5fa09e01965c5e8bdd4819852b06fd`; seven pending PRs untouched. Origin credential-free, helper manager. Preserve untracked reports.

## Design and trust boundary

Build only a synthetic developer capability, gated by the disposable harness environment, exact runner database and custom cluster marker. This is an OS/developer test gate, not user authentication. No operational start endpoint, scheduler, business-agent enabling, general permission changes or approval-to-execution bridge. Private data never enters Astro.

Reuse workflow definitions/versions/executions, tasks/dependencies/attempts, idempotency keys and audit/outbox. Migration 4 grants only required execution status/attempt/output/lease column updates; prior SQL/checksums remain untouched. Definitions, inputs and idempotency records remain INSERT/SELECT-only. Runtime compares persisted immutable definitions and task shape against its fixed allowlist before use.

One frozen three-task preparation DAG: two independent summaries and a dependent combined digest. Inputs are bounded synthetic values, with explicit synthetic fault scenarios for recovery tests. Worker threads run only fixed pure handlers with no database handles or configurable code paths; terminate and await exit on deadline/cancellation. These are resource-isolated trusted handlers, not an untrusted JavaScript sandbox. Parent transaction validates deterministic output, checks live lease/fence, and commits the database-local effect plus completion/audit/outbox atomically. Attempts provide monotonic fences; random attempt IDs prevent caller substitution. Database clock controls leases and bounded retry delay. Per-tenant advisory locks serialize claim/recovery/state transitions; at most two live leases per synthetic tenant, including across processes. No external exactly-once claim.

## Test-first steps

1. Pure tests RED for bounded hostile DAG inputs, cycles/missing/cross-scope dependencies, fixed definition, denied operational mode and static leakage; implement validators/export checks.
2. Integration RED in separate owned database for enqueue/idempotency, dependency ordering, concurrent claims, cross-scope denial and immutable definition validation. Implement narrow migration and transactions.
3. RED for fencing, rollback, retries/blocking, timeout/cancellation and process restart before/after output commit. Implement bounded worker/recovery and run regressions.
4. Independent security review, regressions for findings, full approved-runtime npm test and exact-final-SHA existing Linux Chromium/axe workflow. Inspect logs, symlinks, artifacts and deployment records. No deployment.

Files: `src/platform/orchestration/{dag,runner,handler-worker}.mjs`; persistence runner migration generator/SQL/manifest and target selection; synthetic process fixture and pure/integration tests; harness; targeted static export guard; interface guide and checkpoint.

Limits: 20 tasks/workflow/invocation, concurrency 2, attempts 3, total invocation 300000ms, input/output 8KiB, fixed diagnostics, bounded transaction queries and worker memory. Recovery/inspection address one execution with at most 20 tasks. No global scheduler or unbounded queue scan. Idle lease expiry frees capacity; stale attempts cannot commit. Real owner provisioning/browser acceptance remain separate gates.

## Methods and release gates

Apply current public gstack [plan-eng-review](https://github.com/garrytan/gstack/blob/main/plan-eng-review/SKILL.md), [review](https://github.com/garrytan/gstack/blob/main/review/SKILL.md), [qa](https://github.com/garrytan/gstack/blob/main/qa/SKILL.md), [ship](https://github.com/garrytan/gstack/blob/main/ship/SKILL.md), [investigate](https://github.com/garrytan/gstack/blob/main/investigate/SKILL.md); Superpowers [writing-plans](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md), [TDD](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md), [systematic-debugging](https://github.com/obra/superpowers/blob/main/skills/systematic-debugging/SKILL.md), [verification](https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md), [requesting-code-review](https://github.com/obra/superpowers/blob/main/skills/requesting-code-review/SKILL.md) manually, without installing scripts/hooks or telemetry. User explicitly authorizes implementation, isolated testing, normal development push and existing non-deploying CI dispatch. No PR mutation, protected branch, hosting, spending or later phase. Stop after report.
