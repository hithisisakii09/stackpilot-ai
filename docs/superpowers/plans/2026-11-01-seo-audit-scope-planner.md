# SEO audit scope planner Implementation Plan

> **For agentic workers:** Apply Superpowers test-driven-development (RED → GREEN), gstack review/QA, and verification-before-completion. Do not run untrusted skill installation scripts.

**Goal:** Give small agencies a useful, offline, vendor-neutral worksheet to estimate their intended Site Audit URL inventory before checking their own tool's allowance.

**Architecture:** A pure `src/lib/seo-audit-scope.mjs` accepts exact user-supplied counts for mutually exclusive root, selected-folder and subdomain groups, opt-in toggles and a user-supplied planning cap. The browser-only `/tools/seo-audit-scope/` page calculates a copyable, clearly unverified planning report. No crawling, network, storage, affiliate or provider-claim logic.

**Tech Stack:** existing Astro static, Node >=22.23.4, `node:test`, existing Chromium/axe CI, no new packages.

**Spec:** `docs/growth/2026-10-31-zero-budget-organic-acquisition-pipeline.md` (P3 Site Audit scope planning), `docs/current-operational-state.md`, `AGENTS.md`.

## Global constraints
- ₹0 monthly and delegated spending; do not add packages or hosted services.
- Keep Netlify production/preview private and auto-publishing locked; never merge `main`, launch, index, or activate affiliates.
- Tool is **not** a live crawl, a verified index count, a traffic forecast, an official vendor-specific cap, or a promise that all pages will be audited.
- Counts must represent disjoint groups; user must inspect redirects, canonicalization, robots exclusions, and plan-specific credit rules outside this calculator.
- Local-only data; no external scripts or submissions; invalid input clears stale results; desktop/mobile accessibility required.

## Review focus
- Leading zeros, whitespace, decimal, scientific notation, negative, overflow and noninteger counts must be rejected.
- No included pages should yield EMPTY_SCOPE, not falsely "within limits".
- Categories excluded by toggles must not contribute to planned total.
- Above the user-entered page cap must be a *planning* warning; never a vendor claim.
- Editing/resetting any input must clear the report and disable copying.

### Task 1: pure calculator and report
**Files:** Create `tests/seo-audit-scope.test.mjs`, `src/lib/seo-audit-scope.mjs`.

**Interfaces:** `planSeoAuditScope(input)`, `formatSeoAuditScopeReport(result)`.

- [ ] Commit tests first and verify expected RED on CI.
- [ ] Implement strictly validated integer (0–1,000,000) and boolean input fields.
- [ ] Distinguish included count, excluded count, remaining user-cap, excess count and EMPTY_SCOPE/WITHIN_USER_CAP/ABOVE_USER_CAP.
- [ ] Ensure output marks `verified:false`, `crawlCredits:null`, `providerAllowanceVerified:false`, with vendor-agnostic privacy caveats.

### Task 2: private UI and full verification
**Files:** Create `src/pages/tools/seo-audit-scope/index.astro`; modify `src/pages/index.astro`, `scripts/browser-acceptance.mjs`, and tests as needed.

- [ ] Keep static `noindex` and local-only event handling, keyboard access, clear labels, copy fallback.
- [ ] Browser test 80+20+40 entries with root+folder selected only: 100 included, 40 excluded; user cap 90 => 10 above. Toggle subdomains and recalculate => 140 included and 50 above.
- [ ] Change value and confirm stale report cleared; invalid input cannot copy, reset stays empty.
- [ ] Validate mobile viewport 390px and axe.
- [ ] Verify exact-head GitHub Actions build, ops, Chromium and Netlify private-preview status separately. GitHub status does not prove authenticated hosted UAT.
- [ ] Update draft PR handoff only; release remains NO-GO.
