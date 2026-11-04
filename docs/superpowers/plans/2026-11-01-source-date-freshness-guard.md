# 2026-11-01 — Source-date freshness guard (private research operations)
**Status:** TDD implementation plan for draft PR #1 only; ₹0 delegated spend.

## Current issue
`src/lib/research-audit.mjs` uses `newest = max(parsed checkedAt)` and derives `ageDays = floor(today - newest)`. A structurally valid but **future-dated** `checkedAt` yields negative `ageDays`, is treated as a current source (no `source-refresh-required`), and can mask an actually stale source. Malformed dates in a list with one valid recent source are silently discarded, hiding provenance problems. The public research workbench uses a separate stricter `evidence-ledger.mjs`, but agents/tools relying on the offline audit should not be able to launder stale evidence.

## Expected behavior
- Never treat future source dates or malformed dates as proof of source freshness. Source dates must not be later than the caller-provided exact `today`, a deterministic snapshot date.
- Keep the existing output schema (`latestSourceDate`, `ageDays`, `sourceCount`, `blockers`, identifiers) and preserve normal behavior for genuine current/stale dated records.
- Compute latest accepted source date from valid `checkedAt <= today` only; output `null` age/date if none qualifies. Report `future-source-date` for a future calendar date and `invalid-source-date` for malformed or absent dates. In both cases always add `source-refresh-required` even if another record is current. They remain an unapproved editorial review task.
- Handle missing/null source records without exceptions, retain source count and never mutate product inputs.
- Validate and test the behavior of invalid option fields if needed, without modifying real catalog dates or global time.
- Keep all six actual vendor claims `approved:false` and all other launch/affiliate gates unchanged. No network or browser state is required for this pure offline module.

## Test steps (Superpowers test-driven development)
1. Update the existing `tests/research-audit.test.mjs` first with future-only, mixed stale/future, mixed current/malformed and same-day nonregression. Commit tests and inspect exact-head CI RED.
2. Implement the minimal logic to ignore untrustworthy dates in freshness comparisons, expose explicit blockers and require refresh; commit.
3. Inspect exact-head build/ops/Chromium runs and Netlify Deploy Preview provider commit status. Record evidence in PR comment.
4. Keep draft PR, main, production, domain, private Netlify Access, pricing, affiliates, schedules and ₹0 locks unchanged. Actual-host authenticated UAT remains owner-only and NO-GO.

Methods: repo `AGENTS.md`; read gstack plan-eng-review/review/QA and Superpowers TDD/verification-before-completion read-only skill docs this session. No skill installation or external scripts.
