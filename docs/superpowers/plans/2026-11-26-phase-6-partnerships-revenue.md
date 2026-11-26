# Phase 6 — Brand Partnerships & Deterministic Revenue Ledger

**Branch:** `feature/phase-6-partnerships-revenue-2026-11-26`  
**Parent Commit:** `5513ede026f18b244c883b8af3d2599a02e13e0b` (Phase 5B)  
**Status:** Internal / Pre-Launch Only (`noindex, nofollow`, `affiliateUrl: null`, `monthly_budget_inr = 0`, `delegated_spend_inr = 0`)

## 1. Scope & Non-Goals

Phase 6 implements an internal, tenant-scoped 12-step brand partnership onboarding state machine and a deterministic, append-only revenue ledger using integer minor-unit arithmetic. No public site output, `affiliateUrl: null`, `noindex, nofollow`, or budget constraints are altered.

- **In Scope:**
  - `src/platform/partnerships/lifecycle.mjs` — 12-step state machine (`discovered` → ... → `active`) + terminal/recovery states (`rejected`, `paused`, `revoked`) with strict fail-closed transition guards, HTTPS/non-tracking URL checks, and owner-only approval gates.
  - `src/platform/revenue/ledger.mjs` — integer minor-unit revenue ledger (`entryType: 'forecast' | 'actual'`, `entryKind: 'initial' | 'adjustment' | 'reversal'`), strict currency non-mixing, explicit `null` unknown metrics, and immutable statement binding for actuals.
  - `src/platform/persistence/migrations/0011_partnerships_revenue_ledger.sql` (+ `partnerships-revenue-schema.mjs`, `partnerships-revenue-manifest.json`, `migrate.mjs`) — proven schema gap fix: `0001_platform_foundation.sql` only granted `SELECT` on `external_statements` and `commission_records` to `stackpilot_app` and constrained `commission_records.amount_minor >= 0` without `entry_kind` or `reverses_entry_id`. Migration `0011` grants `SELECT, INSERT` on `external_statements` to `stackpilot_app` and creates RLS-enforced append-only `revenue_ledger_entries`.
  - `src/platform/partnerships/store.mjs` and `src/platform/revenue/store.mjs` — tenant-scoped PostgreSQL stores using `withAuthenticatedTransaction` (`stackpilot_control`) for signed session/owner gates and `withTransaction` (`stackpilot_app`) with forced RLS (`stackpilot.organization_id`).
  - `tests/integration/platform-partnerships-revenue.test.mjs` wired into `scripts/platform-db-test.mjs`.
  - Static leakage guards in `src/lib/local-control-plane-export.mjs`.

## 2. 12-Step Partnership State Machine

1. `discovered`
2. `program_verified`
3. `requirements_checked`
4. `application_drafted`
5. `owner_application_approved` *(owner-only gate)*
6. `application_submitted`
7. `under_review`
8. `partner_approved`
9. `terms_verified`
10. `tracking_verified`
11. `owner_activation_approved` *(owner-only gate)*
12. `active` *(strictly internal control-plane state; never mutates public `affiliateUrl: null`)*

Recovery/terminal states: `rejected`, `paused`, `revoked`.

- Transitions must advance strictly by `+1` step (no skipping), or move to `rejected` / `paused` / `revoked` per explicit rules, or reset from `rejected` / `paused` back to `discovered` (step 1) for explicit re-application.
- Discovery/verification URLs must be `https://` without tracking/referral query params (`ref`, `aff`, `utm_*`, `partner_id`, `click_id`).
- Future or impossible dates are rejected fail-closed.

## 3. Deterministic Revenue Ledger Contracts

- **Integer Minor Units:** `amountMinor` is strictly a safe integer (`Number.isSafeInteger`). No floating-point currency math and no silent cross-currency FX conversion (`summarizeRevenueByCurrency` groups strictly by 3-letter ISO `currency`).
- **Forecast vs. Actual Separation:**
  - `entryType: 'forecast'` — non-authoritative scenario/projection; never included in `actualTotalsByCurrency`.
  - `entryType: 'actual'` — requires `statementId`, `statementDigest` (64-char hex SHA-256), `periodStart`, `periodEnd` (`periodEnd >= periodStart`), and `recordedAt` (non-future).
- **Unknown Metrics:** `clicks`, `conversions`, `payoutMinor`, and `commissionRateBps` preserve explicit `null` when unknown (never coerced to `0`).
- **Append-Only Adjustments/Reversals:** `entryKind: 'initial'` requires `amountMinor >= 0` and `reversesEntryId: null`; `entryKind: 'adjustment' | 'reversal'` requires non-null `reversesEntryId` referencing an existing entry in the same currency and `entryType`.
