# Phase 8 — Private Admin UI / Local Control-Plane Operator Console

**Branch:** `feature/phase-8-private-admin-ui-2026-11-26`  
**Parent Commit:** `6fdfcb9190dc7c62f4fa4f153a0997a0ebf26320` (Phase 7)  
**Status:** Localhost-Only Control-Plane UI (`127.0.0.1`, zero public Astro exposure, `noindex, nofollow`)

## 1. Architecture & Strict Public Isolation

- **Zero Public Exposure:** All Phase 8 presenters, HTML templates, and route handlers live strictly under `src/platform/admin-ui/` and `src/control-plane/`. Nothing is placed in `src/pages/`, `public/`, or `dist/` (which remains 28 static pages with `noindex, nofollow` and `affiliateUrl: null`).
- **Zero New Dependencies & Zero Budget:** Pure server-rendered HTML/CSS in Node.js (`monthly_budget_inr = 0`, `delegated_spend_inr = 0`).
- **No New SQL Migrations:** Reuses `0001`–`0011` (`0001`–`0011` preserved byte-for-byte, `migration-crlf=0`).

## 2. Security Headers & Auth/CSRF/RLS Boundaries

- **Response Headers:**
  - `Content-Security-Policy`: `default-src 'none'; style-src 'self' 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`
  - `X-Content-Type-Options`: `nosniff`
  - `Referrer-Policy`: `no-referrer`
  - `Cache-Control`: `no-store`
  - `X-Robots-Tag`: `noindex, nofollow`
- **Authentication & Authorization:**
  - Every `/admin*` route requires a valid `__Host-stackpilot_session` cookie authenticated via `identity.authenticate(credentials)` (401 when missing/invalid).
  - Every `POST` mutation requires `Origin === origin` and valid `x-csrf-token` verified via `identity.verifyCsrf(handle, csrf)` (403 when missing/invalid).
  - Read views (`GET /admin*`) are scoped strictly to `principal.organizationId` via forced RLS (`stackpilot.organization_id`).
  - Mutation endpoints (`POST /admin/approvals`, `POST /admin/proposals`) enforce `principal.role === 'owner'` (403 for `reviewer` and `agent`).
- **XSS Hygiene:** Every dynamic string is HTML-escaped (`&`, `<`, `>`, `"`, `'`), unsafe `javascript:`/`data:` URLs are rejected, and Proxy/prototype/undeclared inputs are rejected fail-closed.

## 3. Six Operator Console Views

1. `/admin` — Governance & Health Overview (zero-budget invariants, static `affiliateUrl: null` & `noindex`, engineering health status).
2. `/admin/approvals` — Pending/resolved signed approvals across claims, partnerships, and engineering proposals (mutation controls gated to `owner`).
3. `/admin/claims` — Vendor claim lifecycle states, pricing observation freshness, explicit `—` / `null` display for unknown metrics.
4. `/admin/partnerships` — Evidence-backed editorial draft verification status and 12-step brand partnership states.
5. `/admin/revenue` — Hard separation of `forecast` vs. statement-backed `actual` totals per ISO currency (integer minor-unit formatting, never mixing currencies).
6. `/admin/ai-engineering` — Zero-cost AI routing telemetry (`free` | `local`, `estimatedCostMinor: 0`, fallback/circuit-breaker events) and advisory regression triage.
