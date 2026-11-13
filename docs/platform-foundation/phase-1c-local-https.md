# Local HTTPS control plane

The explicit entry point is `scripts/platform-control-plane.mjs --start`, executed with the approved Node runtime. Imports perform no listening or database mutation. Startup validates the reviewed source contract, external TLS/trust files, explicit control-role database selection, required version-3 schema and grants before binding to 127.0.0.1.

`STACKPILOT_CONTROL_CONFIG` contains a JSON object with exactly `origin`, `trustPath`, `tlsKeyPath`, `tlsCertPath` and `database`. Origin uses `https://127.0.0.1:<port>` with port 1024–65535. The three file paths are absolute, external to the repository and free of symlinks. Database configuration uses the existing host/port/user/database/clusterId contract with user `stackpilot_control`. Values come from the owner's selected dedicated local setup.

TLS files contain a server-auth leaf certificate with IP SAN 127.0.0.1 and its matching PEM private key. The certificate must be current and cannot be a CA certificate. The service reads keys without an interactive passphrase. Owner provisioning must protect the key/trust files with OS access controls and establish client certificate trust. Startup does not create identities, enable database login, migrate or generate real owner keys. Missing/invalid configuration produces the fixed message `Local HTTPS startup failed`.

For an already provisioned owner setup, the explicit command is:

```powershell
& "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts/platform-control-plane.mjs --start
```

The process prints one fixed readiness line. SIGINT/SIGTERM close sockets and the database pool. Unexpected server/pool errors close the listener without logging request, cookie, signature or connection details. A shared shutdown promise and pending-listen cancellation prevent a pool error during startup from leaving an orphan listener.

## Routes

| Method/path | Behavior |
| --- | --- |
| POST `/auth/challenge` | Exact `{keyId}` body, returns the existing canonical signed challenge |
| POST `/auth/session` | Exact `{keyId,challengeId,nonce,signature}` proof, sets a session cookie and returns CSRF token/expiry |
| GET `/session` | Returns current public profile and session-bound CSRF token |
| POST `/logout` | Empty JSON object, authenticated CSRF check, persistent revocation and expired cookie |
| GET `/agents` | Scoped bounded agent metadata |
| GET `/approval-requests` | Existing scoped pending queue |
| POST `/approval-requests` | Exact `{requestId,agentId,claimId}` supported claim request capture |
| GET `/approval-requests/<id>/decisions` | Existing scoped immutable history |
| POST `/approval-requests/<id>/decisions` | Exact `{decision,expectedVersion,requestDigest}` independent owner decision |
| POST `/approval-requests/<id>/revocations` | Exact `{expectedVersion,requestDigest}` historical owner revocation |

The cookie value encodes public key selector and random bearer token. `__Host-stackpilot_session` has Secure, HttpOnly, SameSite=Strict, Path=/ and Max-Age=900 without Domain. JSON session responses omit the bearer token. Cookie/header ambiguity and duplicate session names fail closed. Identity, tenant and authority remain derived from existing opaque handles and live service checks.

Host must exactly match the configured authority. POST requires the exact Origin and authenticated POST additionally requires `X-CSRF-Token`. Supplied GET Origin must match too. GET without Origin supports normal same-origin navigation/clients. No CORS permission is emitted. Query strings, encoded paths, unsupported methods, unknown JSON fields, duplicate JSON keys, unsupported content types and compressed bodies are rejected. Responses use JSON, no-store, nosniff, frame denial, a restrictive CSP, no-referrer and noindex headers. Parser-level malformed requests receive a fixed JSON error.

## Resource limits and session semantics

Bodies are bounded to 8192 bytes. Header bytes are bounded to 8192 and accepted header pairs to 32. The parser retains 33 pairs so rejection remains possible above the application limit on truncating parser paths. TLS handshake, header/request reception and body-read timers are 5 seconds, with Node's timeout-check scheduling granularity. Socket inactivity is bounded to 10 seconds. Existing database statement/lock timeouts govern query execution. Connections close after each response, keepalive is configured to 1 second and at most 32 accepted sockets are tracked.

Two fixed counters allow 120 total HTTP requests and 30 authentication-route requests per 60-second window for each server instance. Counters reset on restart and do not provide distributed persistence. Existing identity verification limits also reset per service, while challenge issuance remains database-backed. Restoring identical trust can restore an otherwise unexpired/unrevoked session. Permanent termination uses explicit database revocation.

## Source/export and validation boundaries

Five exact Node-only source/CLI paths are reviewed and SHA-256 pinned with CRLF-only normalization. Unknown, altered or missing control-plane files block the source audit and startup. Existing Astro/editorial/serverless restrictions and the CSV source pin remain enforced. Fresh-dist preflight additionally checks control module paths, key/certificate extensions, PEM and known identity/session/approval markers. These targeted checks supplement the existing research-leak scan and cannot identify every arbitrary encoded secret.

The disposable harness generates a synthetic CA/leaf outside the repository using existing OpenSSL and a fixture-specific configuration. It neither installs CA trust nor disables TLS verification. HTTPS clients explicitly trust the fixture CA and verify IP identity. The suite exercises the actual CLI, cookie/CSRF/session behavior, two tenants, owner decisions, staleness/replay, malformed/bounded input, regular/fragmented over-limit headers, throttling, runtime database failure and pending-listen cancellation.

Existing Chromium/axe acceptance continues to cover the 28 static application routes. HTTPS transport is exercised by CA-verifying Node clients. Real owner provisioning and authenticated hosted/browser acceptance remain operational gates. The service supports candidate claim review under existing policy and enables no runtime executor or public/commercial release.
