# StackPilot AI — Autonomous Business Operating Model

## Mission
Run an independent, AI-assisted SaaS discovery and affiliate business with minimal routine manual oversight, not a static list of products. Automation must remain truthful, auditable, rate-limited and compliant.

## Actual runtime components
1. **GitHub + Vercel**: Astro site and private preview deployments; CI unit tests, build, accessibility and browser acceptance.
2. **Daily autonomous operator task** (ChatGPT scheduled task): review StackPilot GitHub and Masher Vercel, prioritize fixes, make test-first development-branch changes when tools/permissions permit, and escalate genuine owner approvals.
3. **Hourly incident watch** (ChatGPT scheduled task): watch CI, deployment state, safety boundaries, and material failures; notify only for meaningful changes.
4. **`npm run ops:report`**: purely local policy engine; shows actionable work and blockers. Machine output: `npm run ops:report -- --json`.
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
Observe GitHub and Vercel state → generate a `ops:report` assessment → prioritize safe actions → create/modify development code → validate via CI and Chromium QA → retain artifacts and explain decisions → escalate only permission-only gates. On failure, open an issue, retry a bounded number of times, or pause that operation. Never self-certify external commercial approvals.

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
