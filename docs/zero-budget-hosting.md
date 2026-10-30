# StackPilot AI — ₹0 Commercial Hosting Preparation (2026-10-31)

## Owner policy (confirmed)
- Initial monthly cash budget: **₹0 INR**.
- Delegated spending: **₹0 INR** — no domain purchases, paid AI APIs, paid hosting, ads, subscriptions, auto-recharge, account upgrades or contracts.
- Owner chose the most cost-effective commercially permissible hosting provider; no live account activation or public publication consent has been given.
- The code-level policy in `config/operating-policy.json` is fail-closed. It is not evidence of a signed provider agreement.
- Protected Masher Vercel previews are unchanged. Do **not** run a commercial public affiliate business on Vercel Hobby.

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

## Repository changes prepared
- `netlify.toml` — static Astro build, `dist`, Node.js 22.23.4; no paid/SSR services.
- `public/_headers` — pre-launch `X-Robots-Tag` and security headers for static hosting.
- `public/robots.txt` — disallows crawling while unverified and unreleased.
- `config/operating-policy.json` — stores ₹0 and no-approval flags.
- `npm run ops:report -- --json` — reports budget and holds commercial/launch actions.
- Existing GitHub CI verifies all static routes, policy guards, and no unapproved affiliate URLs.

**Important:** A noindex meta tag, `robots.txt`, or `_headers` directive is not a privacy or access-control system. A deployed `*.netlify.app` website may be publicly accessible by default. Therefore **do not import or deploy this repo to Netlify** without the owner's additional explicit permission and suitable privacy protection for any preview.

## When authorized to configure Netlify (NOT NOW)
1. Owner signs up at https://app.netlify.com/signup and accepts the service agreement using their own credentials. Do not sign contracts on their behalf.
2. Owner authorizes repo access for `hithisisakii09/stackpilot-ai`; verify individual ownership and free plan.
3. Confirm new team is private by default and project has deploy restrictions before any deployment. Disable automatic branch deploys until owner approves. The repo currently contains unverified research claims and should remain non-indexed.
4. Use build command `npm run build`, publish folder `dist`, Node 22.23.4. `netlify.toml` encodes these.
5. Run desktop/mobile authenticated preview QA, evaluate actual response headers and verify no payment method / upgrades enabled.
6. Obtain explicit **separate public production approval** before publishing, relaxing `noindex`, attaching a public domain, or enabling affiliate tracking.

## Autonomous operation at ₹0
ChatGPT's daily operator and hourly incident-watch tasks are enabled. They can inspect data and act within authorized development scope, subject to actual tool access and automation limits. GitHub Actions runs within its included allowance; monitor usage to avoid unexpectedly requiring paid compute. Do not promise uninterrupted 24/7 LLM coding or revenue. Keep agent-side costs at zero and notify the owner when the quota is exhausted.

## Outstanding one-time human gates
Provider signup/terms, commercial host/account approval, operator identity/contact, final legal/privacy review, authentic affiliate program applications/tax/KYC/payment details, domain decision, and public launch authorization. None is completed merely by selecting Netlify Free.

Track prerequisites: https://github.com/hithisisakii09/stackpilot-ai/issues/2
