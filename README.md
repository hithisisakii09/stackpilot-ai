# StackPilot AI

**Pre-launch Astro MVP for independent SaaS discovery aimed at small service and marketing agencies.**

## Current development features
- Six research candidates: HubSpot / Pipedrive (CRM), Semrush / Ahrefs (SEO), Kinsta / Cloudways (hosting)
- Local browser recommendation quiz with transparent category matching and explicit warnings for unknown team-size and budget compatibility
- Individual software profiles and side-by-side category tables
- Prelaunch methodology, disclosure, and privacy-notes pages
- Candidate primary-source links and strict catalog validation
- Offline, read-only editorial research queue
- A candidate-only evidence ledger and research workbench at `/research/` (sources logged for inspection, not verified claims)
- `noindex, nofollow` protections on every page pending release approval

**No prices or product suitability are verified; there are no affiliate links or production deployment.**

## Local setup

Requires Node.js 22.23.4 or newer for the currently resolved Astro release.

```bash
npm ci
npm test
npm run dev
```

Useful commands:

```bash
npm run check:data
npm run research:queue
npm run research:evidence
npm run research:queue -- --json
npm run build
npm run check:build
```

`npm test` runs unit tests, catalog validation, static Astro build and output route smoke checks. It does not constitute real-browser end-to-end validation.

## Research and disclosure controls

- Research intake: `docs/research/source-intake-2026-10-30.md`
- Evidence model: `docs/product-evidence-contract.md`
- Manual QA and release gates: `docs/prelaunch-qa.md`
- `affiliateUrl` must be `null` for every product, enforced by validation.
- No autonomous LLM research/publishing jobs are installed. `research:queue` only prints local review priorities.
- Team-size and budget inputs produce additional fit scoring only with approved evidence, which currently does not exist.

## Publication status

The development branch is **not ready for public launch**. The site intentionally carries no-index directives and provisional legal/privacy notes. A domain, hosting operator, reviewed legal policy, verified product/price data, manual browser QA, and separate user authorization are required before any production publication, merge, or affiliate activation.

## Development method

Read [AGENTS.md](AGENTS.md) before every sprint. This project uses the engineering-review and browser QA methods documented in [gstack](https://github.com/garrytan/gstack), and the test-first, systematic-debugging and verification methods from [Superpowers](https://github.com/obra/superpowers). These are referenced methodologies; a host without their CLI skills installed should follow the corresponding public SKILL.md instructions rather than falsely claiming to invoke installed slash commands.

See [roadmap](docs/roadmap-to-launch.md) for the product's final launch gates and [Phase 2.0 plan](docs/superpowers/plans/2026-10-31-research-evidence-ledger.md).


## Autonomous operations

This project is designed to become an **agent-operated SaaS affiliate company**. Its current private prelaunch mode intentionally blocks external commercial operations.

```bash
npm run ops:report
npm run ops:report -- --json
```

The decision policy is in `src/lib/autonomy-policy.mjs`. A read-only GitHub Actions workflow generates downloadable `stackpilot-operations-report` artifacts from the draft PR. Two ChatGPT recurring tasks are enabled: daily safe-development operator and hourly incident watch. Their existence does not activate external affiliate programs or guarantee agent-run development success. For the full operating model and one-time approvals, read `docs/autonomous-business.md` and private GitHub issue #2.


## ₹0 hosting preparation (not deployed)
Owner operating budget: **₹0/month**, delegated spend: **₹0**. Netlify Free is the current commercial-friendly static hosting candidate; Cloudflare Pages Free is the alternative. Files `netlify.toml`, `public/_headers`, and `config/operating-policy.json` prepare an eventual deployment while maintaining noindex and budget safeguards. The site has **not** been published to Netlify, and the existing protected Vercel preview is unchanged. Service signup, contracts, paid upgrades and public deployment each require separate explicit permission. See `docs/zero-budget-hosting.md`.
