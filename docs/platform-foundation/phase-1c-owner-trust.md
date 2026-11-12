# Phase 1C owner trust configuration boundary

The first Phase 1C implementation validates external public-key configuration. It does not authenticate a user, issue a session, create an authenticated principal, grant an approval or start a server. The existing permission evaluator remains denied.

`src/platform/identity/trust.mjs` exports:

- `parseTrustConfiguration(value)`: validate a plain data object and return an immutable copied configuration.
- `loadTrustConfiguration(absolutePath)`: read an explicitly selected external file through the existing private-source file guard, validate it and return a fresh configuration. No cache, environment fallback or default file is used.

The top-level object contains exactly `schemaVersion: 1` and `principals`. Each of 1–16 entries contains exactly `keyId`, `userId`, `organizationId`, `role` and `publicKeySpkiBase64`. IDs use the existing platform ID contract. Roles are `owner` or `reviewer`; keys are canonical base64-encoded Ed25519 SPKI public keys. Returned entries also contain a SHA-256 `keyFingerprint` over the canonical DER bytes.

Each represented organization needs one owner user identity. That user may have multiple distinct keys for rotation. Key IDs and public-key material must be globally unique across the file, and a user cannot have conflicting roles within an organization. Other algorithms, private-key encodings, trailing DER data, unknown fields and duplicate JSON properties are rejected. File content is limited to 16 KiB after the shared reader's bounded read. Repository files and symbolic paths are refused by that reader.

The owner-controlled external file is the trust root. File validation does not prove possession of a signing key. A caller can construct a valid public configuration object, so the parser's output must never be accepted as authenticated identity. Future session and decision code must load the configured external trust root, validate cryptographic possession and session lifecycle, and recheck current key/role bindings. Cached snapshots are not revocation checks.

No real owner keys or configuration are provisioned by this change. Tests generate synthetic key material in memory and write public fixtures only to owned temporary directories outside the repository. Error messages omit paths, input contents and nested error causes. No caller-supplied configuration or role is connected to an application endpoint.

The remaining Phase 1C work is tracked in the [implementation plan](../superpowers/plans/2026-11-12-phase-1c-local-identity-approvals.md): authenticated principal/session lifecycle, forward-only control schema, independent decisions, explicit local HTTPS routes, export-boundary review and end-to-end acceptance. Public deployment and commercial operations remain separately gated.
