# All-built-pages browser accessibility gate — 2026-11-01

## Problem and evidence
The current `scripts/browser-acceptance.mjs` exercises many representative flows with Chromium and axe, but new static routes can be added without receiving a desktop + mobile browser/a11y sweep. The static preflight audits every emitted HTML document but it is not a browser accessibility or narrow viewport test. Close that coverage gap before public-launch deliberations, while keeping hosted private UAT a separate owner requirement.

## Scope
1. Implement pure `src/lib/browser-route-coverage.mjs`:
   - `routePathsFromBuiltHtml(files)` returns all static HTML route URLs from a strictly validated, nonempty, unique emitted *file* inventory; includes `/index.html` => `/`, nested `index.html` => directory slash paths, and direct HTML pages.
   - `assertExactBrowserRouteCoverage(expected, visited)` fails closed if browser coverage omits, duplicates or includes unexpected routes.
   - No I/O, network access, approvals, publication or analytics.
2. Tests `tests/browser-route-coverage.test.mjs` come first; demonstrate expected RED before implementation and GREEN after, including path traversal, duplicate inventory, missing route, newly added route and verification that browser runner uses helper.
3. Extend existing Chromium browser runner **without replacing the established interaction scenarios**: recursively enumerate actual regular files in generated `dist`, reject symlinks, create expected URLs using helper, visit each route on desktop (1440) and mobile (390), assert HTTP 200 / one nonempty h1 / noindex / no uncaught browser errors, run axe WCAG 2A/AA and 2.1A/AA for both widths, and reject mobile horizontal overflow above 395px. Fail when expected/visited mismatch; publish a bounded non-sensitive page count in CI output. This runs locally against the build, not hosted Netlify.
4. Verify exact head GH build/ops/Chromium checks, and Netlify provider status; keep PR draft.

## Boundaries and risk
- `npm test` already exercises build and preflight. Browser suite runs in separate read-only GitHub Actions job.
- Accessibility rules could discover violations on previously untested pages; if so correct them with smallest change and rerun; never weaken axe rules to hide errors.
- NO deployment action, Vercel recreation, merges, indexing, private access change, affiliate approvals, expenses, legal approvals, or owner-gate changes. Maintain `config/operating-policy.json` at ₹0 and all approval flags false.
- Passing this gate is **local static browser QA only**, not authenticated hosted-UAT or proof of Netlify settings.

## Engineering method
Use gstack review and QA in degraded/manual mode, and obra/superpowers writing-plans, TDD RED→GREEN and verification-before-completion. Source skill references: https://raw.githubusercontent.com/garrytan/gstack/main/review/SKILL.md ; https://raw.githubusercontent.com/obra/superpowers/main/skills/test-driven-development/SKILL.md ; https://raw.githubusercontent.com/obra/superpowers/main/skills/verification-before-completion/SKILL.md .
