# Phase 1C identity service

`createIdentityService({pool, trustPath, origin})` builds the programmatic identity service. `trustPath` selects the external public-key configuration. `origin` must be a canonical HTTPS origin on 127.0.0.1 with port 1024–65535. The database pool must connect as the restricted control role. The owner provisions actual role login and external trust before operational use. The test harness enables login only in its owned temporary PostgreSQL cluster.

The public methods support challenge issuance/completion, bearer authentication, opaque principal resolution, owner resolution, CSRF verification and logout. Inputs accept exact documented fields. Every operation reloads pinned trust and uses the actual control database role. Errors use the fixed message `Identity operation failed`.

## Proof and session lifecycle

`createChallenge({keyId})` derives organization, user and role from the trust file and requires an existing profile row. It returns a random nonce, challenge ID, expiry, exact origin and canonical message. The client signs the UTF-8 bytes of `message` with its pinned Ed25519 private key and submits `completeChallenge({keyId, challengeId, nonce, signature})`. Signatures use canonical unpadded base64url. The private signing key stays with the client.

The message is a JSON array ordered as domain `stackpilot-auth-v1`, origin, key ID, organization ID, user ID, identity fingerprint, challenge ID, nonce and ISO expiry. The identity fingerprint hashes domain `stackpilot-principal-v1`, key ID, organization, user, role and public-key fingerprint. The migration-2 `key_fingerprint` columns store this complete identity binding. Role changes therefore affect the binding as well as key rotation.

PostgreSQL stores the nonce digest. A transaction locks and checks the challenge, verifies the signature, conditionally consumes it against the database clock, inserts one session and appends audit/outbox events. The session token has 256 random bits. Only its SHA-256 digest is persisted. The returned token and CSRF token are sensitive response values and must be handled through the future HTTPS transport without logging or static export.

Challenges expire within 60 seconds and sessions within 15 minutes. Per-key issuance is capped at 10 challenges per 60 seconds with a database advisory lock, including concurrent issuers. Verification attempts are capped at 20 per key per minute within each service instance. This process-local counter resets on restart. Its map is bounded to 64 keys. The HTTPS layer will provide request/IP limits across malformed requests and other endpoints.

`authenticate({keyId, token})` returns an opaque frozen handle. A service-private WeakMap records its session binding. `requirePrincipal(handle)` rechecks current trust, identity fingerprint, origin, database expiry and revocation. `requireOwner(handle)` additionally requires the current owner role. Returned profile metadata contains public identity fields. Authorization consumers pass the opaque handle back to the service for resolution.

`verifyCsrf(handle, csrfToken)` verifies a session-bound HMAC and resolves the live principal. `logout({keyId, token})` records revocation and audit/outbox in one transaction and supports repeated requests. Live trust-file removal or identity changes cause access denial. Restoring the same trust binding can restore access to an otherwise unexpired, unrevoked session, so permanent session termination uses database revocation.

## Database boundary and validation

`openLocalControlPool(config)` verifies explicit loopback selection, cluster marker and actual control identity. `withControlTransaction` shares the existing guarded transaction lifecycle, uses a fixed database role and fixes search_path to pg_catalog/public/pg_temp. The role guard checks flags, memberships, ownership, public table/column grants and public schema creation. It checks this defined grant surface. Privileges on other schemas and executable routines need review when those surfaces are introduced.

The integration suite uses real restricted-role connections and synthetic owners in two organizations. It exercises successful signing, forged roles/handles, application/admin pool rejection, cross-tenant substitutions, replay races, wrong signature/nonce/origin, expiry, missing profiles, trust rotation/removal/downgrade, CSRF, logout, issuance bounds, column-grant drift and hashed storage with audit counts. A signed expired challenge fixture preserves a valid proof so expiry denial has an independent regression assertion.

HTTP routes, secure cookie delivery, Host/Origin enforcement at transport, independent approval decisions and real owner provisioning follow in the Phase 1C plan. Current validation covers the programmatic service and existing static application acceptance. General platform permission evaluation remains fail-closed until its scoped integration is implemented.
