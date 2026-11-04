# Phase 2.8 — SaaS total cost of ownership guide (private-preview only)

> **For agents:** Follow the upstream gstack review/QA and Superpowers TDD/verification methodologies. Do not imply the upstream CLI skills are installed.

**Goal:** Create one useful, source-independent buyer education guide focused on evaluating software total cost of ownership, with a transparently hypothetical numerical example computed by the site's existing calculator.

**Architecture:** Use an Astro static route `/guides/saas-total-cost-of-ownership/` with sections for recurring costs, one-time charges, variable charges, contract questions and a worked 12-month example. The example imports `compareSubscriptionCosts` and `formatMinorUnits` so article numbers cannot silently drift from the calculator. Reuse existing dark theme CSS, static build assertions and browser acceptance; introduce no new runtime dependencies.

**Tech stack:** Astro 7, Node.js 22.23.4, existing Playwright/axe GitHub Action, zero paid API or services.

**Risk review:**
- Explicitly label **all** example prices as invented *hypothetical*, not vendor quotations.
- Comparing calculated costs does **not** imply the cheaper scenario is a better product.
- Clarify tax, discounts, usage/overage fees, renewal, annual commitments and migration costs that the simple calculator cannot predict.
- Keep guide index access disabled (robots meta + existing hosting headers/robots); no public push, affiliate links, live ads or analytics.
- Guide must link both browser-only tools and methodology; avoid unsupported rankings or product comparisons.
- Validate on 390px mobile layout and desktop with axe; no client script needed in the guide.

## TDD and implementation
1. [ ] Write test `tests/saas-tco-guide.test.mjs` first: guide path exists, hero/H1, fixed content safeguards, hypothetical example imports calculator and shows computed totals, no affiliate/published vendor pricing, internal tool links and noindex.
2. [ ] Verify RED on GitHub CI while guide is absent. Avoid testing external network or commercial actions.
3. [ ] Implement `src/pages/guides/saas-total-cost-of-ownership/index.astro` using a 12-month hypothetical scenario:
  - Option A = base 20.00 + (10.00 × 5) + extras 5.00 monthly + 100.00 setup; total 1000.00
  - Option B = base 55.00 + (3.00 × 5) + extras 8.00 monthly + 0.00 setup; total 936.00
  - Same USD currency, difference 64.00. Pure calculator determines all displayed results.
4. [ ] Link the guide from homepage and calculator. Add `guides/saas-total-cost-of-ownership/index.html` to static built route checks, increment private preview package to 15 pages. Add title/noindex/content assertions to check-build.
5. [ ] Add browser desktop/mobile smoke and axe and screenshot for guide; assert no overflow.
6. [ ] Verify exact HEAD Node tests, 15 static pages, operations/private artifact and Chromium. Check GitHub Netlify *private* Deploy Preview status; distinguish its build status from independent authenticated browser validation.
7. [ ] Update draft PR and editorial issue #4; preserve ₹0, Netlify private/locked, no merge/public launch/indexing, no affiliate activation or partner acceptance.

**Not authorized:** contracts, paid subscriptions, public launch, production promotion, removing noindex, personal data collection, editorial signoff of product facts.
