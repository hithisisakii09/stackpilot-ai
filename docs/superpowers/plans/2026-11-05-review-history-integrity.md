# Milestone 2 — local editorial review-history integrity

Date: 2026-11-05. Draft PR #8 only. No public launch, merge, spend, affiliates, authenticated reviewer provisioning, or approval.

## Threat model and purpose
A future authenticated service must have a tamper-evident record of source-specific review actions. Today the repo has no authenticated reviewer, independent append-only store, or pinned external checkpoint. This increment introduces an **offline negative-only, hash-linked event structure** for development and review triage. A valid local chain detects accidental row deletion, reordering or edit *relative to a retained terminal hash*, but does **not** prove the entire history was not rewritten. Never call it an immutable audit log, reviewer authentication or approved editorial evidence.

## Implementation plan
1. Add tests first: exact schema, SHA-256 domain-separated deterministic digest, sequential event numbers, genesis, previous hash, chronology, allowed claim/vendor keys, duplicate event IDs, negative-only actions, control/markup filtering and future timestamps. Synthetically construct valid events in tests only.
2. Add `src/data/editorial-review-history.json` as `[]`. Add `src/lib/editorial-review-history.mjs` with pure compute/validate functions. No signing or approval APIs; no private data or identity fields. No external network or new packages.
3. Validate current file in `npm run check:data`, and expose an offline read-only `npm run research:review-history -- --json` report. Add a blocked readiness row; never infer authentication from a matching hash.
4. Test build + operations + Chromium CI against exact final SHA, keep PR draft and private preview.

## Remaining secure service requirements
Owner-controlled authentication, RBAC, trusted reviewer IDs, independently anchored append-only log, external key control/rotation, source snapshot storage, scoped editorial review, approval expiry and revocation, no third-party secrets in Git, legal signoff and owner-controlled publishing. None is activated in this increment.

## Owner gates
₹0 monthly and delegated budget; production lock, no merges, no affiliate activation, no public publication, no contracts or outreach.
