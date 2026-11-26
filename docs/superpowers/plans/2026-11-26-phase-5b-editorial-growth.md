# Phase 5B — Keyword Clusters & Evidence-Bound Editorial Drafts

**Branch:** `feature/phase-5b-editorial-growth-2026-11-21`  
**Parent Commit:** `381edd94d2da0921b1fc99f16efebb70ce9f8e5a` (Phase 5A)  
**Status:** Internal / Pre-Launch Only (`noindex, nofollow`, `affiliateUrl: null`, `monthly_budget_inr = 0`, `delegated_spend_inr = 0`)

## 1. Scope & Non-Goals

Phase 5B adds internal, tenant-scoped keyword clustering and evidence-bound editorial draft persistence without touching public Astro output, affiliate links, indexing, or budget controls.

- **In Scope:**
  - `src/platform/growth/keywords.mjs` — keyword normalization, deterministic cluster-key deduplication, search intent classification, explicit `null` preservation for unknown metrics (`volume`, `difficulty`, `cpc`), and strict prototype/Proxy defenses.
  - `src/platform/growth/editorial.mjs` — evidence-bound editorial draft construction and validation enforcing explicit `claimId` citations for every factual span, rejecting uncited factual spans, unapproved/stale/revoked evidence, prototype/Proxy payloads, and commission/affiliate/monetization fields.
  - `src/platform/growth/store.mjs` — tenant-scoped PostgreSQL store reusing `withAuthenticatedTransaction` (`src/platform/identity/sessions.mjs`) and `withTransaction` / RLS conventions (`src/platform/products/store.mjs`) against `0001_platform_foundation.sql` tables (`keyword_clusters`, `keywords`, `content`, `content_versions`, `content_claims`).
  - `tests/integration/platform-growth-editorial.test.mjs` — PostgreSQL integration tests for cross-tenant RLS isolation, keyword deduplication with `null` unknown metrics, and fail-closed editorial evidence enforcement, wired into `scripts/platform-db-test.mjs`.
  - Static leakage guards in `src/lib/local-control-plane-export.mjs` and `scripts/release-preflight.mjs` to block any Phase 5B implementation markers from entering `dist/`.
- **Out of Scope:**
  - No new SQL migrations (existing `0001_platform_foundation.sql` tables, RLS policies, and `stackpilot_app` / `stackpilot_control` grants suffice).
  - No npm dependency additions or `package.json` / `package-lock.json` edits.
  - No public site routes, indexing changes, auto-publishing, or affiliate activation.

## 2. Module Contracts

### 2.1 Keyword Clusters (`src/platform/growth/keywords.mjs`)
- **Normalization:** Lowercase, collapse internal whitespace to single spaces, trim, reject control characters / HTML brackets / empty strings, and reject prototype/Proxy/forbidden keys (`__proto__`, `constructor`, `prototype`, `affiliate*`, `commission*`, `referral*`, `tracking*`, `payout*`, `revenue*`).
- **Cluster Key & Deduplication:** Deterministic normalized cluster key (`normalizeClusterKey`) derived from normalized tokens sorted or joined canonically so equivalent phrases/variants deduplicate deterministically per tenant.
- **Intent Classification:** Deterministic rule-based classification into `comparison`, `commercial`, `transactional`, `navigational`, or `informational`.
- **Unknown Metrics:** `volume`, `difficulty`, and `cpc` default to `null` when omitted or unknown. Never fabricate estimates; accept only `null` or finite non-negative numbers (with `difficulty` bounded `0..100`).

### 2.2 Evidence-Bound Editorial Drafts (`src/platform/growth/editorial.mjs`)
- **Draft Structure:** `{ id, categoryId, title, status: 'draft', spans: [...], evidenceBindings: [...] }`
  - `status` must always be `'draft'`.
  - Every span has `{ id, kind: 'factual' | 'framing' | 'editorial', text, claimIds }`.
  - Every `factual` span MUST have at least one valid `claimId` in `claimIds`, and every cited `claimId` MUST exist in `evidenceBindings` with `status === 'approved'` and `stale === false` and `revoked === false`.
  - `framing` and `editorial` spans must not smuggle uncited factual claims or monetization/affiliate fields.
- **Fail-Closed Rejections:** Reject uncited factual spans, unknown/unapproved/stale/revoked evidence references, prototype/Proxy payloads, non-`draft` statuses, and any commission/affiliate/monetization keys or `affiliateUrl !== null`.

### 2.3 Tenant-Scoped PostgreSQL Store (`src/platform/growth/store.mjs`)
- **Authentication & RLS Boundary:**
  - Uses `withAuthenticatedTransaction(identity, handle, false, ...)` to authenticate the caller session and verify cited claims against `inspectClaimLifecycle` (`stackpilot_control`).
  - Uses `withTransaction(appPool, { organizationId, actorId, requestId }, ...)` (`stackpilot_app`) with `SET LOCAL stackpilot.organization_id` and `FORCE ROW LEVEL SECURITY` on `keyword_clusters`, `keywords`, `content`, `content_versions`, and `content_claims`.
- **Idempotency & Immutability:**
  - Keyword cluster writes are idempotent per tenant by deterministic cluster/keyword IDs derived from normalized keys (`ON CONFLICT DO NOTHING` + conflict check if intent/name mismatch).
  - Editorial draft writes validate the draft and re-verify every cited `claimId` inside the authenticated transaction before inserting into `content`, `content_versions` (`status = 'draft'`), and `content_claims`.
