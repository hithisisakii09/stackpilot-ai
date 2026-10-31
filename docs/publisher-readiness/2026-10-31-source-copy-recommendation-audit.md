# Source-level website and recommendation audit — 31 October 2026

**Private review; exact inspected commit:** `1dbfecee07b4545766732b03f98f57f2ca635c1f`. No product claim, business launch, privacy/legal sign-off, or security certification is asserted.

## Findings with file-level evidence

### F1 — Category-only scoring risks implying suitability
**Severity:** Moderate editorial integrity. **Location:** `src/lib/recommend.mjs`, `src/pages/index.astro`, `src/data/products.json`.

- Every item has `verified:false`, empty `supportedTeams:[]` and `budgetTiers:[]`, and null/unknown price.
- `recommend()` starts at **60 points** for a `bestFor` category match. Without verified fit inputs, no additional positive fit signal is available. Current two items in each category therefore tie on base score and are sorted alphabetically.
- The homepage correctly warns that budget and team fit may be unverified and shows 'Important' cautions, but it uses a **Get recommendation** button and refers to a **ranking**. A user could misinterpret order as a product-quality or account-fit judgment.
- This is **not evidence of paid-biased ranking**; current recommendation code does not use affiliate status.
- **Suggested private change (requires tests before modifying code):** when candidates have no verified suitability inputs, render 'Category matches (alphabetical, unranked)' and avoid numerical/ordinal fit ranking. Only enable scored suitability display after independently verified fit fields, robust tests and editor review. Preserve noindex and privacy.

### F2 — Live hosting Analytics omitted from present privacy wording
**Severity:** Moderate prepublication transparency. **Location:** `src/pages/privacy/index.astro`.
- The page says the **source repository** has 'no ... analytics integration' and acknowledges hosting-provider access logs. That code-scoped assertion is distinguishable from Netlify Analytics enabled **at the platform level** (owner-confirmed screenshots).
- Visitors reading 'privacy notes' may miss the enabled deployment-level traffic analytics. Netlify describes analysis of CDN logs including unique-visitor metrics derived from IP addresses. Do not claim the site collects 'no data' or that server log processing is absent.
- **Suggested change after review:** explicitly note that Netlify Web Analytics is enabled and uses CDN-derived reports rather than a browser script; include appropriate operator, data-processing, purpose, retention, rights and jurisdiction statements once verified. The current privacy page is marked prototype-only and noindex; **not a final legal policy**.
- Provider account-level retention, legal terms and billability remain unverified; no assertion about them is warranted.

### F3 — Existing comparison handles uncertainties conservatively
**Observation / safeguard.** `src/lib/comparison.mjs` populates `teamFit` and `budgetFit` only when `verified:true`; current pricing label is 'Unverified — check the official provider', affiliate status is no active links, and rows call descriptions unverified. Preserve these guards.

### F4 — Catalog sourcing is not claim approval
**Observation.** `src/data/products.json` has six candidate entries with unverified pricing, null affiliate URLs, no team/budget fit values, `verified:false`, and only vendor-source leads. `src/data/research-claims.json` separately contains six `approved:false` candidate claim records. A link and a source-review note do not make claims independently tested or editor-approved.

## Development acceptance criteria
1. Add regression tests showing category-only results are **unranked/alphabetical** when every candidate lacks verified fit; no performance, pricing or suitability inference in visible text.
2. Ensure advisors disclose unknown fit in all three categories and budget/team selections never manufacture evidence.
3. Ensure the privacy copy accurately distinguishes browser-side worksheet and recommendation choices from Netlify request/analytics processing.
4. Re-run Validate/build, safety/ops and Chromium on exact new SHA and confirm Netlify private preview success. Do not infer tests from earlier commit.
5. Do not modify `verified`, claim approvals, affiliate links, name, billing settings, noindex, deployment privacy or production controls without explicit approval.

## Release policy
Private draft PR remains unmerged; ₹0 monthly/delegated spend, Netlify Private and locked, no public production, no affiliate activation, no paid accounts or brand change. These findings are audit items, **not** authorization for public copy publishing.
