# StackPilot AI — ₹0 Commercial Hosting Preparation (2026-10-31)

## Owner policy and deployed-private project (confirmed by screenshots)
- Initial monthly cash budget: **₹0 INR**, delegated spending **₹0 INR**. No paid hosting, domains, AI APIs, ads, subscriptions, auto-recharge, account upgrades, purchases or new contracts authorized.
- Owner created **Netlify** project `inspiring-chaja-cfb85f` and showed **Production visibility Private**, **Deploy Preview visibility Private**, **Auto Publishing Locked**. Production was published at older `main@c8fadcb` per dashboard. GitHub reports successful private Netlify Deploy Preview builds for draft PR #1; these are not owner authorization for public release.
- Owner reported logged-in preview homepage/compare/research working and Incognito blocked. That is user-reported, **not** independent security assurance for every new SHA.
- The code-level policy in `config/operating-policy.json` remains fail-closed and does not prove a signed account or verified pricing entitlement. Read `docs/current-operational-state.md` for evidence and unresolved verification.
- The owner previously **deleted the old Vercel project** and asked to stop deploying there. Historical Vercel Hobby build-rate-limit reports are not current operational evidence. **Do not recreate, deploy there, upgrade, or pay.**

## Hosting recommendation
**Primary candidate: Netlify Free** for the current all-static Astro website.

Official references:
- Netlify confirms free commercial projects: https://www.netlify.com/blog/introducing-netlify-free-plan/
- Current Netlify pricing: https://www.netlify.com/pricing/
- Netlify Free: $0/month, 300 credits/month with a hard cap and **no automatic paid recharge**; projects may pause when the allowance is reached: https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/
- Git integration supports private repos belonging to individual GitHub users: https://docs.netlify.com/build/git-workflows/overview/

**Alternative: Cloudflare Pages Free** if Netlify's credit cap becomes a significant reliability problem. Static requests are free and unlimited; free tier permits up to 500 builds/month, per Cloudflare official docs:
- https://developers.cloudflare.com/pages/functions/pricing/
- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/

Commercial hosting eligibility and terms must be rechecked at actual signup/launch. Do not equate zero monetary cost with unlimited resource or support guarantees.

## November 1, 2026 — Current official Netlify Free facts vs account evidence

**What is documented publicly, not an account-specific measurement:**

| Question | Official current position | Impact on StackPilot |
| --- | --- | --- |
| Can a commercial software-information site use Free? | Netlify says its Free plan permits commercial projects, subject to its terms and limits | **Candidate hosting is commercially plausible**; legal/affiliate/site-specific review is still pending |
| What is the monthly monetary charge? | Credit-based Free lists **$0/month and 300 monthly credits with a hard cap and no auto recharge** | **₹0 cash** can be maintained on this plan without upgrading, but availability is not guaranteed |
| What happens on exhaustion? | Netlify says **all projects sharing the team credit allowance pause** until a new billing cycle or an owner-authorized plan change | Do **not** interpret an outage from exhausted credits as an automatic bill; do not upgrade without separate owner approval |
| Do private Deploy Preview builds consume credits? | **Deploy Preview and branch deployment creation: zero deployment credits**; web requests and bandwidth still consume credits | Current CI preview deployments are not necessarily zero consumption in total; authenticated browsing and request probes use some shared allowance |
| Can a visitor access private previews? | On credit-based Free, private projects generally require the **Team Owner** to sign in; production and previews have separate visibility scope | Confirm both are currently Private in **this account**. Anonymous HTTP 401 from CI on two routes does **not** verify every route, all regions or the current deployed SHA |
| Is this the user's actual pricing plan? | **Unknown.** Netlify documents separate credit-based and legacy plans | **Only the authorized owner** can read the actual account's Plan details, remaining credits, transaction/upgrade options and private visibility |

