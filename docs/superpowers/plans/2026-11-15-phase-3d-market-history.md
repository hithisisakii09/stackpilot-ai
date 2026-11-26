# Phase 3D historical market analysis and seasonality readiness

Verified parent `5f08b052139d0f7c1dee9d9fe9a2d9bc610ffbcd`, successful CI43624954263 and tracked working tree. Branch `feature/phase-3d-market-history-2026-11-15`. Twenty-two existing untracked artifacts are hash inventoried. Pending PRs8/9/10/12/13/14/15 retain their recorded heads. New draft PR16 was observed at `dde8bc6d2cec4bc96c444865ccd026c7b90eaf40` and is preserved.

## Method and interfaces

Add `market/seasonality.mjs` with pure `prepareMarketHistorySelection` and `analyzeMarketHistory`, and additive `scope.historical` on the existing reconciliation store. Selection binds one supported metric, declared unit/region, up to five subject IDs and one through thirty-six completed UTC calendar months. Each month spans its first millisecond through the final millisecond before the next month. Months after the reference clock are rejected. Missing months produce explicit UNKNOWN cells.

Method `calendar-month-change-v1` calculates adjacent-month and matching-month prior-year absolute changes and relative percentages. Relative change is `(current-baseline)/baseline*100`, with six-decimal rounding. Zero baselines and nonfinite ratios retain null percentages and explicit reasons. Percentage declarations use percentage-point absolute units. Independent evidence confidence and review remain UNKNOWN/unreviewed.

One monthly value requires compatible complete provenance/units/periods, consistent current declarations and clean reconciliation/source bindings. Identical observations are deduplicated. Distinct agreeing sources remain contributors without summing or averaging values. Contradictory values, overlaps/partial-month periods, missing revision ancestors and revised period identity produce UNKNOWN. All immutable history contributes to digests. Latest series revisions supply candidate values, while changed/stale/unresolved history blocks affected periods.

Seasonality readiness requires at least twenty-four consecutive comparable requested months, representing two complete calendar cycles. Its positive result is sufficient-history plus method-review-required. It supplies coverage and review readiness. This is a documented engineering threshold selected for this slice.

Reuse Phase3C reconciliation annotation/graph validation through a shared helper and reuse its one-statement database snapshot reader. Historical reads include the complete selected subject/metric/region context, capped at one hundred records/related links, so revisions outside the displayed months remain visible. Read only existing tables at migration target7, default1. Existing opportunity/comparison entry points retain their contracts.

## Test-first sequence

1. Pure RED for monthly arithmetic, gap/overlap/unit/conflict handling, revisions, stale/linked evidence, zero denominators, bounded data, full-cycle readiness, deterministic digests and private export rejection. Implement minimum GREEN.
2. Real PostgreSQL tests in independent fixture organizations through the existing owned market database. Verify tenant isolation, source drift, reconciliation links, snapshot coherence, caller mutation, idempotent read outputs and zero database mutation from historical analysis.
3. Independent security review using approved Node24.22.1. Fix findings with regressions. Full existing Node/data/fresh build/preflight, prior report hash verification and bounded secret review.
4. Normal development branch push and existing non-deploying exact-SHA Linux/Chromium/axe CI. Inspect completed logs/artifacts/deployment records. Deliver separate checkpoint and stop after Phase3D.

Use existing Node24.22.1/npm10.9.9/PostgreSQL18.6 and package pins. Budget INR0. Owner provisioning, evidence acceptance and authenticated hosted UAT remain separate gates.

## Methodology references

Current public gstack [plan-eng-review](https://github.com/garrytan/gstack/blob/main/plan-eng-review/SKILL.md), [review](https://github.com/garrytan/gstack/blob/main/review/SKILL.md), [qa](https://github.com/garrytan/gstack/blob/main/qa/SKILL.md), [ship](https://github.com/garrytan/gstack/blob/main/ship/SKILL.md) applied manually. Requested investigate URL returned404. Superpowers [writing-plans](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md), [TDD](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md), [debugging](https://github.com/obra/superpowers/blob/main/skills/systematic-debugging/SKILL.md), [verification](https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md), [requesting-code-review](https://github.com/obra/superpowers/blob/main/skills/requesting-code-review/SKILL.md). Existing tooling supplies these methods.
