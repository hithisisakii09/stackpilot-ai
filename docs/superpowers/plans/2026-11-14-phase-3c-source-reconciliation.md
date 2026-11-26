# Phase 3C candidate source reconciliation

Verified parent `b821e0b173c51a168cc83016b5c421b3cdc16ec2`, successful CI 43619513641, unchanged pending PR heads. Branch `feature/phase-3c-source-reconciliation-2026-11-14`. Twenty-one untracked artifacts are hash inventoried.

## Design and trust boundary

Add `market/reconciliation.mjs` and `market/reconciliation-store.mjs`. Pure normalization binds domain, original/correction IDs and content digests, compatible subject/category/dimension/region/period, reason and unreviewed state. Corrections preserve all original records. Each original has one outgoing candidate correction, with cycles and ambiguous competing successors rejected. Links describe proposals and never establish evidence authority. A stale source or candidate correction keeps affected results UNKNOWN. Existing strict market/competitor APIs retain their behavior. Additive reconciled analysis reuses their deterministic calculations and returns annotated history with contributor/link digests.

Migration 7 adds append-only reconciliation_links with domain-specific nullable market/competitor FK pairs, tenant isolation, one-successor uniqueness, immutable candidate envelopes and SELECT/INSERT grants. Preserve canonical migrations 1–6 and default target1. Update explicit migration CLI target and unknown-target boundary. Persistent entry uses the existing owned disposable market database. The correction target must match current scoped source/product/category/vendor declarations. The original may retain a stale source declaration. Analysis joins current bindings and candidate links in one statement snapshot. Bounds remain five subjects, ten dimensions and one hundred records/links, with explicit overflow denial. Link proposal and idempotency/audit/outbox commit atomically under existing tenant locking.

## Test-first sequence

1. Pure RED for complete links, immutable digests, chronology/context/authority denial, cycles/competing corrections, stale/conflicting/absent evidence, reproducibility and static-export exclusion. Implement minimum GREEN using existing validators and analysis.
2. Canonical migration RED and real PostgreSQL target7 upgrade/fresh/idempotency/FK/RLS/privilege/rollback acceptance. New integration suite uses independently scoped fixtures in the existing market harness.
3. Exercise concurrent proposals, tenant/source substitution, post-await mutation, stale binding, coherent analysis, history preservation and actual outbox-trigger rollback. Missing tooling remains a blocker rather than feature RED.
4. Independent read-only security review. Full approved Node/data/fresh-build/preflight checks. Hash-verify preceding artifacts and inspect outgoing diff for secrets.
5. Normal scoped branch push, existing non-deploying exact-SHA Linux/Chromium/axe CI, completed logs/artifact/deployment inspection. Write separate local checkpoint and stop after Phase3C.

Existing approved Node24.22.1/npm10.9.9/PostgreSQL18.6 and current package pins are used. Budget INR0. Owner provisioning, independent review and authenticated hosted UAT retain separate gates.

## Methodology references

Current public gstack [plan-eng-review](https://github.com/garrytan/gstack/blob/main/plan-eng-review/SKILL.md), [review](https://github.com/garrytan/gstack/blob/main/review/SKILL.md), [qa](https://github.com/garrytan/gstack/blob/main/qa/SKILL.md), [ship](https://github.com/garrytan/gstack/blob/main/ship/SKILL.md) applied manually. Requested investigate URL returned404. Superpowers [writing-plans](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md), [TDD](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md), [debugging](https://github.com/obra/superpowers/blob/main/skills/systematic-debugging/SKILL.md), [verification](https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md), [requesting-code-review](https://github.com/obra/superpowers/blob/main/skills/requesting-code-review/SKILL.md). Existing tooling supplies the workflow.
