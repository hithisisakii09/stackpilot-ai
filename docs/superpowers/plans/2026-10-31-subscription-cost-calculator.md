# Phase 2.7 — Private Software Cost Comparison Calculator

> For future agents: follow gstack review/QA and Superpowers test-driven-development, writing-plans and verification-before-completion. Upstream skills are methodology references, not automatically installed slash commands.

**Goal:** Give real software buyers a useful, vendor-neutral way to compare two subscription cost scenarios using only numbers they enter themselves.

**Architecture:** Pure money calculations use integer minor units, never binary floating point for currency. A single static Astro page holds all inputs in browser memory, generates a transparent comparison with formula and exclusions, and supports copying a plain-text result. No network calls, analytics, persistence, product rankings or pre-filled prices.

**Stack:** Astro 7 static, Node.js >=22.23.4, built-in node:test, existing Chromium and axe tooling. Zero new npm dependencies, ₹0 spending.

## Constraints
- Do not import any vendor price, commission, plan recommendation or affiliate source.
- Same chosen currency (INR/USD/EUR/GBP) applies to both scenarios. No conversion or exchange rate claims.
- Cap months at 60, seats at 1000, each amount at 1,000,000.00. Only nonnegative decimal inputs with max two fractional digits; reject exponents/commas/negatives/NaN and empty values.
- Formula: totalMinor = (flatMonthlyMinor + seatMonthlyMinor × seats + extrasMonthlyMinor) × months + oneTimeFeeMinor. Taxes, contractual discounts, currency exchange, variable usage/overage fees and changes in future prices are excluded unless users incorporate estimates into their inputs. Distinguish calculated estimates from vendor-verified facts.
- All inputs local; no cookies, localStorage, HTTP forms, external JS or account signup.
- Keep `main` unchanged and Netlify production/preview Private with auto publishing Locked. All pages noindex; `affiliateUrl:null`; no public release, partner activation, spending or source approvals.

## Work
- [ ] TDD RED: `tests/cost-comparison.test.mjs` defines strict minor-unit parsing, bounds, deterministic 2-scenario totals, tie/difference, non-mutation, and no vendor/source data. Record expected CI failures before implementation.
- [ ] GREEN: implement `src/lib/cost-comparison.mjs` with `compareSubscriptionCosts`, `formatMinorUnits`, `plainTextCostReport`.
- [ ] Add `src/pages/tools/software-cost-calculator/index.astro`: accessible labels, months/currency controls, 2 scenarios, dynamic live region, copy button, precise disclaimer and zero data transmission.
- [ ] Add static route to `scripts/check-build.mjs`, increment private preview pages 13 -> 14, add home and requirements worksheet links.
- [ ] Add Chromium+axe desktop/mobile checks for user-filled 12-month scenario, validation, resets, no JS errors or overflow.
- [ ] Inspect GREEN GitHub unit/build/ops/browser runs on exact SHA; ensure Netlify private Deploy Preview status SUCCESS.
- [ ] Update draft PR #1 and owner/editorial issue #4 with evidence. No production deployment, main merge, indexing, affiliate enablement, external accounts or purchases.
