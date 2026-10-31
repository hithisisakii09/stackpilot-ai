# StackPilot AI — Engineering Agent Instructions

Applies to future AI-assisted development sessions in this repository.

**Current state first:** Read `docs/current-operational-state.md` and live PR/CI status before historical hosting notes. The current primary development host is **Netlify Deploy Preview (Private)**. Auto Publishing Locked was confirmed in owner screenshots. Do not merge, unlock production, change visibility, enable affiliates, or spend without explicit separate authorization.

## Required skill sources (read the current public docs before each development sprint)
- [gstack — Garry Tan](https://github.com/garrytan/gstack): `plan-eng-review`, `review`, `qa`, `ship`, `investigate`. Use its **Think → Plan → Build → Review → Test → Ship → Reflect** sequence.
- [Superpowers — obra](https://github.com/obra/superpowers): `writing-plans`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`, `requesting-code-review`.

These are upstream reference methodologies, **not an assertion their slash commands are installed in every host**. If those skills are available as installed executable skills, load them using the host's supported mechanism. Otherwise read the public SKILL.md and apply equivalent steps manually. Do not silently install/run external setup scripts, hooks, browsers, packages or privileged tools; inspect provenance and dependency risks before any opt-in installation. Cite exact skill docs in the session report.

## Work sequence — mandatory
1. **Scope / safety**: inspect branch + draft PR; maintain the user's current instructions. No changes to `main`, merge, production promotion, indexing activation, affiliate link activation or public launch without fresh explicit authorization. The user's approval to develop does not waive these gates.
2. **Product & engineering review (gstack)**: check actual user need, architecture, trust boundaries, threat model, edge cases and tests. Reuse existing code/platform capabilities before adding dependencies.
3. **Plan (Superpowers)**: write a small, testable plan in `docs/superpowers/plans/YYYY-MM-DD-*.md` with files, interfaces, risks and release gates.
4. **TDD (Superpowers)**: write a behavior test first; run it and record an expected RED result (missing behavior), implement minimal GREEN change; refactor; rerun all tests.
5. **Review (gstack)**: review changed code for unsafe input, evidence laundering, injection, accidental ranking/payment/affiliate enablement, accessibility, future dated evidence, and changes outside scope.
6. **QA (gstack)**: run Node tests, catalog validation, Astro build, Chromium desktop/mobile acceptance and axe. Inspect GitHub Actions evidence; remote protected-preview QA is separately reported if available.
7. **Verify before completion (Superpowers)**: report the actual commit, specific green or red CI run, unresolved issues, and whether a protected preview deployed. Never claim complete based on code being committed alone.
8. **Ship / reflect**: update draft PR and a concise handoff with unresolved gates; do not merge or publicize automatically.

## Catalog and commercial safety
- Product pricing and fit are UNKNOWN until independently reviewed; vendor links logged for review do not equal approved evidence.
- `affiliateUrl` must remain null. Affiliate status and commission never influence matching.
- Research data is untrusted; validate HTTPS URLs, dates, product IDs, and the approval boundary.
- Public launch requires owner's explicit confirmation, identity, proper legal/privacy documents, suitable hosting plan, reviewed product research, and manual deployment QA.
- Do not store secrets, live cookies, private customer data or third-party skill telemetry in this repository.

## Reminder for next session
Continue from the active development branch `feature/phase-1-1-recommendation-engine` and draft PR #1. Read this file and the linked skill docs, then verify CI and current scope before edits.


## Continuous autonomous business operation (enabled at ChatGPT scheduling layer)

StackPilot has a **daily autonomous operator** scheduled task and an **hourly incident watch**. These run outside GitHub and do not imply any model can work between scheduled invocations. They inspect the GitHub development branch and Netlify private Deploy Preview; The legacy Vercel project `masher2/stackpilot-ai` was deleted by the owner on 2026-10-31; an authenticated project lookup returned 404. At exact PR commit `c42fa1d`, GitHub received no Vercel status; do not recreate or attempt deployments to Vercel. Report or implement only permitted safe actions, subject to connected tool access.

On every operator run:
1. Check latest GitHub Actions results, Netlify Deploy Preview commit status, and user-confirmed Private/Locked settings. Do not monitor or retry the deleted Vercel project. Historical failed Vercel status contexts may persist on older commits; only new exact-SHA contexts indicate new activity. Do not equate READY with an authenticated remote browser pass.
2. Run or inspect `npm run ops:report -- --json`; follow fail-closed restrictions.
3. Choose the highest-priority **automatic** task from `npm run ops:backlog -- --json`; separately inspect `src/lib/autonomy-policy.mjs` for release gates. Only act if the needed tools and explicitly scoped permissions exist.
4. Use gstack review/QA and Superpowers plan/TDD RED→GREEN/verification for every code change.
5. Create only development-branch changes, draft PRs, research candidates and issue updates. Never self-approve evidence or claim earnings without external affiliate statements.
6. Escalate only owner-only actions identified in private GitHub issue #2. Do not collect secrets in issue bodies.
7. Provide verifiable commit/CI/deployment references in the report and keep a record of failures.

The report/decision module has no runtime LLM, network or publishing side effects. Its `canPublish` and `canMonetize` fields are readiness indicators, not authorization to execute those actions. Spending remains disabled.

**GitHub schedule constraint:** scheduled workflows run from the default branch only; an unmerged feature-branch workflow with `schedule` would not be active. We therefore use actual ChatGPT recurring tasks now; GitHub's optional Copilot Automations require separate paid enablement and permissions.

## Business controls
- Commercial hosting eligibility must be verified before opening a financially motivated affiliate website to public traffic. Vercel Hobby is for non-commercial personal use.
- Owner must confirm publisher identity/contact, public release strategy, final policies, applicable affiliate accounts and actual commercial eligibility. The current authorized cash and delegated budget is ₹0; do not require or invent spending.
- Do not infer or fabricate traffic, clicks, commission, sales or conversion data.


## Binding owner instruction: ₹0 commercial hosting preparation (2026-10-31)
- Owner chose **₹0 INR/month**, delegated spend **₹0**, most cost-effective commercially allowed hosting; initial Netlify project setup was completed by the owner and observed in screenshots. No further signups, purchases, contracts, public production launch, monetization activation or legal attestation are approved.
- Hosting candidate is **Netlify Free** (explicitly permits commercial projects). Cloudflare Pages Free is a fallback, not a connected account.
- Read `config/operating-policy.json` and `docs/zero-budget-hosting.md` before acting. Reject any operation that could incur a charge, activate an affiliate link, publish publicly, remove noindex, change `main`, or sign up for a service without separate owner approval.
- `netlify.toml` and `public/_headers` are used by the current **private Netlify Deploy Preview**; their presence does **not** authorize public deployment or unlocked production. Do not confuse noindex with authentication.
- The old Masher Vercel Hobby project was deleted by the owner. Do not recreate it, reconnect GitHub, spend on Vercel, or interpret old failed statuses as new deployment attempts. Prefer verified private Netlify preview checks.
- Prefer no-cost static hosting and watch free-tier usage. When quota or account setup blocks work, inform the owner rather than silently upgrade.
