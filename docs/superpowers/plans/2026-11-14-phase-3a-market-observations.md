# Phase 3A manual market observations

Verified base `f63a8bfcfd7ae831ee885921ddc185764176fb7b`, branch and remote match, successful CI 43461280783. Main and seven pending PR heads match the handoff. Origin credential-free, helper manager. Seventeen untracked files are SHA-256 inventoried for preservation.

## Scope and design

Implement pure candidate intake/scoring plus an explicitly selected disposable local store. Reuse market_opportunities, market_observations, products, evidence_sources, idempotency_keys, audit and outbox. Existing observation JSON carries a versioned manual record; legacy rows stay intact. Narrow migration 6 adds a partial unique series/revision index and a candidate-envelope constraint for new records, with prior SQL/checksums unchanged. No table columns or broad grants are required.

Each append-only observation binds category/product/source, HTTPS URL, event/collection/period dates, region, metric/value/unit, evidence digest and manual provenance. Missing fields use explicit nulls and an exact declared missing list. UTC timestamps are canonical and database-clock validation runs during apply. Known source references must match authoritative scoped product/category/URL/digest records. Missing references remain unreviewed candidate leads. Revisions require the prior record and preserve immutable series subject/metric/source identity. Scoped advisory locks serialize bounded batch imports; idempotency and all mutation/audit/outbox writes are atomic.

Three supported opportunity metrics are demand-index, competition-index and feasibility-index. Complete comparable index inputs normalize to demand, 100-competition and feasibility, weighted by positive finite bounded normalized weights. Round final scores to two decimals and use code-point keys for stable ties. Multiple conflicting current values or incompatible units/periods produce UNKNOWN. Evidence confidence stays UNKNOWN for unreviewed inputs; actual coverage counts are separate. Seasonal/historical requests return explicit insufficient-evidence/unavailable results without forecasting. No commission fields or approval flags enter the contract. Scores remain internal provisional proposals.

## Test-first sequence

1. Pure RED for valid intake, exact missing/provenance/URL/date/value contracts, score reproduction/ties, contradictory inputs, weights, confidence and export leakage; implement minimal validators and deterministic scorer.
2. Real PostgreSQL RED for explicit migration 6 and store operations. Add a separate owned market database, source/product validation, append-only revisions, concurrent idempotency and rollback tests in two organizations.
3. Review snapshot/revision/provenance boundaries and adversarial input. Fix each blocking finding with regression tests. Retain all earlier suites.
4. Full local npm test/data/fresh-build/preflight, scoped non-force push, existing exact-SHA Linux Chromium/axe CI, completed log/artifact/deployment inspection, byte-identical report checks and local uncommitted checkpoint. Stop at Phase 3A.

Files: `src/platform/market/{observations,scoring,store}.mjs`, migration generator/SQL/manifest and explicit target support, shared disposable store selection, harness, pure/integration tests, private export guard, scoped interface guide/checkpoint. Any worker integration is deferred; this slice needs no additional handler or business-role activation.

## Methodology sources

Current public gstack [plan-eng-review](https://github.com/garrytan/gstack/blob/main/plan-eng-review/SKILL.md), [review](https://github.com/garrytan/gstack/blob/main/review/SKILL.md), [qa](https://github.com/garrytan/gstack/blob/main/qa/SKILL.md), [ship](https://github.com/garrytan/gstack/blob/main/ship/SKILL.md), [investigate](https://github.com/garrytan/gstack/blob/main/investigate/SKILL.md), and Superpowers [writing-plans](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md), [TDD](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md), [debugging](https://github.com/obra/superpowers/blob/main/skills/systematic-debugging/SKILL.md), [verification](https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md), [requesting-code-review](https://github.com/obra/superpowers/blob/main/skills/requesting-code-review/SKILL.md) read and applied manually. No external skill setup, hooks, telemetry, packages or runtimes installed. Owner authorizes scoped development push and existing non-deploying CI dispatch. Budget INR 0, real owner provisioning/UAT remain owner gates.
