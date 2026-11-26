# Phase 4B claim review lifecycle implementation plan

Parent `fc151be9986c8657605e8e4523eef9b66a766f8c`. Branch `feature/phase-4b-claim-lifecycle-2026-11-15`. Owner continued the proposed checkpoint. Budget INR0. Preserve all 24 existing untracked artifacts by SHA256.

## Goal and architecture

Build an authenticated internal claim lifecycle with immutable transition history, independently approved review cycles and immediate invalidation when evidence or approval changes. Existing candidate-only product/claim/source records keep their contracts. Reuse signed identity handles, restricted control transactions, independent approval validation and audit/outbox patterns.

Files to create are `src/platform/products/claims.mjs`, `lifecycle.mjs`, `src/platform/persistence/lifecycle-schema.mjs`, migration9 SQL/manifest, `tests/platform-claim-lifecycle.test.mjs`, and `tests/integration/platform-claim-lifecycle.test.mjs`. Modify the existing approval service only to expose reusable internal snapshot/approval inspection helpers. Add narrow control role access-list entries, explicit target9 runner/CLI support, disposable harness databases/suite and static-export markers. Add interface guide and local checkpoint report.

## Contracts and trust boundaries

- Pure `evaluateClaimTransition({from,to,role,decision,requesterUserId,actorId,current})` enforces explicit edges. Candidate is implicit version0. EvidenceCollected → NeedsReview → Verified → Approved are separate authenticated operations. Rejected, Stale and ReverificationRequired have explicit recovery to EvidenceCollected. Published has no executable transition.
- `createClaimLifecycleService({identity})` exposes `transition(handle, input)`, `inspect(handle,{claimId,agentId})`, and owner-only `revokeEvidence(handle,{sourceId,sourceDigest,reason})`. A transition contains claimId, agentId, expectedVersion, idempotencyKey, to, with expiresAt required for EvidenceCollected and requestId required for NeedsReview. Strict fields and immutable input capture precede asynchronous work.
- EvidenceCollected captures claim version, payload/evidence digests and a future expiry bounded to 90 days. The 90-day ceiling and 100-event claim history cap are engineering choices. Fresh source dates/URLs/digests use existing approval snapshot validation. Source revocation is append-only per source ID, requiring a new source record for subsequent review.
- NeedsReview binds an unused pending request from the signed requester to the exact current captured snapshot. Unique request consumption binds it to one lifecycle cycle. Independently signed owner decisions from the existing approval service authorize Verified, Approved or Rejected. Legacy decisions created before lifecycle enrollment cannot be attached after the fact. Revocation remains executable through the existing approval service.
- Effective reads revalidate current claim/evidence/agent/policy digests, source revocations, expiry and latest decision. Invalidated approval returns ReverificationRequired, expired evidence Stale. Recorded history remains intact. Explicit invalidation transitions are permitted only when that condition is observed. Subsequent approval requires a fresh request/cycle.
- Migration9 adds `claim_lifecycle_events` and `evidence_revocations`, tenant FKs, forced RLS, ordered/unique history, unique review request consumption and SELECT/INSERT-only control grants. Application role has no new authority. Default migration target remains1. Earlier SQL bytes stay intact.
- All lifecycle/revocation mutations hold an organization lifecycle advisory lock, approval-consuming transitions also hold the existing request lock. Optimistic event versions and unique keys guard retries/concurrency. Recheck current evidence/decision after writes, and keep transition/idempotency/audit/outbox writes atomic. Same-key replay verifies the exact input and effective current state.

## Test and delivery sequence

1. Write pure edge, authority, invalidation, expiry and hostile-input tests. Observe expected RED, implement minimal pure GREEN.
2. Write PostgreSQL integration scenarios before service implementation. Cover signed owner/reviewer/foreign/forged handles, self approval, legacy decision rejection, exact cycle binding, stale version/digest/request reuse, evidence revocation/expiry, conflicting concurrency, retry capture, rollback, fresh/upgrade/failure migration and role/FK isolation. Observe RED and implement GREEN.
3. Run independent code review through Superpowers requesting-code-review. Reproduce important findings with regressions and fix before delivery.
4. Run full approved Node24.22.1/npm10.9.9 command with PostgreSQL18.6/OpenSSL3.5.7. Verify fresh catalog/build/smoke/preflight, no static export, clean owned DB cleanup and unchanged earlier artifacts.
5. Commit only scoped files, normal nonforce push new branch, dispatch existing nondeploying Browser acceptance workflow, wait for exact-SHA completed results and inspect Linux symlink, Chromium/axe, warnings/security and artifact digest. Report local/remote results in a local uncommitted checkpoint. Preserve pending PRs and main.

## Remaining gates

Authenticated HTTP routing for these new internal methods, publisher projection, pricing history, actual owner/key/database provisioning, independently reviewed evidence and hosted UAT remain outside this checkpoint. Lifecycle status is internal review preparation. Release executor stays disabled. No installs, paid services, source collection, hosting/indexing/publishing changes, commercial activation or protected actions are authorized.

## Method sources

Read current upstream reference docs and apply equivalent steps manually using existing tooling. No external setup/hooks/telemetry is executed. The investigate URL is unavailable.

- https://github.com/garrytan/gstack/blob/main/plan-eng-review/SKILL.md
- https://github.com/garrytan/gstack/blob/main/review/SKILL.md
- https://github.com/garrytan/gstack/blob/main/qa/SKILL.md
- https://github.com/garrytan/gstack/blob/main/ship/SKILL.md
- https://github.com/garrytan/gstack/blob/main/investigate/SKILL.md
- https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md
- https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md
- https://github.com/obra/superpowers/blob/main/skills/systematic-debugging/SKILL.md
- https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md
- https://github.com/obra/superpowers/blob/main/skills/requesting-code-review/SKILL.md
