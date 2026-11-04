# CRM migration buyer guide — private development plan (2026-10-31)

## Goal
Provide original buyer-intent guidance for evaluating CRM migration without claiming vendor testing, pricing, rankings or affiliate entitlement.

## Delivery and validation
1. Add source-level regression tests requiring noindex/nofollow, practical migration steps, existing worksheet and calculator links, and no script/form/network endpoints.
2. Implement `src/pages/guides/crm-migration-checklist/index.astro` as a static, accessible guide with synthetic-data testing and explicit human export/privacy approval.
3. Run Node tests, catalog checks, static build, Chromium desktop/mobile, accessibility and exact-head PR status checks. Link the guide from relevant navigation only after tests.
4. Keep vendor-specific source research in candidate-only editorial queue. Obtain authenticated human review before endorsing a product or public publishing.

## Evidence limitations
The test file was committed at `a2cca5c` before the route at `e552623` (expected RED on the first commit by inspection; **no executed RED workflow was independently recorded**). The latest SHA requires exact-head successful CI and browser verification; a commit alone does not prove passing tests.

## Owner and release guards
₹0 monthly and delegated budget. GitHub development branch and draft PR only; Netlify private preview/production remain private, production auto publishing locked. No merge, index, public deployment, affiliate application/activation, contracts, purchases or provider-plan changes without separate owner authorization. Production verdict stays NO-GO until evidence and owner gates are satisfied.
