# Phase 1C: authenticated local administration and approval decisions

Prepared 2026-11-12. Status: implementation plan; no identity service enabled by this document.

## Verified starting point

- Development branch: `feature/phase-1c-local-identity-approvals-2026-11-12`, created from `3144aa65b7eedb6ffdf8f407e9cfc44d04914efa` with existing untracked reports preserved.
- PR #8 remains open and draft, head `29573f0142b2019ba11593569c6d080a5d052c71`, base `1672461bea5fa09e01965c5e8bdd4819852b06fd`. Open PRs #8, #9, #10, #12, #13, #14 and #15 remain separate.
- Phase 1B exact-SHA [Chromium CI run](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/43266647890) was rechecked: completed, success, head `3144aa65b7eedb6ffdf8f407e9cfc44d04914efa`.
- Fresh local `npm test` baseline passed: 676 root tests and 15 persistence test entries, zero failures or skips; catalog validation, 28-page production build, build smoke and release preflight passed. Preflight checked 343 internal links, 39 asset references and 68 leakage-surface files.
- Baseline execution used existing Node 24.22.1, npm 10.9.9 and disposable PostgreSQL 18.6. Invoke npm through the approved Node executable and `npm-cli.js`; prepend its directory to PATH for child scripts. The default Node 22.23.3 remains unsuitable.
- GCM helper remains `manager`. No credential values belong in this plan or test output.

## User need and scope

Provide an authenticated local service for reading agents and pending approval requests and recording independent human decisions. Persisted organization IDs are currently internal repository scope, not authenticated identity. The application database role cannot create approval decisions. Preserve both boundaries while introducing a separate restricted control role.

Keep Astro static and the existing buyer application intact. Use Node's existing crypto/HTTPS modules and the already approved pg/Drizzle dependencies. No package installation, hosted backend, account creation, external identity provider, hosted deployment, browser installation, payment, publication or agent executor is required. Real owner provisioning is separate from synthetic integration fixtures.

## Trust and threat model

Treat HTTP bodies, headers, cookies, catalog evidence and caller roles as untrusted. Address forged owner identity, replayed challenges, session theft/revocation, cross-tenant access, CSRF, DNS rebinding, stale approvals, concurrent duplicate decisions, transaction escape, migration drift and leakage into public build output.

The local operating-system account and owner-provisioned external trust configuration are the administrative trust roots. A compromised OS account is outside this local authentication boundary. Loopback binding alone is insufficient authentication. Netlify private access supplies no application-level role authority.

## Implementation sequence and behavior tests

Each numbered change starts with a behavior test that fails because behavior is missing, followed by the smallest implementation and targeted tests. Missing modules/tooling are setup failures, not the recorded feature RED. Add narrow initial exports if needed so the first RED asserts denied or missing behavior. Record RED/GREEN commands and exit codes in the phase report.

### 1. Owner trust configuration and principal boundary

Files: `src/platform/identity/{trust,principals}.mjs`, `tests/platform-identity.test.mjs`.

- Load a bounded, versioned, strict JSON public-key configuration from an explicitly selected file outside this repository; reuse existing private-source path checks. Reject symlinks, unknown fields, duplicate key IDs, invalid tenant/user IDs and unsupported algorithms.
- Pin Ed25519 public keys to organization, user and owner/reviewer role. No first-user-owner rule, submitted account name, request-supplied public key or role flag may establish authority. Do not provision real owner private keys during agent work.
- Re-read or securely reload trust data before authentication and privileged decisions. Removed keys and changed key fingerprints invalidate existing sessions. Missing/unreadable/invalid configuration fails closed.
- Return opaque authenticated principal handles held in a private WeakMap. Expose no constructor that accepts caller-provided identity assertions. Keep the existing general permission evaluator denied until an independently reviewed executor exists.

RED cases: forged plain-object owner, duplicate/invalid keys, missing configuration, removed key, role downgrade and cross-organization principal. GREEN cases use generated in-memory synthetic keys only.

### 2. Forward-only control-plane migration

