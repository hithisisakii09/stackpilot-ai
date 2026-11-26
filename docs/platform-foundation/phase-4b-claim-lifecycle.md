# Phase 4B authenticated claim review lifecycle

The internal service records review preparation alongside existing candidate-only product, claim and source records. Signed identities come from `createIdentityService`. Existing `createApprovalService` supplies independent request decisions. HTTP routing and owner provisioning for the new methods remain subsequent integration work.

## Review sequence

Create the service through `createClaimLifecycleService({identity})` from `src/platform/products/claims.mjs`.

1. A signed reviewer or owner calls `transition(handle,{claimId,agentId,expectedVersion:0,idempotencyKey,to:'evidence-collected',expiresAt})`. At least one valid linked source is required. Expiry must be future UTC, at most 90 days from the database clock. The event binds the current claim version, source/link digests, agent and locked operating policy.
2. The reviewer calls existing `approvals.createClaimRequest(handle,{requestId,agentId,claimId})`. Then that same requester enrolls it through `transition(handle,{claimId,agentId,expectedVersion:1,idempotencyKey,to:'needs-review',requestId})`. Enrollment requires an undecided request with the exact captured claim/evidence snapshot.
3. An independently signed owner uses existing `approvals.decide` with the request digest and expected decision version. The requester cannot self-approve. The owner then records `verified` at lifecycle version2 and `approved` at version3 as separate calls. Each call validates the current decision, scope and snapshot again.
4. A rejected request supports an independently authorized `rejected` transition from NeedsReview. Evidence or approval invalidation supports `reverification-required`, expiry supports `stale`. Each condition must be observed by the service. Rejected/Stale/ReverificationRequired recover only through a fresh EvidenceCollected cycle.

All transition inputs require `claimId`, `agentId`, `expectedVersion`, `idempotencyKey` and `to`. Only EvidenceCollected accepts `expiresAt`. Only NeedsReview accepts `requestId`. Candidate is implicit version0. Published has no executable edge.

## Effective state and revocation

`inspect(handle,{claimId,agentId})` returns `version`, `recordedStatus`, `effectiveStatus`, `reason` and bounded immutable history. It rechecks the claim/evidence/agent/policy snapshot, current decision, expiry and evidence revocations. Changed bindings or withdrawn approval produce ReverificationRequired immediately. Expired evidence produces Stale. The stored transition history remains append-only.

`revokeEvidence(ownerHandle,{sourceId,sourceDigest,reason})` permanently withdraws that tenant-owned source ID from lifecycle use. It requires the current digest. Exact retries return the original revocation ID. Changed content under an existing revocation fails. A subsequent valid cycle needs source records which have not been revoked. Revocation applies to every linked claim in that organization.

Every pending request can enroll in exactly one lifecycle cycle. A consumed pending request cannot be reused after content is restored or a new cycle begins. Prior decisions cannot be enrolled retroactively. A fresh request is needed for subsequent review.

## Persistence and concurrency

Migration9 adds `claim_lifecycle_events` and `evidence_revocations`. Both have forced tenant RLS, composite tenant FKs and SELECT/INSERT-only control-role grants. The application role receives no new table access. Existing candidate-only CHECK constraints remain intact. Migration default stays1, explicit maximum becomes9.

Each transition has unique organization/idempotency key and claim/version pairs. Exact-key retry succeeds only when its event remains the current effective event. Changed input or replay after subsequent progression fails. All lifecycle mutations acquire an organization advisory lock. Approval inspection additionally uses the same request lock as the independent approval service. Source revocation shares the lifecycle lock. Fresh validation occurs before commit. Event, audit and outbox writes roll back together.

Engineering limits are 100 events per claim and a 90-day evidence window. Source validation retains the existing twenty-source cap. These bounds fail closed. Internal exported approval snapshot/inspection helpers expect an authenticated service transaction and do not establish identity themselves. Static preflight rejects those helper markers and lifecycle/revocation paths.

## Validation and gates

Synthetic signed users exercise the complete sequence on owned disposable PostgreSQL. Tests cover forged/foreign identities, self approval, stale bindings, consumed requests, conflicting keys, decision/source revocation races, expiry, migration rollback, table grants and actual outbox failure. Existing catalog, static build and browser acceptance remain full-suite requirements.

Lifecycle preparation supplies no publishing executor, commercial activation or evidence collection. Actual owner trust provisioning, independent evidence review, authenticated hosted UAT, pricing history and public projection retain separate scopes and release gates.
