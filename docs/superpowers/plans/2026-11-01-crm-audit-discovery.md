# Private CRM audit discoverability — test-first implementation

Date: 2026-11-01. Scope: development branch and draft PR #1 only.

## Problem and decision
The browser-only CRM paid-seat audit was reachable from the cost tool, but not discoverable from the homepage. Buyers should see the tool in the homepage navigation and a contextual, neutral CTA without implying verified vendor prices or refunds. Reuse the existing page; do not create routes, external services or new dependencies.

## Implementation and verification
1. **RED (observed):** added homepage link/CTA checks in `scripts/check-build.mjs` and a keyboard navigation browser check in `scripts/browser-acceptance.mjs`. At test-only commit `f77f06b`, [Validate and build](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41275450021) failed specifically at `scripts/check-build.mjs:21` with “Homepage must link to private CRM seat audit”. This is an intentional fail-before-fix; the complete browser test had not established RED.
2. **GREEN change:** add one navigation link and contextual homepage CTA in `src/pages/index.astro`. Link to the existing `/tools/crm-seat-audit/` page. Describe the calculations as buyer-entered and contract-dependent.
3. **Required verification:** successful exact-head GitHub build/static preflight, Chromium desktop/mobile and keyboard navigation, safety/ops status, GitHub Netlify Deploy Preview status. Verify no horizontal overflow. Check `main` unchanged and PR still draft.

## Trust boundaries
No affiliate tracking, vendor prices, earnings claims or customer data. Tool remains client-only. No indexing, public launch, provider setting changes, affiliate activation, contracts or paid services; ₹0 budget unchanged. Successful local GitHub CI does not prove authenticated remote Netlify UAT or account Private/Locked/billing settings.

## Method sources
gstack engineering-plan review and Superpowers test-driven-development, verification-before-completion. No external scripts or skills installed.
