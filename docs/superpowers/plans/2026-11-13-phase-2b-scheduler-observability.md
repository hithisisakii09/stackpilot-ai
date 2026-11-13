# Phase 2B bounded local scheduler and observability

Verified base `68f10055c1a55515715b64bee62c4b44005b2c27`, successful CI 43451735704, credential-free origin and GCM manager. New branch `feature/phase-2b-scheduler-observability-2026-11-13`. Sixteen existing untracked files are SHA-256 inventoried for byte-for-byte preservation. Main/PR heads match owner expectations.

## Design

Use an explicitly selected disposable scheduler database and existing restricted app role/RLS. Reuse Phase 2A transactions, worker isolation, fencing and deterministic local effects. A scheduler tick processes at most 20 jobs and a five-minute due window, with minimum cadence 60 seconds. Coalesce overdue occurrences to the latest due occurrence inside the supplied historical window. Enqueue and advance the job cursor in the same locked transaction using stable job/occurrence keys. Pause/cancel serialize with enqueue. No timers survive tick completion. Explicit run budgets retain two workers, twenty claims, three attempts and five minutes; tick enqueues by default, with bounded execution available explicitly.

Migration 5 adds local schedule state/cursor fields while preserving enabled=false, plus outbox observation fields while preserving immutable event payload/status. Add the missing agent_executions append-only preparation table with scoped task/attempt foreign keys, RLS, indexes and a Drizzle representation. Existing migrations/checksums remain byte-identical. Unknown target becomes 6.

The outbox consumer records a deterministic local observation exactly once per row, in one transaction, without user callbacks or external delivery. Concurrent consumers use row locks and skip locked rows. Pagination uses a scoped typed timestamp/id keyset cursor preserving database microseconds. Telemetry emits bounded metadata and fixed failure classifications, not private event payloads. Retention preview returns one bounded page and performs no deletes, including for protected audit records.

Map all 41 immutable registry roles into the three named preparation pipelines. Explicit fixture selection allows deterministic role-labelled summary work only. Protected actions remain denied and the registry remains disabled. Completion appends an agent execution observation atomically with the existing effect/audit/outbox. Synthetic faults stay in the original test path.

## Test-first sequence

1. Pure RED for due-window boundaries, cadence/bounds, all-role mapping/default denial, export leaks. Implement minimum validators/guards.
2. Real PostgreSQL RED for target 5 and scoped scheduler factory. Implement canonical migration and transactional enqueue integration. Test concurrent ticks, retry/restart deduplication, rollback, pause/cancel, foreign scope and deadlines.
3. Real outbox replay/concurrency/rollback, stable cursor traversal, failure summaries, read-only retention and role worker tests. Retain all Phase 2A regressions.
4. Independent read-only review of tenant isolation, clocks/leases, replay and cleanup. Regression RED/GREEN for findings. Full local test/data/fresh-build/preflight, normal scoped push, completed exact-SHA Linux Chromium/axe CI and zero-deployment inspection. Local checkpoint remains uncommitted.

Files include requested scheduler/observability/role-dispatch modules, shared pure schedule contract and disposable store adapter, runner/worker integration, migration generator/SQL/manifest, harness, tests, export guard, interface guide and checkpoint. No real owner provisioning, hosting, PR mutation, spending or Phase 3.

## Methodology sources

Apply public gstack [plan-eng-review](https://github.com/garrytan/gstack/blob/main/plan-eng-review/SKILL.md), [review](https://github.com/garrytan/gstack/blob/main/review/SKILL.md), [qa](https://github.com/garrytan/gstack/blob/main/qa/SKILL.md), [ship](https://github.com/garrytan/gstack/blob/main/ship/SKILL.md), [investigate](https://github.com/garrytan/gstack/blob/main/investigate/SKILL.md) and Superpowers [writing-plans](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md), [TDD](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md), [debugging](https://github.com/obra/superpowers/blob/main/skills/systematic-debugging/SKILL.md), [verification](https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md), [independent review](https://github.com/obra/superpowers/blob/main/skills/requesting-code-review/SKILL.md) manually. Current public sources read this sprint, without installing scripts/hooks/telemetry. Owner explicitly authorizes isolated tests, development push and existing non-deploying workflow dispatch.
