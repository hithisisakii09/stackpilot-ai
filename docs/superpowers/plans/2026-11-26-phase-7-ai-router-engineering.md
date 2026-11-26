# Phase 7 — Multi-Model AI Router & Engineering Intelligence

**Branch:** `feature/phase-7-ai-router-engineering-2026-11-26`  
**Parent Commit:** `b710929f4083411a37c96697adb7b0af1e59e4cd` (Phase 6)  
**Status:** Internal / Pre-Launch Only (`noindex, nofollow`, `affiliateUrl: null`, `monthly_budget_inr = 0`, `delegated_spend_inr = 0`)

## 1. Scope & Non-Goals

Phase 7 introduces a deterministic, zero-cost multi-model AI router and an offline engineering intelligence engine, backed by tenant-scoped `audit_events` persistence (`0001_platform_foundation.sql`) with no new SQL migrations (`0001`–`0011` preserved byte-for-byte), zero npm dependencies, and zero live outbound network calls.

- **In Scope:**
  - `src/platform/ai/router.mjs` — task-class routing (`classification`, `extraction`, `editorial_draft`, `code_review`, `incident_triage`, `summarization`), zero-cost (`tier: 'free' | 'local'`, `estimatedCostMinor === 0`) and quota enforcement, deterministic fallback & circuit-breaker selection, secret redaction/rejection, and append-only routing telemetry records (`null` for unknown latency/token metrics).
  - `src/platform/engineering/intelligence.mjs` — CI/validation health diagnostics (`healthy`, `degraded`, `blocked`), baseline-vs-candidate regression triage (`migration_drift`, `security_audit`, `contract_mismatch`, `browser_acceptance`, `test_failure`, `leakage_violation`), advisory remediation plans, and owner-only high-impact engineering action proposals.
  - `src/platform/ai/store.mjs` and `src/platform/engineering/store.mjs` — tenant-scoped `audit_events` persistence using `withTransaction` (`stackpilot_app` + forced RLS `stackpilot.organization_id`) and `withAuthenticatedTransaction` (`stackpilot_control`) for signed identity/owner gates.
  - `tests/integration/platform-ai-engineering.test.mjs` wired into `scripts/platform-db-test.mjs` (with `ALTER ROLE stackpilot_control NOLOGIN` in `finally`).
  - Static leakage guards in `src/lib/local-control-plane-export.mjs`.

## 2. Multi-Model AI Router Policy

- **Allowed Tiers:** `'free' | 'local'` only; `'paid'` or `estimatedCostMinor !== 0` is hard-rejected (`budget_violation`).
- **Fail-Closed Denial Reasons:** `no_eligible_model`, `quota_exceeded`, `budget_violation`, `context_limit_exceeded`, `secret_detected`.
- **Prompt & Telemetry Hygiene:** Secret-like patterns (`sk-...`, `ghp_...`, `AIza...`, `Bearer ...`, `-----BEGIN ... PRIVATE KEY-----`, credential URLs `https://user:pass@...`) are rejected/redacted before telemetry emission.

## 3. Engineering Intelligence & Owner Gates

- **Unknown Metrics:** `null` is preserved for any uncollected CI/validation metric (never coerced to `0`).
- **Owner-Gated Actions:** `dependency_update`, `schema_migration_proposal`, and `release_gate_override` require a signed `owner` principal (`actorRole === 'owner'`, `actorId !== requesterId`) via `withAuthenticatedTransaction(identity, handle, true, ...)`. `reviewer` and `agent` actors are explicitly denied.
