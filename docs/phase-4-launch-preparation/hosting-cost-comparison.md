# StackPilot AI — Phase 4 Hosting Cost & Platform Comparison

**Document date:** 2026-11-03 (Asia/Kolkata)  
**Status:** Architectural and operating analysis; no hosting migration authorized  
**Binding budget:** ₹0 INR monthly hosting spend; ₹0 delegated spend  
**Scope:** Existing Netlify private preview and Cloudflare Pages Free as a documented fallback only

---

## 1. Executive summary

StackPilot AI is an Astro static-site build. The current CI operations artifact reported 25 routes, 40 files, and 257,462 bytes. This is a static delivery workload; the current design does not require server-side hosting for its content pages.

**Recommendation:** Keep the existing Netlify private Deploy Preview as the current review environment. Document Cloudflare Pages Free as a technically plausible fallback, but do not create a Cloudflare project, connect the repository, change DNS, or migrate anything without a separate owner decision.

The budget remains ₹0. A free TLS certificate does not make a custom domain free; domain registration and renewal are outside this budget. Until an owner-approved domain exists, keep using the existing provider preview hostname and access controls.

## 2. Platform comparison

| Feature | Netlify Free (current review environment) | Cloudflare Pages Free (fallback only) |
| --- | --- | --- |
| Monthly plan price | $0 | $0 |
| Commercial-use evidence | Netlify has explicitly described its Free plan as allowing commercial projects; confirm the current account's applicable plan terms before public release | Cloudflare's Developer Platform terms apply to Pages and do not state a personal/non-commercial-only restriction; this is not a legal opinion or a blanket guarantee |
| Monthly allowance | Current credit-based Free plan: 300 credits/month with a hard limit; older eligible accounts may remain on legacy limits | 500 builds/month |
| Build concurrency | 1 concurrent build | 1 concurrent build |
| Build duration | Credit-based plan does not use the old 300-build-minute meter | Build timeout: 20 minutes |
| Preview deploys | Unlimited deploy previews; preview and branch deploys use 0 credits under current credit-based pricing | Unlimited active preview deployments |
| Static delivery | Global CDN; bandwidth and requests consume credits under current credit-based pricing | Static asset requests are free and unlimited |
| Custom domains | Custom domains with SSL are included; do not assume an unlimited domain count | Up to 100 custom domains per project |
| File limits | Verify against the current account plan and deploy documentation before relying on a maximum | 20,000 files per Free project; 25 MiB maximum per individual asset |
| Repository state | Existing Netlify integration and private Deploy Preview | Not connected; documentation-only fallback |
| Operational decision | Retain current private preview; no production publishing | Do not connect or migrate now |

### 2.1 Netlify plan-version warning

Netlify introduced credit-based plans for new accounts in September 2025. Its current Free plan is $0/month with 300 credits/month and a hard limit. The current credit meters include:

- Production deploy: 15 credits each.
- Deploy Previews and branch deploys: 0 credits.
- Bandwidth: 20 credits per GB.
- Web requests: 2 credits per 10,000 requests.

Free-plan credits cannot be automatically recharged; the Free plan has a hard limit. When the account reaches its limit, projects pause until the next billing cycle. Keep auto-recharge disabled and do not add a paid plan or credit pack.

Netlify says accounts created before September 4, 2025 can remain on their legacy plan. The older Free plan was described as having 100 GB bandwidth and 300 build minutes per month. Those legacy figures must not be mixed with the current credit model.

**Owner evidence, not independently account-verified:** a prior billing snapshot was reported as showing 285 of 300 remaining and $0.00. Before using that number in forecasts, the owner must confirm in Netlify Usage & Billing whether the unit is current credits or legacy build minutes and which meters consumed the balance. Do not relabel credits as build minutes.

Keep production Auto Publishing disabled until separate release authorization. This is an owner-release safety control, not a claim that every preview build consumes credits: current credit-based Deploy Previews and branch deploys are listed as 0 credits.

### 2.2 Netlify commercial-use qualification

Netlify's Free-plan announcement explicitly said commercial projects could be deployed on the Free plan. Because the account's applicable plan version and terms are account-specific, re-check the current plan and governing terms before a public commercial launch. This document is not legal advice.

## 3. Static-delivery runway: avoid unsupported visitor forecasts

The current CI artifact is 257,462 bytes across 40 files and 25 routes. That is the emitted artifact size, not a measured per-visitor transfer size.

A forecast such as “1.7 million sessions/month” would require measured page-view mix, cache hit rate, compression, asset revalidation, browser caching, and actual bytes transferred per session. Those measurements are not currently established here. Therefore this document does **not** claim a verified visitor capacity or bandwidth runway.

For the current Netlify credit-based Free plan, model actual usage from the dashboard's credit breakdown rather than applying the older 100 GB / 300 build-minute figures. For Cloudflare Pages, static asset requests are documented as free and unlimited, but the build, file-count, per-file-size, acceptable-use, and service terms still apply.

## 4. Cloudflare Pages fallback architecture

The repository emits a static `dist/` directory. Cloudflare Pages documentation supports Git-based builds and direct upload of prebuilt assets. A fallback configuration would be expected to use:

- Build command: `npm run build`
- Build output directory: `dist`
- Static-only mode: do not add Pages Functions, Workers, databases, or other metered services for this site without a new cost and architecture review.

Current Cloudflare Pages Free limits documented by Cloudflare:

- 500 builds per month, with one concurrent build.
- 20-minute build timeout.
- 20,000 files per Free project.
- 25 MiB maximum individual asset size.
- 100 custom domains per project.
- Static asset requests are free and unlimited.

The static build appears structurally compatible, but a migration has **not** been tested. No Cloudflare project, Git connection, DNS change, or deployment is authorized by this analysis.

Cloudflare's Developer Platform Service-Specific Terms apply to Pages. They reserve the right to limit or suspend service for undue network burden or suspected agreement violations. The terms reviewed do not state a personal/non-commercial-only restriction for the Developer Platform; confirm the current agreement and account terms before relying on commercial use.

## 5. Zero-cost operating controls

1. Keep the current Netlify private preview as the only active review environment.
2. Keep production publishing disabled until a separate owner release decision.
3. Keep Netlify auto-recharge, paid upgrades, add-on credits, and paid services disabled.
4. Use the account's actual plan version and Usage & Billing meters for any runway estimate.
5. Do not buy or register a domain under the ₹0 budget. Free SSL does not waive registrar fees.
6. Keep the site static. Any Functions, database, analytics, or other dynamic service requires a separate cost/privacy review.
7. Keep Cloudflare Pages as a written fallback only; do not create, connect, or deploy it yet.
8. Re-check vendor pricing, terms, and plan limits before any future release because provider limits can change.

## 6. Sources checked on 2026-11-03

- [Netlify pricing and plan comparison](https://www.netlify.com/pricing/)
- [Netlify credit-based pricing plan documentation](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)
- [Netlify: How credits work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)
- [Netlify announcement describing commercial projects on Free](https://www.netlify.com/blog/introducing-netlify-free-plan/)
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare Pages pricing, including static asset requests](https://developers.cloudflare.com/pages/functions/pricing/)
- [Cloudflare Pages product pricing](https://www.cloudflare.com/en-in/developer-platform/products/pages/)
- [Cloudflare Developer Platform Service-Specific Terms](https://www.cloudflare.com/service-specific-terms-developer-platform/)

---

**Decision:** Netlify remains the existing private preview host. Cloudflare Pages remains an unconnected fallback. No migration, public deployment, domain purchase, indexing activation, paid feature, or hosting-setting change is approved by this document.
