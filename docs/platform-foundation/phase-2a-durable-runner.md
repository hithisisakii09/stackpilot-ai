# Synthetic durable runner

Phase 2A provides developer acceptance infrastructure, not an operational agent service. Imports do not open a database or start a worker. There is no HTTP start endpoint, scheduler, network/LLM adapter, shell handler or business-agent activation. The general permission evaluator remains DENY. An approved claim is not an execution grant.

## Explicit disposable gate

`openSyntheticRunner(config)` accepts only the approved harness selection: exact `stackpilot_runner_test` database, loopback verified cluster, `stackpilot_local` fixture configuration matching `STACKPILOT_TEST_DB`, `STACKPILOT_RUNNER_TEST=1`, and matching server-side `stackpilot.runner_fixture`. Actual runner transactions use the restricted `stackpilot_app` connection and forced RLS. The OS/developer harness is trusted; these markers do not authenticate a real owner. Do not set them on a real database to bypass provisioning.

The existing disposable harness creates the database and marker and removes its owned cluster after tests. Real owner trust, TLS, database login and authenticated browser acceptance remain separate gates. No persistent worker is provisioned.

## Scoped API

`runner.scope(organizationId)` is a synthetic developer scope, not authenticated identity. It exposes:

- `enqueue({key, templateId:'synthetic-preparation-v1', input:{items,scenario,delayMs}, costInr:0})` → execution ID. Exact repeat returns the same execution; changed input conflicts. Tenant scopes are separate.
- `claim(executionId, {leaseMs?})` → opaque random attempt identity, monotonic attempt number and bounded fixed work, or null.
- `complete(lease, output)` / `fail(lease, fixedCode)` → fenced atomic state changes.
- `recover(executionId)` → database-clock expiry recovery with bounded attempts.
- `inspect(executionId)` → bounded status metadata.
- `cancel(executionId)` → durable cancellation, fencing future completion.
- `run(executionId, {maxConcurrent?,maxTasks?,maxDurationMs?,taskTimeoutMs?})` → bounded invocation and final status.

`runner.close()` terminates/awaits its workers and ends its pool. Tests use a separate process fixture to model process loss around commits. No business CLI is enabled.

## Persistence and resource contract

Reuse foundation workflow/version/execution/task/dependency/attempt/idempotency/audit/outbox tables. Migration 4 only adds column UPDATE privileges for execution status; task status/retries/lease_until; attempt status/output. Definition, input, dependency and idempotency records retain INSERT/SELECT-only app grants. Migrations 1–3 and their checksums are unchanged; default migration target remains 1. Explicit migration target 4 is supported.

The allowlisted frozen three-task DAG has two independent summary steps and one combined digest step. Definitions are compared using recursively canonical JSON; task structure and tenant-local dependencies are checked before execution. Synthetic input bounds are 100 integers between -10000 and 10000, at least one input, fault scenario allowlist and delay up to 2000ms. Synthetic fault scenarios support transient/permanent errors, malformed output and a CPU-bound hang. They are fixture behavior, not business capability.

Database-local effects use stable tenant/task IDs and deterministic validated outputs. Effect insertion, attempt/task completion and audit/outbox are one transaction. The random attempt ID and monotonic attempt number must match a live, unexpired task; expiry is rechecked after completion-event writes. Stale workers cannot commit after recovery. A crash after commit preserves the completed effect; a crash before commit rolls back or leaves a recoverable lease. This provides idempotent local effects under the documented transaction boundary, not exactly-once external effects.

Per-tenant transaction advisory locks serialize state transitions. Two live leases per tenant are allowed across invocations/processes. One runner invocation per Node process permits at most two worker threads; limits do not represent a cluster-wide CPU quota across different tenants/processes. At most 20 attempts are claimed per invocation, three attempts per task; invocation scheduling deadline is at most 300000ms. Individual worker deadline is at most 30000ms and never exceeds the remaining invocation budget. Worker termination and bounded database cleanup must finish before returning; OS scheduling and transaction cleanup add overhead beyond a nominal deadline. No new task starts after the deadline.

Workers load only a fixed module and pure handlers, receive detached bounded data, no database handles and an empty environment, and use a 16MiB old/4MiB young heap and 1MiB stack limit. Threads are trusted-code isolation and cancellation tools, not a security sandbox for arbitrary JavaScript. Parent output validation is independent of worker success messages. CPU-bound hangs are terminated and exit is awaited. Cancellation is observed by polling and completion checks, with no subsequent committed effect.

Retry codes are fixed and sanitized. Only transient errors retry, with 50/100ms backoff and at most three attempts. Expired leases recover within the same attempt cap. Permanent/timeout/invalid-output/worker errors fail the task; descendants become BLOCKED. Completed outputs remain committed. No arbitrary exception strings or untrusted payloads enter persisted diagnostics.

Astro remains static. Fresh-dist preflight rejects runner module paths and known execution/lease/attempt fields, supplementing existing research/control leakage checks. This is targeted protection, not a comprehensive encoded-secret scanner.
