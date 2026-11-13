# Independent claim approval service

`createApprovalService({identity})` uses an actual registered identity-service instance and its opaque handles. The identity transaction bridge derives tenant/actor context internally, rechecks live trust and session state, holds a share lock on the session during work and revalidates expiry before commit. A constructed owner profile or fake identity-service object cannot establish authority.

## Interfaces

- `createClaimRequest(handle, {requestId, agentId, claimId})` captures an authenticated human requester and an authoritative candidate-claim snapshot. Owner and reviewer sessions can request review. Risk is high and action is approve-claim.
- `listPending(handle)` returns up to 100 bound supported requests without decisions in the authenticated organization. Unbound legacy and unsupported action/resource requests are excluded. Returned hashes/versions are comparison values.
- `history(handle, {requestId})` returns scoped immutable decision history, including existing legacy history. Missing/cross-tenant requests fail closed. Reads are bounded to 100 entries.
- `decide(handle, {requestId, decision, expectedVersion, requestDigest})` requires an independent live owner. Decisions are approved or rejected. Initial expected version is zero. The only supported action/resource is approve-claim on a candidate claim with linked candidate evidence.
- `revoke(handle, {requestId, expectedVersion, requestDigest})` requires an independent live owner and a prior version-1 approval. It appends version-2 revocation. The original request binding and decision hash must match. Resource/evidence changes do not block withdrawing that historical approval.

Rejection and revocation are terminal for a request. A fresh review uses a new request ID and snapshot. Owner-created requests cannot be approved by that same owner identity. Reviewers and agents cannot decide. The service returns fixed sanitized operation errors and exposes no caller-controlled organization, role, policy or canonical evidence fields.

## Bound state and consistency

Migration 0003 adds positive claim versions and SELECT-only control-role access to products, claims, evidence links and sources, plus INSERT-only pending requests. SQL/manifests 0001 and 0002 remain preserved. Target 3 is explicit through `npm run db:migrate -- --apply --target-version 3` with verified owned-local administrator configuration. No migration occurs on import or normal build.

The canonical payload binds claim content/version/status, product identity/status/site, agent identity/version/disabled state and the full locked operating policy. Canonical evidence binds sorted source/link identities, HTTPS URL, collection date, candidate state and source digest. Evidence is bounded to 1–20 linked sources and existing platform contract limits. Request hashes additionally bind tenant/request/creation time, requester identity, action/resource, versions, risk and payload/evidence hashes. Capturing the request derives these values internally.

New approvals/rejections recompute current canonical state before and after decision/audit/outbox insertion. Unsupported combinations, absent bindings, stale versions/policy/evidence/payload, future/invalid evidence, supplied digest mismatches and self-approval fail closed. Revocation validates the historical immutable binding and prior approved version because it withdraws an earlier decision.

A transaction advisory lock serializes decisions for each tenant/request. The canonical resource/agent/evidence read is one SQL statement. Its final validation snapshot supplies the decision consistency point. Subsequent source changes make the bound approval stale for any future use. Future consumers must revalidate bound state. Decision, audit and outbox writes are atomic. Candidate claim approval flags, publishing/affiliate controls and disabled executors retain their existing restrictions.

The integration suite exercises real signed identities, two tenants, review transitions, stale snapshots, protected actions, legacy rejection, concurrent conflicts, audit/outbox rollback and trust changes during a real lock wait. Fresh/upgrade/idempotent version-3 application and DDL rollback are covered, and a pure test pins all three SQL versions.

## Operational gates

Real owner provisioning and HTTPS transport follow separately. The current service is programmatic and operates on explicitly configured local storage. Existing identity limitations still apply: verification throttling is process-local, restoring an identical trust binding can restore unexpired/unrevoked sessions, and permanent termination uses session revocation. The database role guard covers public table/column grants and public CREATE. Other schema/routine privileges require review if introduced.

Approvals record independent human decisions without promoting catalog evidence, enabling execution, spending or public release. All public/commercial release gates and the INR 0 budget remain owner controlled.
