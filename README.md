# StackPilot AI

**Pre-launch Astro MVP for independent SaaS discovery aimed at small service and marketing agencies.**

## Current development features
- Six research candidates: HubSpot / Pipedrive (CRM), Semrush / Ahrefs (SEO), Kinsta / Cloudways (hosting)
- Local browser recommendation quiz with transparent category matching and explicit warnings for unknown team-size and budget compatibility
- Individual software profiles and side-by-side category tables
- Prelaunch methodology, disclosure, and privacy-notes pages
- Candidate primary-source links and strict catalog validation
- Offline, read-only editorial research queue
- `noindex, nofollow` protections on every page pending release approval

**No prices or product suitability are verified; there are no affiliate links or production deployment.**

## Local setup

Requires Node.js 22.

```bash
npm install
npm test
npm run dev
```

Useful commands:

```bash
npm run check:data
npm run research:queue
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
