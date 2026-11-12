# Phase 1C control storage migration

Migration 0002 prepares local identity and approval storage. It starts no service, enables no login and grants no authenticated identity. Existing Astro output and JSON catalog remain the running application.

## Explicit migration selection

`applyMigrations(pool)` still targets version 1. `applyMigrations(pool, {targetVersion: 2})` opts into the reviewed control schema. The CLI equivalent is `npm run db:migrate -- --apply --target-version 2`, requiring the existing explicitly selected, verified, owned local administrator configuration. No migration occurs on import or build. This development session applies migrations only inside disposable test clusters.

The runner verifies both canonical SQL files and their manifests against generated schema source, then uses one transaction and an advisory lock to validate ordered ledger history and apply missing versions. Changed hashes, gaps, unknown future versions, invalid options and downgrade requests fail closed. Migration 0001 bytes and its original checksum are preserved. Target-1 commands deliberately refuse a version-2 database; use an explicit target-2 command there.

## Tables and privileges

`control-schema.mjs` defines immutable metadata, actual Drizzle objects and deterministic SQL for:

- `auth_challenges`: public-key/user binding, nonce digest, exact loopback-origin storage, expiry and consumption timestamp. Lifetimes are bounded to 60 seconds.
- `auth_sessions`: session-token hash, key fingerprint, user and challenge binding, expiry and revocation timestamp. Lifetimes are bounded to 15 minutes. A challenge can back only one session row, and the composite FK preserves the same user/key identity.
- `approval_request_bindings`: one immutable binding per request, an independently identified user or agent requester, resource/policy versions, risk and canonical request digest.
- The version-2 view of `approval_decisions`: positive version, uniqueness per organization/request/version, and a digest-bound FK to complete request bindings. Existing decisions become version 1 without rewriting history. The new FK is NOT VALID for legacy rows; PostgreSQL enforces it for every new decision. Legacy history remains readable, and an unbound legacy request cannot receive new decisions.

Every new table has composite organization keys, forced RLS and indexed foreign-key/expiry paths. The application role has no access to the three new tables and retains SELECT-only decision access. `stackpilot_control` is NOLOGIN, with no elevated attributes, role memberships or object ownership. It receives narrowly scoped reads/inserts, and column updates only for consumption/revocation. Binding, decision and audit mutation/deletion are unavailable. New control-role database connections are intentionally absent from the connection allowlist.

Before adopting an existing tagged control role, migration 0002 rejects role configuration, memberships, elevated/login attributes, owned objects anywhere in the cluster, and ACL/initial-ACL dependencies in the current database or shared objects. This includes column grants that table-level REVOKE would leave behind. Reviewed grants in other databases can coexist so an owned cluster can host separately migrated test databases. Unexpected role collisions require separate owner investigation, rather than silent normalization.

These are storage constraints, not complete authentication or approval authorization. Future services must verify signatures, consume challenges atomically, check live trust configuration, expiry and revocation, authenticate opaque principals, reject stale/self/cross-tenant approval and append decisions/audit/outbox in one transaction. RLS scope remains an internal database context, and these tables cannot establish owner identity by themselves. Idempotent migration success validates ledger history, not ongoing runtime role health.

## Recovery and validation

The existing disposable harness now runs foundation tests on their unchanged target-1 database, then control migration tests on separate synthetic databases inside the same owned loopback cluster. It tests fresh/upgrade/idempotent application, schema/ORM parity, history drift, DDL rollback, role collisions, real app-role denial, RLS/composite FKs, decision versions/bindings, transactional rollback and `pg_dump`/`pg_restore`. Role-collision and elevated-role fixtures are confined to this temporary cluster and repaired before teardown.

After a failed migration, investigate the cause and retry the unchanged reviewed migration against the preserved version-1 state. Restore an owned verified backup if needed. Do not edit applied SQL, erase history, rewrite migration ledger rows in real databases or drop approval/authentication history as a recovery shortcut. Tests deliberately corrupt and restore synthetic ledger rows to prove rejection; those fixture actions are not an operational recovery procedure.

Real owner provisioning, restricted authenticated transaction adapter, identity/session services, approval decisions and local HTTPS routes remain later Phase 1C work. No hosting, deployment, public release or spending is enabled by this migration.
