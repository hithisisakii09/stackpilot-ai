# Phase 9 — End-to-End Validation, Security Verification & Recovery Drills

**Branch:** `feature/phase-9-validation-recovery-drills-2026-11-26`  
**Parent Commit:** `ce3ad41a1586f8eb366910cef944f3275c24a700` (Phase 8)  
**Status:** Pre-Launch Verification & Recovery Hardening (`0001`–`0011` unchanged, `migration-crlf=0`)

## 1. Cross-Phase Verification Matrix (Phases 1–8)

| Phase | Domain | Key Invariant Verified |
|---|---|---|
| 1A–1C | Domain Governance, Persistence, Identity & Approvals | Signed Ed25519 sessions, `stackpilot_control` / `stackpilot_app` RLS, independent owner approvals |
| 2A–2B | Durable Runner & Scheduler | Zero-cost (`cost_inr = 0`) tasks, bounded retries, advisory locks |
| 3A–3D | Market Observations, Competitors, Reconciliation, History | Candidate-only evidence, no self-promotion, strict URL/date bounds |
| 4A–4C | Product Candidates, Claim Lifecycle, Pricing Projection | `affiliateUrl: null`, revoked/expired claim invalidation |
| 5A–5B | Public Comparison Picker, Keyword Clusters, Editorial Drafts | Zero inline JS, `null` unknown metrics, evidence-bound spans |
| 6 | 12-Step Brand Partnerships & Revenue Ledger | Owner-gated steps 5 & 11, integer minor units, forecast vs. actual separation |
| 7 | Multi-Model AI Router & Engineering Intelligence | `free`/`local` only (`estimatedCostMinor === 0`), secret redaction, advisory triage |
| 8 | Private Admin UI / Local Control-Plane Console | Loopback HTTPS only, 401/403/CSRF, CSP `default-src 'none'`, zero `dist/` leakage |

## 2. Deterministic Recovery Drills

1. **Snapshot Integrity & Restore Verification (`src/platform/recovery/drills.mjs`):**
   - Canonical JSON sorting + SHA-256 digest verification over tenant-scoped snapshots.
   - Enforces `monthlyBudgetInr === 0`, `delegatedSpendInr === 0`, `publicAffiliateUrl === null`, strict forecast vs. actual separation, and `null` preservation for unknown metrics.
   - Zero secret/token fields permitted in snapshots or drill reports.
2. **Migration & Source Integrity Drill:**
   - Verifies LF-only bytes (`migration-crlf === 0`) and exact SHA-256 manifests for `0001`–`0011`, plus `local-control-plane-source.mjs` pins.
3. **Security & Revocation Matrix Drill:**
   - Validates fail-closed outcomes: revoked session → `401`, non-owner mutation → `403`, cross-tenant spoof → `403`, CSRF/origin mismatch → `403`, paid AI tier → `budget_violation`, secret prompt → `secret_detected`.
4. **Offline CLI (`scripts/platform-recovery-drill.mjs --json`):**
   - Executes all offline drills deterministically and exits `0` only on full `overallStatus: 'pass'`.

## 3. Phase 10 Launch-Gate Handoff Criteria

- Remote Ubuntu PostgreSQL 18.7 (`node scripts/platform-db-test.mjs` — all 18 suites including `platform-e2e-recovery.test.mjs`) GREEN.
- Remote Chromium acceptance (`node scripts/browser-acceptance.mjs`) GREEN.
- Explicit human owner sign-off, legal/privacy review, and separate authorization remain required before any public launch or monetization change.
