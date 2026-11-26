# Phase 1B local relational persistence

Owner authorized progression from Phase 1A and approved pinned drizzle-orm 0.45.4 (Apache-2.0), pg 8.23.1 (MIT), disabled lifecycle scripts, and disposable loopback PostgreSQL tests with existing 18.6 binaries. Base `0c5e07c2b8989876168a325f609335ca1e1f95b5`. Use an isolated development branch and preserve prior untracked reports.

## Scope and design

Implement the planned relational foundation using existing ESM and Node tests. Drizzle schema lives in `src/platform/persistence/schema.mjs` to match the repository runtime and avoid a TypeScript/compiler dependency. A reviewed schema specification defines actual Drizzle pgTable objects and deterministic DDL. The versioned SQL file and pinned checksum must match generated DDL. Real PostgreSQL catalog/behavior tests verify parity and constraints independently of the string comparison.

Cover identity/roles, agent configuration, workflows/tasks/attempts, candidate products/evidence, market/customer/editorial/revenue record structures, approval requests/decisions, audit/outbox, settings and retention structures. Later domain phases supply their intelligence/execution behavior. Current product/claim import stays candidate-only, affiliate URL null, cost INR 0. Application role cannot write approval decisions or mutate audit records. Existing static catalog remains the buyer app's source.

All tenant tables use composite organization/record keys and composite foreign keys. Add constrained states, cost/attempt bounds, unique idempotency keys, indexed relationships and no-self-dependency constraints. Enable and force PostgreSQL RLS, scoped by transaction-local organization context. An unprivileged application role owns no tables and has NOBYPASSRLS. Repository APIs validate identifiers and use parameterized Drizzle queries. Organization context is an internal persistence scope and still requires trusted actor/session binding in Phase 1C.

## Interfaces and files

- `schema.mjs` and schema definition helpers build actual Drizzle tables and deterministic SQL from reviewed static metadata. Use no dynamic user-provided SQL identifiers.
- `migrations/0001_platform_foundation.sql`, `migrations/manifest.json`, `migrate.mjs` provide serialized transactional migration application, checksum/drift refusal and no-op reapplication. Reject unknown/applied-newer histories and transactionally record success. Migration is an explicit owner-selected local database operation.
- `connection.mjs` requires explicit loopback host/port/user/database and rejects implicit environment URL defaults. No hosted service discovery or signup.
- `transaction.mjs` provides `withTransaction` on a single checked-out client, transaction-local tenant context, rollback on errors, bounded timeouts, safe release and atomic audit/outbox writes.
- `repositories.mjs` exposes scoped identity/agent/workflow/evidence/approval-request/audit interfaces. Approval decisions remain unwritable through this release. Every mutation writes an audit event and outbox row in its transaction. No executor, scheduler, approval service or HTTP endpoint.
- `candidate-import.mjs` and `scripts/platform-import-candidates.mjs` validate the existing six JSON candidates and source records, preserve stable slugs/IDs, support dry-run, deterministic source digest, repeat imports and changed-input conflict refusal. Prototype approved data is excluded.
- `scripts/platform-db-test.mjs` and `tests/integration/platform-persistence.test.mjs` create a disposable dedicated cluster, migrate, create restricted app role, execute actual DB tests, dump/restore to an isolated database, stop the owned instance and retain only bounded synthetic artifacts. Existing services/databases are outside the harness.
- Root Node tests validate pure schema/import/connection/migration behavior. `npm run test:persistence` explicitly runs integration tests with the existing PostgreSQL binaries. Existing npm test/build/browser workflows remain intact unless a later scoped CI change is needed and reviewed.

## RED to GREEN and acceptance

1. Install only approved pinned packages with `--ignore-scripts --save-exact`, inspect lockfile and audit result. Use existing supported Node24.22.1/npm10.9.9 locally.
2. Write failing tests for missing persistence behavior. Record missing implementation separately from tooling errors. Build minimal schema/migration/transaction implementation and validate SQL on the isolated local PostgreSQL instance.
3. Prove rollback leaves no partial domain/audit/outbox rows, tenant reads/writes and cross-tenant FKs fail, zero budget/candidate state/affiliate constraints hold, audit mutation and approval-decision insertion fail for app role, duplicate operations/imports remain idempotent under concurrent transactions, checksums prevent drift, and dependency self-edges/duplicates fail.
4. Prove migration idempotency and failure rollback, Drizzle/database column/constraint/index parity, and pg_dump/pg_restore recovery with equivalent candidate/audit counts and unapproved status. Document forward recovery from verified backup. No destructive existing-database down migration.
5. Run existing full test/data/build/preflight and isolated persistence tests. Review connection and SQL trust boundaries independently with Superpowers requesting-code-review. Verify static dist excludes internal database data.
6. Commit scoped files, run exact-SHA Linux persistence plus existing Chromium/axe validation where existing workflow capabilities permit. Report actual CI provenance and gaps. Provider/deployment settings, pending PRs and main remain outside this phase.

## Risks and release gates

Database availability, migration integrity, unsafe context reuse, pooled connection leakage, overly broad grants, orphaned rows, replayed imports, SQL injection and accidental connection to an existing project are the primary risks. The harness checks its owned data directory and generated database names before operations. Tests run against synthetic local records only. Startup creates a loopback-only temporary instance with Unix sockets disabled and no credential printed or committed.

Phase 1B does not provision hosted PostgreSQL or authentication. Owner/session authority, production backup policies and actual retention activation remain future gates. The current static app continues operating through its existing JSON source. Spending stays INR 0.

Methodology sources read for this sprint include gstack [plan-eng-review](https://github.com/garrytan/gstack/blob/main/plan-eng-review/SKILL.md), [review](https://github.com/garrytan/gstack/blob/main/review/SKILL.md), [qa](https://github.com/garrytan/gstack/blob/main/qa/SKILL.md), [ship](https://github.com/garrytan/gstack/blob/main/ship/SKILL.md), and Superpowers [writing-plans](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md), [TDD](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md), [systematic-debugging](https://github.com/obra/superpowers/blob/main/skills/systematic-debugging/SKILL.md), [verification-before-completion](https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md), [requesting-code-review](https://github.com/obra/superpowers/blob/main/skills/requesting-code-review/SKILL.md). The requested gstack investigate SKILL.md still returned 404. Apply root-cause-first debugging manually. Official [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql), [node-postgres transactions](https://node-postgres.com/features/transactions) and [PostgreSQL initdb](https://www.postgresql.org/docs/current/app-initdb.html) documentation informed the design.
