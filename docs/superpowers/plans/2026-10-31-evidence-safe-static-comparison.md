# Consistent Static and Interactive Comparison — 2026-10-31

> Engineering sequence: gstack Think → Plan → Build → Review → Test → Verify; Superpowers writing-plans, test-driven-development, and verification-before-completion.

## Purpose
The no-JavaScript static category tables currently read `product.supportedTeams` and truthiness of `product.verified` directly. This could expose asserted fit or editorial approval for an unverified catalog record even though the interactive comparison correctly requires `verified === true`. Eliminate presentation drift by sharing an evidence-safe projection.

## Testable implementation
1. In `tests/comparison.test.mjs`, add tests for `categoryComparisonRows(products, category)` checking alphabetical order, identical review labels to `compareCandidates`, preserved unknown pricing and team fit, `verified: 'true'` rejected as an approval signal, and no source mutation. Capture expected RED before implementing.
2. Export `categoryComparisonRows` from `src/lib/comparison.mjs`: reuse `categoryCandidates` and `info` to map the same guarded model for each category. No new product claims or scores.
3. In `src/pages/compare/index.astro`, use `comparisonCategories` for categories and `categoryComparisonRows` in the static table. Display pre-labeled overview, `teamFit`, `pricing` and `editorialStatus`. Client interactive behavior unchanged.
4. In `scripts/browser-acceptance.mjs`, assert static rows never imply verified team suitability/pricing and the alphabetical order is stable across CRM/Hosting/SEO. Continue desktop/mobile, axe checks.
5. Inspect exact-head GitHub build+tests, operations+security, Chromium acceptance and Netlify private deploy-preview; do not declare green based only on commit.

## Constraints and risks
- Development branch and draft PR #1 ONLY; keep `main`, production, Netlify visibility and locking, noindex, and affiliates untouched.
- All six catalog products remain unverified; no invented prices/fit/rankings; no research approvals.
- ₹0 budget; no new dependencies, accounts, contracts or public promotion.
- Risks: circular imports in Astro frontmatter, accidental duplicate tables, row ordering/label changes, browser accessibility regressions; verify through existing CI.
- Do not treat a Netlify success status as authenticated protected-preview UAT.

## Skills applied as guidance, not installed commands
- Superpowers: https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md
- Superpowers: https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md
- Superpowers: https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md
- gstack methodology: https://github.com/garrytan/gstack