Official evidence: [Netlify credit-based plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/), [credit accounting](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/), [billing FAQ](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/), [project visibility](https://docs.netlify.com/manage/security/secure-access-to-sites/project-visibility/) and [Netlify's commercial Free plan explanation](https://www.netlify.com/blog/introducing-netlify-free-plan/). Source descriptions are based on publicly documented terms checked **2026-11-01**, not permission for account changes.

**Owner-only read-only checklist (record redacted PASS/FAIL/BLOCKED, never credentials):**

1. In Netlify, choose the **actual StackPilot project `inspiring-chaja-cfb85f`**. Open **Usage & billing → Plan details / Credit balance**, confirm credit-based Free or actual plan type, current credit consumption, upcoming renewal/reset and any billing commitments. Do not select Upgrade, credit packs, auto recharge or payment methods.
2. In **Project configuration → General → Visitor access → Project visibility**, confirm **both production and previews are Private**, and inspect **Auto Publishing** (last owner observation: Locked). Do not change either setting.
3. While signed in, open [Preview build identity](https://deploy-preview-1--inspiring-chaja-cfb85f.netlify.app/preview-build/) and compare its **full 40-character build commit** against the current [draft PR #1](https://github.com/hithisisakii09/stackpilot-ai/pull/1) HEAD. UNKNOWN, mismatched or blocked means **FAIL/BLOCKED**. Compare actual hosted functionality against the current CI-generated `uat-cases.csv` for every published static page and test anonymous denial separately. The displayed build SHA is not independently signed proof of the served contents.
4. Separately inspect live **response headers**, analytics behavior, and human editorial/publisher/legal/privacy gates. Do not upload real credentials, personal data, screenshot tokens or contracts to GitHub/chat. **No approval should be inferred from a completed checklist item alone**.

**Release decision remains NO-GO**: private GitHub draft PR is unmerged, `commercialHostingApproved`, `productionLaunchApproved`, `affiliateActivationApproved` and `paidServicesApproved` remain false, with ₹0 delegated spending. Public launch still requires a separate explicit owner authorization after all evidence.

## Current repository configuration and QA
- `netlify.toml` — Astro static build to `dist`, Node.js 22.23.4.
- `public/_headers` — prelaunch indexing and security header configuration.
- `public/robots.txt` — crawl disallow while unreleased.
- `config/operating-policy.json` — ₹0 spending and no-launch flags.
- `npm run ops:report -- --json` — policy and gating report.
- GitHub CI checks static routes, noindex and absence of unapproved affiliate URLs. Separate Chromium desktop/mobile checks run locally against built assets; a Netlify build status does not replace authenticated remote site QA.

**Access restriction:** `noindex`, `robots.txt`, and `_headers` do **not** enforce authentication. Netlify project visibility was configured **Private** by the owner. Auto-publishing was **Locked**. Never weaken these settings without explicit authorization.

## Remaining Netlify owner verification — not a new signup
1. Check actual **Netlify Free plan**, current credits/usage and payment-method/upgrade state from the account dashboard; do not infer them from repository JSON.
2. Keep production and preview visibility Private. The older privately visible production `main@c8fadcb` must not be silently replaced by the feature branch.
3. Confirm remote authenticated browser behavior, anonymous denial, security response headers and a rollback/recovery plan before considering a later public release.
4. Obtain **separate production/public-launch authorization** before unlocking Netlify, changing visibility, enabling indexing, connecting public DNS or turning on affiliate tracking.
5. If future quota limits block builds, reduce unnecessary CI/preview builds or escalate to the owner. Do **not** spend or upgrade silently.

## Autonomous operation at ₹0
ChatGPT's daily operator and hourly incident-watch tasks are enabled. They can inspect data and act within authorized development scope, subject to actual tool access and automation limits. GitHub Actions runs within its included allowance; monitor usage to avoid unexpectedly requiring paid compute. Do not promise uninterrupted 24/7 LLM coding or revenue. Keep agent-side costs at zero and notify the owner when the quota is exhausted.

## Outstanding one-time human gates
Netlify plan/terms verification for commercial launch, operator identity/contact, final legal/privacy review, authentic affiliate program applications/tax/KYC/payment details, domain decision, and public launch authorization. None is completed merely by selecting Netlify Free.

Track prerequisites: https://github.com/hithisisakii09/stackpilot-ai/issues/2
