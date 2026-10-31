# Phase 2.4 — Privacy-first buyer requirements worksheet and editorial claim drafts

## Purpose
Bring the private StackPilot MVP closer to offering genuinely useful decision support rather than thin affiliate links. The tool supports user-owned requirements and does **not** rank or make unverified vendor claims. The editorial research output remains unpublished, with exact first-party references and unapproved status.

## Sources / method
- gstack pre-landing review and QA checks; Superpowers RED→GREEN TDD and verification before completion (public upstream SKILL.md read for this sprint).
- Vendor evidence from official help/docs; separate vendor claims from editorial approval. Drafts kept in `docs/editorial-drafts/`, not public routes, and labeled not approved.
- Node 22.23.4, Astro 7, zero new npm dependencies.

## Task 1: Generic browser-only worksheet
1. Write failing unit tests for `src/lib/buyer-worksheet.mjs` with: allowed categories CRM/SEO/Hosting; validated criterion IDs; deterministic labels; no vendor product data/affiliate links; no telemetry; newline-safe plain-text export.
2. Add static build and Chromium desktop/mobile route expectations for `/tools/requirements-checklist/`; verify RED.
3. Implement pure data model and Astro route with useful checkboxes for category-specific needs. Controlled DOM APIs only; no analytics, cookies, storage, remote submission or service signup. Generate a downloadable/copyable plain-text user worksheet, with exact questions to verify with providers.
4. Update homepage navigation to link to tool; update static route count and preview-package HTML count to 13.
5. Verify Node, build, Chromium/axe, and Netlify private Deploy Preview status.

## Task 2: Editorial preparation, kept unpublished
- Record exact official vendor source links and date researched for CRM migration and hosting cost/limit comparisons.
- No site content presents data as "reviewed," no invented prices or product score, and no publication.
- Add owner-release-gate checklist to drafts for future editorial review.

## Hard gates
Keep Netlify production and previews PRIVATE; auto-publishing locked; draft PR unmerged; `main` unchanged; no public launch, indexing, affiliate URLs, account creation, contracts, outreach, spend or actual earnings claims. ₹0 delegated/monthly cash budget. ChatGPT scheduled tasks operate subject to actual permissions and limits.

## Acceptance
- Unit tests RED and GREEN with evidence.
- 13 Astro static routes, all noindex; preview package 13 HTML routes, security headers and robots still present.
- Chromium desktop/mobile checks show worksheet works, no JS console errors, no horizontal overflow, no WCAG axe violations on tested states.
- PR updated with exact commit / CI evidence and remaining manual approval gates.
