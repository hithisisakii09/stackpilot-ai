# Phase 4C pricing history and internal projection implementation plan

Parent `4fd299b58cf060d3eb1ccfd1568e2f459a581b02`. Branch `feature/phase-4c-pricing-projection-2026-11-15`. Owner continued the proposed checkpoint. Budget INR0. Preserve all 25 existing untracked artifacts by SHA256.

## Goal and interfaces

- Create `src/platform/products/pricing-history.mjs` and `projection.mjs`. Pricing is manually observed candidate data, with exact product/claim/agent/source binding, UTC observed/collected/expiry timestamps, plan, region, currency, integer minor amount, billing period, unit, tax treatment and manual reference.
- `normalizePricingObservation(value,{nowMs})` validates strict data-only immutable records. `pricingClaimStatement(value,{nowMs})` formats every pricing field into one canonical claim statement. Recording requires that exact statement and its linked source in the existing database. This prevents approved unrelated claims from authorizing caller-supplied prices.
- `createPricingHistoryService({identity}).record(handle,observation)` uses immutable observation ID as the retry key. Exact retries return the original ID. Changed content fails. `history(handle,{productId})` returns bounded candidate observations with explicit unreviewed status.
- `projectPricingHistory({observations,eligibleIds,nowMs})` selects only the latest observation in each exact plan/region/currency/billing/unit/tax context. Ties, unreviewed latest records, missing context and expired observations produce UNKNOWN with null amount. No fallback to an older reviewed observation. No currency conversion, annualization, tax arithmetic or inferred prices.
- `createProductProjectionService({identity}).read(handle,{productId,agentId})` returns current internal approved claims and reviewed pricing observations, with generated time and evidence expiry. Reuse the Phase4B lifecycle inspector inside the same authenticated transaction and organization lock. A typed pricing claim is visible only when its corresponding latest pricing observation is eligible. This also prevents stale prices leaking through generic claim text.
- Recheck approved lifecycle bindings before return. Source revocation, changed claim/evidence/agent/policy, withdrawn approval and expiry invalidate subsequent reads. Projections are read-only and ephemeral.

## Storage and limits

Migration10 adds one append-only `pricing_observations` table, strict candidate record checks, tenant product/claim/source/agent/user FKs, forced RLS and SELECT/INSERT-only control grants. Application role has no new access. Add narrow control validator entries and explicit target10 runner/CLI support. Earlier migration bytes stay intact and default target stays1.

Retain existing ninety-day evidence window. Bound history to 100 observations per product, projection to 20 claims, and output to 64KiB. These are engineering choices for the checkpoint. Unknown amount/currency and explicitly unknown billing/unit/tax context remain UNKNOWN. Recognized currencies use existing runtime ICU data. Read models preserve all six existing static candidate identities and routes.

## Tests and execution

1. Write pure tests for invalid money/context, dates, hostile input, canonical typed statement, contextual selection, ties, expiry, UNKNOWN and commercial-field rejection. Observe expected RED and implement GREEN.
2. Write `tests/integration/platform-pricing-projection.test.mjs` before service implementation. Use a new owned disposable fixture database plus fresh/failure migration databases. Synthetic signed identities cover exact source/claim binding, unrelated claim denial, idempotent/concurrent intake, tenant/auth denial, approval requirements, stale/revoked/expired invalidation, latest-candidate suppression, pricing-text redaction, rollback and read-only counts.
3. Export the existing internal lifecycle inspector through a narrow shared helper. Preserve public lifecycle behavior. Add static export path/marker guards and regression tests.
4. Independent read-only code review via Superpowers requesting-code-review. Fix important findings with observed regressions.
5. Run full approved Node24.22.1/npm10.9.9 tests with existing PostgreSQL18.6/OpenSSL3.5.7, catalog, fresh Astro build, smoke and preflight. Preserve all prior artifacts and check bounded secret patterns.
6. Commit only scoped files, normal nonforce push new branch, dispatch existing nondeploying Browser acceptance workflow, wait for exact-SHA Linux/Chromium/axe results and inspect artifact metadata. Keep a local uncommitted checkpoint report.

## Gates and method sources

Actual evidence review, owner/key/database provisioning, HTTP integration and authenticated hosted UAT remain outstanding. Existing release executor and commercial gates remain locked. No package/runtime installation, spending, live source collection, protected branch/PR mutation or hosting/indexing/publishing changes are included.

Current reference methods were read and applied manually using existing tooling. The investigate URL is unavailable. External setup/hooks/telemetry are not executed.

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
