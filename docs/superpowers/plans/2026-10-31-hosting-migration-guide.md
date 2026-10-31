# Private hosting migration buyer guide — 2026-10-31

## Goal and value
Create original vendor-neutral educational content for small agencies planning to move a website to another hosting provider. This fills StackPilot's hosting-category buyer-intent gap and helps users evaluate migration risks rather than asserting unverified provider features or prices.

## Delivery
1. Add a static route `src/pages/guides/hosting-migration-checklist/index.astro` with actionable sections for DNS/email inventory, backups and restore rehearsal, TLS/security, redirects and dependencies, staged testing, rollback checkpoints, post-cutover monitoring and cost/contract assessment.
2. Include a keyboard-accessible, mobile-friendly go/no-go checklist with explicit evidence/owner fields and a disclaimer that an uninterrupted migration cannot be guaranteed.
3. Link from existing homepage and relevant existing buyer tools; do not invent pricing, vendor guarantees, data transfer claims, affiliate benefits or rankings.
4. Write a source regression test FIRST, confirm expected RED in Node/GitHub CI, then write the guide and navigation link. Add desktop/mobile Chromium and axe coverage, plus build smoke protection.
5. Verify exact HEAD build/ops/browser and Netlify private Deploy Preview. A successful private build is not authenticated remote QA, legal review or publication approval.

## Required safeguards
- ₹0/month, delegated spend ₹0; no commercial contracts, signups, purchases, APIs or new dependencies.
- Keep Astro static and `noindex, nofollow`, and preserve `robots.txt`, static security headers and Netlify Private/Locked settings.
- No public launch, affiliate activation, paid tools or merge to `main`; research claims remain candidate/unapproved.
- Avoid requiring or storing real DNS credentials, customer exports, contact details, payment information or web analytics.
- TDD/QA methodology: Superpowers test-first → observed RED → GREEN → full verification; gstack page review, accessibility and browser QA. Read source skill guidance before this sprint.
