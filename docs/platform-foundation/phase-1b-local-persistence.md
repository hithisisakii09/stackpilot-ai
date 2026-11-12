# Phase 1B local persistence interfaces

The persistence layer uses PostgreSQL with Drizzle and node-postgres. The static Astro app continues to read its versioned JSON catalog. Database operations require explicit local configuration.

## Runtime and dependency setup

Pinned dependencies are drizzle-orm 0.45.4 and pg 8.23.1. The owner approved both packages and disposable local tests with lifecycle scripts disabled. The lockfile pins integrity hashes. Existing dependency versions were retained. The added packages declare no installation hooks.

Local validation uses the existing Codex Node 24.22.1 runtime with npm 10.9.9 and PostgreSQL 18.6. The harness also accepts PostgreSQL 16, which is preinstalled as 16.15 on the reviewed Ubuntu CI image. It prints the selected version and creates a separate loopback-only cluster. Set `STACKPILOT_PG_BIN` to an approved PostgreSQL bin directory if needed. Missing or unsupported binaries fail the integration check.

```powershell
$env:PATH = "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;$env:PATH"
& "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" test
```

`npm test` runs the original Node suite, the disposable database suite, data validation, Astro build, build smoke and release preflight. `npm run test:persistence` runs the database suite alone. `npm run build` remains available without a running database.

## Schema and migrations

`src/platform/persistence/schema.mjs` defines 47 domain tables as Drizzle objects from immutable reviewed metadata. Its deterministic DDL matches `migrations/0001_platform_foundation.sql`. The manifest pins canonical LF SQL bytes. CRLF checkout conversion is accepted. Other byte changes, schema drift, altered checksums or unknown migration history fail validation.

The SQL includes tenant composite keys and references, indexed foreign-key columns, forced row-level security, constrained states and amounts, zero execution cost, candidate-only product/claim data, null affiliate URLs, disabled agents/schedules and pending approval requests. Evidence links include the product in both foreign keys. Commission statements are bound to their programme. Actual commission rows require a statement reference.

`applyMigrations(pool)` uses a checked-out administrator client, a transaction and an advisory lock. The ledger update commits with the DDL. Reapplication is a no-op. Drift fails closed. A failed migration rolls back its new objects and ledger entry. Application-role approval decisions and audit mutation are denied by PostgreSQL privileges.

`STACKPILOT_LOCAL_DATABASE` must contain an explicit JSON object with `host`, `port`, `user`, `database` and `clusterId`. Host must be `127.0.0.1`. Database names must use the `stackpilot_` prefix. User must be the dedicated local migration or application role. The connection verifies database, role and the owner-configured `stackpilot.cluster_id` server marker before returning a pool. Administrator configuration is accepted only for explicit migration/maintenance operations. The application pool rejects elevated or inherited roles.

The marker prevents accidental selection of another local instance. Authentication and server/session authorization still belong to Phase 1C. Operators must select an owned dedicated cluster. Existing project services and databases are outside the test harness.

The migration CLI requires `npm run db:migrate -- --apply` plus verified local administrator configuration. Candidate intake provides a connection-free preview through `npm run db:import-candidates -- --dry-run`. Applying a candidate import requires `--apply --organization <id> --actor <id> --request <id>` and the application role configuration. The organization must already exist through the scoped identity repository. CLI failures emit generic messages.

## Transactions and repositories

`createStore(pool).transaction({organizationId,actorId,requestId}, callback)` exposes identity, agent, workflow/task, evidence, pending-approval and audit repositories. Input IDs are validated. Repository queries are parameterized and scoped to the organization. Phase 1C must derive this internal context from a trusted session.

Every mutation appends an audit row and outbox event in the same transaction. Agent updates validate a narrowing configuration through the Phase 1A registry and compare the expected version. Concurrent writes with the same expected version produce one successful update. Prior and new definitions are retained in audit data. Agents stay disabled.

Repository handles and Drizzle query builders expire at callback completion. Unfinished operations cause rollback. Pending operations drain before connection release. Failed rollback discards an uncertain client. Error messages retain a generic description and optional PostgreSQL error code while excluding the original query/detail values.

Workflow records remain queued preparation data. Execution, retry scheduling, human approval decisions, authenticated identity and runtime lifecycle transitions require their later scoped phases.

## Candidate import

`prepareCandidateImport` reuses existing catalog, evidence-lead and research-claim validators. It rejects unapproved verification flags and affiliate URLs. It produces deterministic product/vendor/category/source/claim links with stable product IDs and a source-data digest. A source digest represents recorded candidate metadata. It does not establish fetched page content or source authenticity.

`importCandidates` supports dry-run and an organization-scoped idempotency key. Concurrent identical imports serialize through a transaction lock and create one batch. Changed source data under the same key is rejected for review. Six current products and six claims remain unapproved. The current dataset contains eleven distinct candidate source URLs scoped to products. No JSON catalog cutover occurs.

## Recovery and retention

The integration harness verifies `pg_dump` custom-format backup and `pg_restore` into a second isolated database. It compares product, claim, audit and outbox counts, verifies unapproved claims and checks forced RLS. The synthetic dump and owned cluster are removed after the server stops. The harness validates resolved cleanup paths and ownership markers first.

For a future persistent local installation, keep encrypted dumps outside Git and retain the decryption key in owner-controlled secure storage. Record the schema version and checksum with the backup. Restore into a fresh owned database, rerun migration verification and compare counts/constraints before an approved connection change. Prefer a forward migration or restore recovery over a destructive down migration. Production RPO/RTO and legal retention rules require owner review. Retention jobs remain disabled in this phase.

All current tests use synthetic records and the existing public-vendor candidate data. Spending, approval, publishing and affiliate gates remain enforced.
