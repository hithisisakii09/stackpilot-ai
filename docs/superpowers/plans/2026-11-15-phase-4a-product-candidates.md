# Phase 4A — taxonomy, manual candidate intake and duplicate proposals

Parent `2a3e1e9fc2e10be49767b052680c01c7d47d726d`. Branch `feature/phase-4a-product-candidates-2026-11-15`. Owner authorized this checkpoint by continuing the proposed next action. Budget INR0.

## Scope and interfaces

- Add `src/platform/products/taxonomy.mjs`, `discovery.mjs`, `dedup.mjs`, and `store.mjs`. Pure preparation captures strict data-only inputs, deterministic identities/digests and bounded arrays. Category IDs are independent from display names. Aliases use normalized slug tokens with an unambiguous namespace per tenant.
- Manual intake accepts up to ten categories, vendors, products and sources, five aliases per entity, a manual reference and an idempotency key. Source dates must be canonical UTC and past/present. HTTPS URLs reject credentials, query/fragment, ports, IP literals, local names and malformed/ambiguous spellings. Normalization preserves path case and meaning. No network fetch occurs.
- Reuse existing categories/vendors/products/product_aliases/evidence_sources, current candidate import and restricted transaction/event helpers. Existing IDs are immutable and exact records can be reused. Conflicting identities or aliases fail atomically. Same vendor URL is a potential duplicate signal, producing an unreviewed pair proposal. Existing six candidate IDs and static routes remain covered by the full suite.
- Migration 8 adds only category_aliases and product_duplicate_proposals, tenant FKs, forced RLS and SELECT/INSERT grants. Pair ordering and uniqueness prevent duplicate proposals. Highest supported target becomes 8, default remains 1. Prior migration bytes stay intact.
- `prepareProductIntake(input, {nowMs})` is a connection-free dry run. `openProductCandidateStore(config).scope(org).apply(input, {apply:true})` is restricted to the existing owned disposable market test database and fixture marker. `duplicates(productId)` returns bounded proposals for human review. No merge/approval operation is exposed.

## Tests and execution

1. Write `tests/platform-products.test.mjs` first, observe RED for absent modules. Cover taxonomy collisions, stable IDs, hostile descriptors, URL canonicalization, unsafe URL rejection, dates, candidate authority, bounded batches, canonical digest and duplicate pairs.
2. Implement pure GREEN behavior and migration canonical verification/tamper tests.
3. Write `tests/integration/platform-products.test.mjs`, append to existing disposable harness. Observe RED before store implementation. Cover migration 7→8 and fresh 1→8, idempotency/concurrent keys, input capture, tenant FKs/RLS, alias namespace collisions, changed-record rejection, proposal caps, DB grants, future source rejection and outbox-failure rollback.
4. Review through a reviewer per Superpowers requesting-code-review. Address important findings with RED/GREEN regressions.
5. Run approved Node24.22.1/npm10.9.9 full npm test using existing PostgreSQL18.6/OpenSSL3.5.7. Fresh build, catalog, route smoke and release preflight are in that command. Preserve all 23 preexisting untracked artifacts by SHA256.
6. Commit scoped implementation only, nonforce push new branch, run existing nondeploying Browser acceptance workflow against exact SHA and inspect completed Linux tests, symlink rejection, Chromium/axe and artifact metadata. No PR mutations. Report local and remote results separately in a local checkpoint.

## Risks and gates

Canonical vendor URL equality is a review signal and cannot assert product equivalence. Caller-supplied source digests are unreviewed provenance. Alias namespaces must reject shadowing across existing category slugs and aliases. Application advisory locks serialize all candidate intake per organization, uniqueness/FKs backstop concurrency. Reject excessive duplicate fanout before writes commit. Domain failures use existing sanitized transaction errors. No installation, live collection, evidence approval, recommendation changes, lifecycle progression, hosting/publishing/protected branch changes or spending is included. Owner provisioning, independent evidence review and authenticated hosted UAT remain gates.

## Method sources

Public upstream methodologies read for this sprint and applied manually with existing tooling. External setup/hooks/telemetry were not executed. The investigate URL returned unavailable.

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
