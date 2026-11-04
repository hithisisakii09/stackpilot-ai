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

**Editorial status:** no vendor feature, price, or product-fit claims have been approved, and no affiliate tracking links are active. A **private Netlify Deploy Preview** is in use; it is not a public launch. An older private production build remains on `main` and must not be replaced without separate owner approval.

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
- No autonomous research or publishing service runs inside the website. `research:queue` only prints local review priorities; the separate ChatGPT operator, growth agent, and incident-watch tasks run outside the app and cannot approve claims, publish, or spend.
- Team-size and budget inputs produce additional fit scoring only with approved evidence, which currently does not exist.

## Publication status

The development branch is **not ready for public launch**. It intentionally carries noindex directives and provisional legal/privacy notes. Public release still requires current-SHA authenticated owner UAT, independent anonymous-access and live-header checks, human editorial approval of vendor claims, publisher/legal/privacy review, and separate explicit authorization for merge, public production, indexing, and affiliate activation. Local CI and Chromium checks do not replace hosted owner UAT.

## Development method

Read [AGENTS.md](AGENTS.md) before every sprint. This project uses the engineering-review and browser QA methods documented in [gstack](https://github.com/garrytan/gstack), and the test-first, systematic-debugging and verification methods from [Superpowers](https://github.com/obra/superpowers). These are referenced methodologies; a host without their CLI skills installed should follow the corresponding public SKILL.md instructions rather than falsely claiming to invoke installed slash commands.

See [roadmap](docs/roadmap-to-launch.md) for the product's final launch gates and [Phase 2.0 plan](docs/superpowers/plans/2026-10-31-research-evidence-ledger.md).


## Autonomous operations

This project is designed to become an **agent-operated SaaS affiliate company**. Its current private prelaunch mode intentionally blocks external commercial operations.

```bash
npm run ops:report
npm run ops:report -- --json
```

The decision policy is in `src/lib/autonomy-policy.mjs`. A read-only GitHub Actions workflow generates downloadable `stackpilot-operations-report` artifacts from pull requests or manual dispatch. Three ChatGPT recurring tasks are enabled outside the app: daily autonomous operator, daily growth agent, and hourly incident watch. Their existence does not activate external affiliate programs or guarantee agent-run development success. For the full operating model and one-time approvals, read `docs/autonomous-business.md` and private GitHub issue #2.


## ₹0 hosting policy and private Netlify preview

Owner operating budget: **₹0/month**, delegated spend: **₹0**. The current private Deploy Preview is [hosted on Netlify](https://deploy-preview-1--inspiring-chaja-cfb85f.netlify.app/); its [build identity page](https://deploy-preview-1--inspiring-chaja-cfb85f.netlify.app/preview-build/) displays the source commit used for the preview. This is a protected development preview, **not** public launch approval.

- Owner screenshots dated 2026-11-02 showed Netlify production and preview visibility **Private**, Auto Publishing **Locked**, the Free plan at **$0.00**, 300 monthly credits with 285 remaining, and no Add-ons section visible. The owner also reported no charges in the checked billing history. These are point-in-time owner observations, not a future billing guarantee; recheck the provider UI before consequential decisions.
- Production `main` is now at merged commit `c9b9a1345e99ad97dc84376a20527305d9bb0d7c` (PR #1 merged 2026-11-04). Netlify production visibility remains Private and Auto Publishing Locked per owner screenshots — which commit production now serves requires owner dashboard verification. Do not unlock or replace without separate owner authorization.
- **Netlify Web Analytics is enabled at the hosting layer.** The application itself has no client-side analytics script or tracking cookies, but Netlify Web Analytics derives aggregated reports from CDN logs and the provider may process network/access logs. Final privacy, retention, and legal review remains outstanding; do not describe the overall hosting setup as analytics-free.
- `netlify.toml`, `public/_headers`, and `config/operating-policy.json` prepare the static site and preserve noindex/budget safeguards. **Noindex and `robots.txt` do not enforce authentication**; Netlify project visibility is a separate control.
- The former Vercel project was deleted by the owner. Do not recreate it, reconnect it, deploy to it, or pay for an upgrade. Cloudflare Pages Free remains an unconnected fallback candidate only.

Service signups, contracts, paid upgrades, account changes, public deployment, indexing, and affiliate activation each require separate explicit permission. See [the zero-budget hosting notes](docs/zero-budget-hosting.md), [the current operational handoff](docs/current-operational-state.md), and [release blocker #5](https://github.com/hithisisakii09/stackpilot-ai/issues/5).