Files: `src/platform/persistence/control-schema.mjs`, `migrations/0002_local_identity_approvals.sql`, ordered migration manifest/runner, `connection.mjs`, restricted transaction adapter, integration migration tests.

- Preserve migration 0001 bytes and checksum. Extend ordered migration verification to reject gaps, changed applied checksums, unknown future versions and partial failure. Keep existing Phase 1B migration behavior and tests passing.
- Add durable single-use challenges and hashed sessions with expiry/revocation and pinned key fingerprint. Scope keys, indexes and forced RLS by organization. No raw session token or signature is stored in audit payloads.
- Add immutable request bindings for requester identity, action/resource identity and version, policy version, payload/evidence digest and risk. Legacy pending requests without complete bindings cannot be decided.
- Replace the one-decision-per-request uniqueness constraint through migration 0002 with a versioned append-only decision stream. A revocation appends an event. Existing decision history remains immutable.
- Create `stackpilot_control` with no superuser, bypass-RLS, role/database creation, inheritance or membership privileges. Grant only required session/challenge access, request/agent reads and decision/audit/outbox inserts. Preserve the application's inability to insert decisions.
- Share guarded transaction lifecycle code without accepting arbitrary caller-selected database roles. Scope comes from authenticated principal handles. Elevated connections, escaped handles and unfinished operations fail closed.

RED cases: altered migration 0001, unknown ledger version, DDL failure rollback, unauthorized app-role decision insertion, control-role privilege escalation, cross-tenant access and decision mutation. Test fresh migration, existing v1 upgrade, idempotent v2 application and backup/restore on an owned disposable database.

### 3. Challenge authentication and sessions

Files: `src/platform/identity/{challenges,sessions}.mjs`, identity repository and unit/integration tests.

- Sign a domain-separated canonical challenge binding nonce, challenge ID, public-key ID, organization, user, exact service origin and expiry. Use cryptographic randomness, a short expiry and atomic durable single-use consumption.
- Issue a random 256-bit session token after successful verification; persist only its hash. Use a 15-minute absolute expiry, explicit logout/revocation and trust-fingerprint checks. Never log credentials, cookie headers or signatures.
- Use `__Host-stackpilot_session` cookies with Secure, HttpOnly, SameSite=Strict and Path=/. Derive a session-bound CSRF token with domain-separated HMAC; compare safely. Return sensitive responses with no-store.

RED cases: bad signature, changed origin/user/tenant, replay including concurrent replay, expired challenge, expired/revoked session, changed trust key and arbitrary submitted roles. Verify one successful authentication followed by denial of replay.

### 4. Independent approval decisions

Files: `src/platform/approvals/{requests,decisions}.mjs`, approval repository, integration tests.

- Read authoritative request/resource state inside the deciding transaction. Recompute canonical bindings and reject stale resource versions, changed evidence/policy/payload and incomplete legacy requests.
- Require a currently trusted owner in the same organization. Deny requester self-approval and agent approval. Reviewer identity alone cannot approve. Unknown/prohibited actions and owner-only release gates remain denied.
- Serialize decisions per request. Bind each decision to the immutable request digest and expected decision version; concurrent duplicates and replay fail. Insert decision, audit and outbox atomically. Revocation is a new immutable event with validated transition semantics.
- Approval records never update candidate evidence to approved, activate agents, authorize spending or grant publication authority.

RED cases: anonymous/reviewer/cross-tenant/self approval, stale hashes/version/policy, duplicate/concurrent decisions, altered prior decision, rollback audit gaps and attempted prohibited actions. Test a valid independent synthetic owner decision plus subsequent revocation history.

### 5. Explicit local HTTPS entry point and export boundary

Files: `src/control-plane/{server,routes,csrf}.mjs`, `scripts/platform-control-plane.mjs`, editorial source/runtime guards, integration HTTP tests.

