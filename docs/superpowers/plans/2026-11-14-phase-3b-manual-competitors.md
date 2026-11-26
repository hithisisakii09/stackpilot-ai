# Phase 3B manual competitor intelligence

Verified parent `b3f90e5d1602fce3f14d6ff54474110785bc8759`, successful CI 43597360473 and unchanged pending PR heads. Branch `feature/phase-3b-manual-competitors-2026-11-14`. Twenty existing untracked artifacts are hash inventoried.

## Design

Implement `market/competitors.mjs` pure intake/comparison and `market/competitor-store.mjs` scoped persistence. Reuse competitors, products, vendors, evidence_sources, idempotency_keys, audit_events and outbox_events, with existing restricted market disposable store and migration target 6. Content-addressed immutable records use the existing tenant primary key, so this slice needs no schema or privilege changes. Legacy competitor JSON remains intact and is excluded by the new record kind.

Manual records bind product/vendor/category/source IDs, canonical HTTPS URL, evidence digest, collection/event/period timestamps, region, feature ID, nullable Boolean declaration and manual reference. A declaration describes the submitted candidate assertion. Confidence and review remain UNKNOWN/unreviewed. Missing declared value stays null. Comparison selects an explicit compatible region/period and includes every requested subject/feature, reporting absent/unknown/conflicting inputs. Contradictory immutable corrections remain visible until a future reconciliation scope. Results have reproducible input digests and contributing record IDs. No numerical ranking is introduced.

Apply captures detached validated inputs before awaiting, validates authoritative source/product/vendor bindings, serializes per tenant and atomically writes records/idempotency/audit/outbox. Compare joins current references in the same database statement and rejects stale bindings. Bounds are ten imports, five subjects, ten features and one hundred comparison records. Existing transaction/input/URL/date conventions are reused. Read/write entry remains the owned disposable market test database.

## Test sequence and gates

1. Pure RED for immutable intake, chronology/URL/provenance/value bounds, hostile getters, reproducibility, requested-but-missing subjects, conflicts and static export leakage. Implement minimum GREEN.
2. Real PostgreSQL RED for unavailable store, then GREEN for source/vendor/tenant binding, concurrent idempotency, caller mutation, conflict visibility, source corrections, append-only privileges and actual audit/outbox rollback. Append a separate competitor integration file to the existing market harness, with independent fixture organizations.
3. Independent security review per requesting-code-review. Fix regressions with tests and rerun full approved Node/data/fresh build/preflight. Inspect preserved report hashes and scoped secret patterns.
4. Normal scoped development push and existing non-deploying exact-SHA Chromium/axe CI. Inspect completed Linux symlink/test/browser/artifact evidence and deployment records. Write separate local checkpoint and stop after Phase 3B.

Budget INR 0. Real owner provisioning, evidence approval and hosted UAT remain owner gates. Existing policies, package pins, hosting, pending PRs and protected branches retain their gates.

## Methodology references

Applied manually from current public gstack [plan-eng-review](https://github.com/garrytan/gstack/blob/main/plan-eng-review/SKILL.md), [review](https://github.com/garrytan/gstack/blob/main/review/SKILL.md), [qa](https://github.com/garrytan/gstack/blob/main/qa/SKILL.md), [ship](https://github.com/garrytan/gstack/blob/main/ship/SKILL.md). Requested investigate URL returned 404. Superpowers [writing-plans](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md), [TDD](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md), [systematic-debugging](https://github.com/obra/superpowers/blob/main/skills/systematic-debugging/SKILL.md), [verification](https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md), [requesting-code-review](https://github.com/obra/superpowers/blob/main/skills/requesting-code-review/SKILL.md). Methods run with existing tooling.
