# Bounded local scheduling and observability

## Disposable entry and role selection

`openLocalScheduler(config,{enabledRoles})` and `openLocalObservability(config)` require `stackpilot_scheduler_test`, matching `STACKPILOT_TEST_DB`, `STACKPILOT_SCHEDULER_TEST=1` and the verified loopback cluster marker. The scheduler also uses the existing runner test gate. Actual transactions use restricted `stackpilot_app` and forced RLS. These entry points are available only in the approved disposable harness. Importing modules performs no database, timer or worker activity.

Role selection defaults to an empty list for every scheduler instance. Registration, resume and later ticks require explicit role selection in that instance. `listRoleDispatches()` returns the 41 immutable disabled role descriptions mapped to research-intake, analysis-editorial-proposal and engineering-verification. Explicit test selection allows only fixed local summary/digest handlers. Outputs carry role/pipeline and unapproved review state. Immutable role ceilings narrow execution to one live task per role/tenant, five claims per role invocation, two attempts, 30000ms worker timeout and 16384 output bytes. Commercial/publication/merge/spend authority remains DENY under existing policy.

## Schedule contract

`scheduler.scope(organizationId)` is a developer fixture scope. Operations include:

- `register({id,roleId,anchorMs,cadenceMs,items})` creates a paused job and immutable definition/input. An identical registration is idempotent and changed input conflicts.
- `resume(id)` selects active scheduling for an enabled fixture role. `pause(id)` prevents future enqueues. `cancel(id)` is terminal and also cancels the outstanding execution.
- `tick({window:{fromMs,toMs},maxJobs?,maxDurationMs?,run?,maxTasks?,maxConcurrent?})` processes a bounded historical half-open window. By default it enqueues only. Explicit run mode invokes existing fixed workers within the remaining invocation budget.

Cadence is 60000–86400000ms. Windows are at most 300000ms, with database-clock future-window rejection. Due evaluation uses anchor + integer multiples of cadence, coalescing missed occurrences to the latest eligible occurrence inside the window. A job has at most one outstanding execution. Explicit run ticks resume that execution after partial work or process restart, using the same ID and counting only newly claimed attempts. Jobs outside the window do not consume the eligible job limit. Default maximum jobs is 20. Enqueue, idempotency effect, audit/outbox and schedule cursor advancement share the same transaction, row lock and tenant advisory lock. Duplicate/concurrent/restarted ticks cannot enqueue the same occurrence twice. Cursor advancement follows successful enqueue only. Database-clock checks before and after enqueue writes roll back a transaction that exhausts its tick budget.

Tick scheduling budget is at most five minutes. Execution uses at most two workers and twenty claims per tick, with the existing three-attempt ceiling. Worker termination and bounded database cleanup complete before invocation returns, adding documented scheduling/cleanup overhead. No scheduler timer or daemon survives a tick. Limits apply per invocation/process and tenant as documented in Phase 2A, rather than a host-wide quota.

Original `scheduled_jobs.enabled=false` and zero-cost constraints remain enforced. Migration 5 adds separate `local_state`, `next_due_ms` and `last_execution_id` columns. Only these local-state columns gain app UPDATE privileges. Local fixture activation supplies no production permission.

## Local outbox observation and telemetry

`observability.scope(organizationId)` provides:

- `consume({limit})` locks at most 100 unobserved rows and atomically records deterministic local observations. A failed batch rolls back all observations. Repeat consumption returns only unobserved rows. Source status, kind, payload and audit links remain immutable. There are no caller callbacks or network delivery.
- `page({table,limit,cursor})` reads bounded metadata from outbox_events, agent_executions, task_attempts or audit_events. Private payloads and raw diagnostics are omitted. Fixed failure classifications describe only the returned page.
- `retentionPreview({table,olderThanMs,limit,cursor})` reads one bounded age-filtered page with dryRun=true and deletionEnabled=false. Audit records are marked protected. Approval tables have no exposed query/deletion operation.

Keyset cursors bind tenant/table/version and database timestamp/id order. Timestamp text preserves six fractional digits. Pagination reads current committed state and is not a frozen cross-page snapshot. Outbox consumption selects unobserved rows independently of telemetry cursors, so an event that commits behind a prior cursor remains consumable.

Migration 5 adds observed_at/observation fields without changing original pending status/payload constraints. The missing agent_executions table records role preparation completions atomically with existing output/audit/outbox writes. Rows are append-only for the app role and bind the exact tenant, execution, task and attempt. Existing migrations 1–4 remain unchanged and default migration target remains 1.

## Validation and operational gates

Use the full existing test harness, new pure/integration tests, source/export guards, fresh Astro build/preflight and exact-SHA Linux Chromium/axe CI. The browser suite covers the static buyer application. Scheduler/observability acceptance uses actual PostgreSQL, fixed worker threads and disposable process fixtures.

Real owner trust/TLS/database provisioning and authenticated owner browser acceptance remain owner actions. This sprint adds no hosted service or owner setup. A scoped normal development push and existing non-deploying CI dispatch are authorized. Reports from earlier phases remain byte-for-byte preserved, and the new checkpoint remains local/uncommitted to retain the exact tested HEAD.