- No listening sockets on import. Explicit CLI startup requires external trust and TLS files and an approved local database configuration; otherwise exit unavailable. Bind only `127.0.0.1` with an exact HTTPS origin and no remote/default database fallback.
- Routes: challenge/session creation, `/session`, `/logout`, `/agents`, `/approval-requests` and `/approval-requests/:id/decisions`. No payment, send, publication or execution endpoint.
- Validate exact Host and Origin, require CSRF on authenticated mutations, reject cross-origin access, unknown fields/methods/content types and bodies over 8 KiB. Bound authentication rate limits and associated memory. Return generic errors and safe response headers without request-body logging.
- Generate synthetic TLS fixtures outside the repository using existing Git OpenSSL only if its provenance and availability are confirmed. Trust the fixture CA per test client; never disable global TLS verification. Remove fixture material with owned temporary files after tests.
- Extend the existing source guard with an explicitly reviewed, checksum-pinned control-plane exclusion contract. Preserve rejection of Astro/serverless administrative routes and altered excluded source. Assert fresh dist contains no control-plane modules, private data, trust configuration or fixture material. Do not broadly disable existing static-only checks.

RED cases exercise the normal HTTPS entry point: anonymous reads, forged cookies/roles, bad Host/Origin/CSRF, wrong method, malformed/oversized JSON, rate limits, expired/revoked sessions, cross-tenant reads, stale approval and attempted static export. Valid synthetic owner access must pass through real authentication and restricted PostgreSQL transactions.

### 6. Review, validation and handoff

- Perform independent requesting-code-review and gstack-style security review; fix findings and add regression tests. Inspect outbound diff for secrets, unrelated files, unsafe inputs, evidence laundering, future evidence and accidental commercial activation.
- Run the existing full `npm test` chain with exact runtime versions and exit codes. Add the real control-plane integration file to the existing disposable test harness; preserve real PostgreSQL coverage and all existing tests.
- Verify clean build and preflight use freshly generated dist. Run existing Linux Chromium desktop/mobile and axe workflow against the exact scoped implementation SHA where authorized. Confirm Linux file-symlink rejection actually executes. Separate local, GitHub and authenticated hosted evidence.
- Preserve pending PRs and main. No new PR, merge, force push or deployment setting change. Inspect branch history before any permitted development-branch push; use existing GCM. Report workflow conclusion, skips, warnings and deployment records rather than treating dispatch as success.
- Write `docs/platform-foundation/2026-11-12-phase-1c-report.md` with actual files, RED/GREEN evidence, versions, migration recovery, test totals, exact SHA/CI links, security findings, limitations, owner provisioning gates and INR 0 impact.

## Release gates and remaining owner inputs

Synthetic integration success does not provision a real owner or enable an operational service. Real use requires an owner-selected external trust configuration, protected private signing key, reviewed local TLS identity and explicit service startup. Keep API startup unavailable when any required trust input is absent. No request for secret values is needed to implement or test this phase.

Public release, monetization, legal approval, authenticated hosted UAT and production identity/deployment remain separately gated. Stop after Phase 1C validation/report; orchestration is a later phase.

## Methodology and primary references

Apply the upstream methods manually; do not install their scripts or hooks. Sources read for this sprint: gstack [plan-eng-review](https://github.com/garrytan/gstack/blob/main/plan-eng-review/SKILL.md), [review](https://github.com/garrytan/gstack/blob/main/review/SKILL.md), [qa](https://github.com/garrytan/gstack/blob/main/qa/SKILL.md), [ship](https://github.com/garrytan/gstack/blob/main/ship/SKILL.md); Superpowers [writing-plans](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md), [test-driven-development](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md), [systematic-debugging](https://github.com/obra/superpowers/blob/main/skills/systematic-debugging/SKILL.md), [verification-before-completion](https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md), [requesting-code-review](https://github.com/obra/superpowers/blob/main/skills/requesting-code-review/SKILL.md). The requested gstack investigate path returned 404; use the documented Superpowers root-cause-first method.

Primary design references: [Node HTTPS](https://nodejs.org/docs/latest-v22.x/api/https.html), [Node crypto](https://nodejs.org/docs/latest-v22.x/api/crypto.html), [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html). These inform design; completed behavior requires the tests above.
