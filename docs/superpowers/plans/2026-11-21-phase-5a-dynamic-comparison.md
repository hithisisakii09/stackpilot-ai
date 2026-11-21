# Phase 5A Dynamic Comparison Implementation Plan

**Goal:** Add a deterministic, evidence-bound comparison foundation and a CSP-safe, browser-only any-vs-any picker without publishing or approving product claims.

**Architecture:** Pure `src/platform/growth/` modules receive only detached plain records and return immutable, candidate-safe summaries. A separate allowlist projection produces a browser read model; the Astro page embeds only that safe model and loads one first-party module script. The browser module sanitizes query state, renders with DOM APIs, and exports formula-neutral CSV locally.

**No migration decision:** No `0011` migration is required. Phase 5A persists no recommendations, selections, approvals, or snapshots.

**Safety boundaries:** All candidate claims/prices remain `UNKNOWN` or `CANDIDATE_UNVERIFIED`; affiliate URLs and commission data are rejected. No network fetch, account, analytics, deployment, publication, indexing, or dependency addition is permitted. `affiliateUrl` stays null. The existing control-plane/static-export guards remain fail-closed.

## Tasks

1. Write RED unit/adversarial tests for suitability, alternatives, and the public export; implement deterministic, detached pure modules and tests GREEN.
2. Write RED static-export and CLI tests; implement dry-run-only export with explicit `--write`, a safe generated read-model target, and guard regressions; tests GREEN.
3. Write RED browser/a11y tests for query restoration, malformed query rejection, filters, 2–3 selection matrix, keyboard/a11y landmarks, and formula-neutral CSV. Replace the compare page inline script with a first-party module and safe static model; tests GREEN.
4. Review security and scope, run local Node/postgres/data/build/preflight/browser checks, then commit only scoped implementation/tests/docs. Keep the checkpoint report uncommitted; do not push, create/edit a PR, merge, deploy, or dispatch workflows without the separately requested remote stage.

## Implemented interfaces

- `buildPublicCatalog(products)` emits deterministic candidate-only records and reuses the pricing projection's empty eligibility contract to prevent a public pricing surface.
- `scripts/export-public-catalog.mjs` prints the model by default; `--write output.json` uses exclusive creation.
- `/compare/` passes the candidate-only model through an escaped data attribute to `/scripts/compare-picker.js`; it accepts only known category and product IDs, uses DOM text nodes, and exports formula-neutral CSV.
