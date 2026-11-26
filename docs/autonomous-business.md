# StackPilot AI — Autonomous Business Operating Model

**Current hosting and approval evidence:** `docs/current-operational-state.md` (read before historical descriptions).

## Mission
Run an independent, AI-assisted SaaS discovery and affiliate business with minimal routine manual oversight, not a static list of products. Automation must remain truthful, auditable, rate-limited and compliant.

## Actual runtime components
1. **GitHub + Netlify**: Astro site. PR #1 and PR #7 are merged; the latest PR #8/PR #9 base observed was `main@1672461bea5fa09e01965c5e8bdd4819852b06fd` (fetch live `main` before any consequential action). Phase 2 engineering remains on `feature/phase-2-product-readiness`, Draft PR #8. Last verified pre-operating-model-refresh head was `607b20cb2963c8e23c33968e8e353d735fc2a87b`: 481/481 tests, 28 static routes, 339 internal links, Chromium acceptance and Netlify Deploy Preview 8 status SUCCESS. The owner self-reported 12 manual checks only at implementation SHA `dd80aee`; current-head authenticated remote UAT remains unverified. Separate growth research is on `growth/seat-billing-audit-2026-11-05`, Draft PR #9, documentation-only; last checked head `998d4a73a1d7b13e7a5cd3dfdab992809edadcd1` had CI and Netlify Deploy Preview 9 status SUCCESS, but no owner UAT. This operating-model edit creates a new docs-only PR #8 commit; fetch the resulting live head and exact-SHA checks before future claims. Netlify Deploy Preview 8: https://deploy-preview-8--inspiring-chaja-cfb85f.netlify.app ; Preview 9: https://deploy-preview-9--inspiring-chaja-cfb85f.netlify.app . Owner screenshots reported Netlify production/preview visibility Private and Auto Publishing Locked; production was still the old `main@c8fadcb` at the last recorded owner check, not a current dashboard guarantee. PR #1 is merged/closed; PR #8 and #9 remain Draft. The legacy Vercel Hobby project was **deleted by owner**; do not recreate.
2. **Daily autonomous operator task** (ChatGPT scheduled task): review StackPilot GitHub and the Netlify private preview, prioritize fixes, make test-first development-branch changes when tools/permissions permit, and escalate genuine owner approvals.
3. **Hourly incident watch** (ChatGPT scheduled task): watch CI, deployment state, safety boundaries, and material failures; notify only for meaningful changes.
4. **Read-only queue reports**: `npm run ops:backlog -- --json` is the deterministic advisory priority source; `npm run partners:queue -- --json` lists unapplied affiliate research candidates; `npm run research:claims -- --json` lists unapproved vendor-documentation claims. None grants authorization or marks claims verified.
5. **GitHub Actions operations report**: upon pull requests or a manual dispatch, validates the repo and publishes a short-retention non-sensitive report artifact. It cannot approve research or deploy production.
6. **Optional GitHub Copilot Automations**: if the account has an eligible paid Copilot plan and the repository allows the cloud agent, create a scheduled agent automation with tools scoped to read the repo, create issues and draft pull requests only. Use instructions from `AGENTS.md`. GitHub Copilot automations are configured in GitHub, not in this repo.

## Agent operating roles and decisions
| Role | May do without owner approval | Must not do |
| --- | --- | --- |
| Research | Gather official vendor leads, check freshness, flag changes, draft evidence candidates | Mark claims verified, invent prices |
| Developer | Fix safe issues on development branch, add tests, open draft PRs | Merge main, publish production, handle secrets |
| Security/QA | Check CI, tests, accessibility, vulnerability reports and deployment failures | Remove protection or suppress failing checks |
| Content/Growth | Draft factual comparisons and editorial SEO copy for review | Send bulk unsolicited outreach, post fictitious testimonials or unreviewed claims |
| Affiliate/Revenue | Research commission programs, eligibility, conversion data models and reconciliation | Activate tracking without real partner approval, falsify conversions or sign contracts |
| Orchestrator | Choose prioritized safe tasks and update work queue | Spend money, bypass owner/legal approvals or grant itself new permissions |

## Automated decision loop
Read `docs/current-operational-state.md` first; refresh exact GitHub PR/head/CI/Netlify status → inspect `ops:backlog -- --json` and honor its deterministic order → inspect partner and claim queues → choose one bounded safe task → use gstack review/QA and Superpowers TDD for code changes → validate the exact resulting SHA with CI/Chromium → retain non-sensitive artifacts and explain decisions → escalate only genuine owner-only gates. Backlog entries are advisory, not authorization. On failure, open/update an issue, retry only when transient, or pause that operation. Never self-certify external commercial approvals.

## What is required for lawful monetization
1. A commercial hosting plan or other hosting provider whose license permits affiliate operations. Vercel Hobby is non-commercial.
2. Owner's legitimate identity/contact and legal, privacy and affiliate disclosure documents; accurate account and tax information as required by platform/jurisdiction.
3. Actual affiliate program acceptance with correct tracked links and applicable country restrictions.
4. Verified product claims, pricing caveats, editorial workflow and independently sourced comparison content.
5. Traffic strategy: quality vendor comparisons, search queries, useful tools and permitted content distribution.
6. Conversion and earnings reporting based on **real** network data, not estimates presented as revenue.
7. Financial/budget approval and hard spend controls for paid models or ads.

## Why zero interference cannot be guaranteed
Third-party services can require KYC, tax forms, account confirmation, payment-method verification, contract acceptance and legal declarations by a real owner. AI agents cannot legitimately complete those by assuming approval. Providers can change prices, account access or terms. Revenue depends on traffic and affiliate conversion and is **not guaranteed**.

## Deployment and control boundaries
The current production/main state is not automatically overwritten. The protected preview stays private and non-indexed. GitHub `schedule` workflow triggers execute only using a workflow file in the **default branch**; merely adding one in a development branch does not activate unattended scheduling. ChatGPT tasks are separately scheduled, with future tool permissions not guaranteed. The operational policy is fail-closed: `canPublish`, `canMonetize`, and `canSpend` do not themselves perform any action.

## Release gate
No commercial launch, indexing, main merge, paid spending or affiliate activation without the required owner approvals. Agents may continue coding and preparing drafts, but not fabricate an approval to circumvent a blocker.


## Owner budget amendment — 2026-10-31
The owner selected an initial monthly budget of **₹0 INR** and delegated spending of **₹0 INR**. No paid hosting, AI APIs, ads, domain purchases, subscriptions, purchases, contracts or public launch is authorized. **Netlify Free** is the current hosting candidate only; commercial-use entitlement and plan terms are not independently verified or approved. **Cloudflare Pages Free** is an alternative candidate, not an approved migration. Netlify's hard free credit cap can suspend service when exhausted. The **Netlify site exists** and the owner provided screenshots of production/preview visibility as Private with Auto Publishing Locked. GitHub has recorded successful Netlify Deploy Preview build statuses, but current authenticated remote browser QA and provider billing plan are not independently verified. See `docs/current-operational-state.md`, `docs/zero-budget-hosting.md` and `config/operating-policy.json`. No public launch or affiliate application is approved. All account/contract and public deployment decisions remain with the owner.
