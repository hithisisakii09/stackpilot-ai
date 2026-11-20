# Phase 4C pricing history and internal projection checkpoint

## Scope and identity

- Branch: `feature/phase-4c-pricing-projection-2026-11-15`
- Parent: `4fd299b58cf060d3eb1ccfd1568e2f459a581b02`
- Implementation commit: pending local review and commit
- Scope: append-only manual pricing observations, evidence-bound internal projections, migration 10, and regression coverage only.

## Implementation

- Adds migration 10 and the `pricing_observations` append-only, tenant-scoped table with forced RLS and select/insert-only control access.
- Adds canonical manual pricing observation validation, immutable retry semantics, history reads, and explicit candidate/unreviewed status.
- Adds internal projections that retain only the unique latest observation in an exact pricing context and return `UNKNOWN` for stale, expired, ambiguous, incomplete, or unreviewed pricing.
- Requires exact product, claim, agent, source URL, source digest, collection-time, and canonical typed-statement binding. A changed source cannot be re-approved to expose an old pricing observation.
- Bounds owned PostgreSQL shutdown to five minutes to permit a valid Windows checkpoint; it does not skip or alter any test.
- Raises only the inert CLI subprocess timing limit for the already-approved Node 24 runtime; all safe-start and negative-start assertions remain intact.

## Tests and local validation

Runtime: Node `v24.22.1`, npm `10.9.9`, PostgreSQL `18.6`.

- `node --test tests/local-control-plane.test.mjs tests/platform-pricing-projection.test.mjs tests/platform-db-runner.test.mjs` — 15 passed, 0 failed.
- `npm.cmd test` with the approved Node 24 runtime first on `PATH` — 779 root tests passed; all PostgreSQL integration suites passed, including 12 pricing-projection tests; catalog validation passed; Astro built 28 pages; build smoke passed 28 pages; release preflight checked 343 internal links and 39 static assets.
- Scoped secret-pattern scan — no matches.

Regression coverage explicitly includes source-digest reapproval laundering, fresh collection of an ancient observation, owned PostgreSQL shutdown timing, and Node 24 CLI safe exit.

The requested independent reviewer was unavailable because its Codex capacity was exhausted. The author completed a scoped staged-diff review instead; a fresh remote CI review remains required after push.

## Limits and owner gates

This checkpoint creates no public pricing, currency conversion, tax calculation, commercial recommendation, affiliate state, publication, remote source collection, hosted control-plane integration, or owner approval. Pricing remains internal candidate data.

No hosting, publishing, indexing, deployment, affiliate activation, spending, PR mutation, merge, protected-branch action, package installation, or runtime installation occurred. Remote exact-SHA CI and browser acceptance remain pending until the scoped branch is committed and pushed.
