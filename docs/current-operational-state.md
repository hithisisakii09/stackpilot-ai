# StackPilot AI — Current operational state and release boundaries
**As-of snapshot:** 2026-10-31, Asia/Kolkata. **Purpose:** handoff for agents and the owner; distinguish observed evidence from assumptions. Read this before older planning notes. **Do not treat a historical dashboard screenshot or CI status as a continuously guaranteed account state.** Recheck live status before reporting.

## What is confirmed, and by whom

| Source type | As-of evidence | Limits |
| --- | --- | --- |
| **Owner screenshot** — Netlify dashboard | Netlify project `inspiring-chaja-cfb85f` with old published production `main@c8fadcb`; **Production visibility Private**, **Deploy Preview visibility Private**, **Auto Publishing Locked**. | These are UI settings at the time of screenshot. They do not constitute an independent anonymous-access penetration test, proof of a current Netlify plan, or ongoing quota availability. |
| **User-reported browser** acceptance | Owner confirmed login-accessible homepage, comparison and research pages, and that an unauthenticated Incognito window could not access the private preview. | User-reported checks of an earlier preview, not automated remote authenticated UAT of each new SHA or a security audit. |
| **GitHub commit status** | The development pull request, including `bf7fdb6`, has received successful **Netlify Deploy Preview** statuses, with URL `https://deploy-preview-1--inspiring-chaja-cfb85f.netlify.app`; these are distinct from production. | `SUCCESS` means a provider-reported deployment, not user authentication or proof that current site content is accessible to the owner. Check the latest PR commit. |
| **GitHub repository/CI** | Draft PR #1 on `feature/phase-1-1-recommendation-engine`, versus `main@c8fadcb`, remained unmerged at inspection. The verified development preview contains 16 Astro static pages following the CRM migration guide addition. At exact commit `bf7fdb6d5f1baa6cae7a0dbf9987f0014c75a920`, build, operations and Chromium desktop/mobile browser workflows passed. | Never assume a prior green check remains green after changes. Check CI against the **exact head commit**. |
| **Vercel provider commit status** | The separate legacy **Vercel Hobby** preview (`masher2`) reported a build-rate limit and an upgrade prompt. | This is a **Vercel preview quota limitation**, not proof that Netlify production is down. **No paid upgrade** or additional Vercel spend is authorized. |
| **Repository policy** | `config/operating-policy.json` records monthly budget **₹0**, delegated spending **₹0**, and all launch, paid-service, hosting-approval, and affiliate-activation flags false. | This is a software safeguard, **not** signed contractual, legal, banking, or provider-account evidence. |

## Current working platform
- **Primary private development preview:** Netlify Deploy Preview `https://deploy-preview-1--inspiring-chaja-cfb85f.netlify.app`. The owner has confirmed protected browsing earlier; successful GitHub preview status should be reconfirmed on the current PR SHA.
- **Existing production deployment:** Netlify `https://inspiring-chaja-cfb85f.netlify.app`, a **published but privately visible older build**, at `main@c8fadcb` as observed in owner screenshot. "Published" in provider terminology does **not** mean the owner has authorized a public launch.
- **Legacy preview:** Vercel Hobby `masher2` is not the commercial/public launch platform; its build-rate limit is documented and should **not** trigger a paid plan upgrade.
- **Code source:** private GitHub `hithisisakii09/stackpilot-ai`, draft [PR #1](https://github.com/hithisisakii09/stackpilot-ai/pull/1). The feature branch and `main` are distinct. No autonomous merge is authorized.
- **Build and defense:** Astro static, `netlify.toml`, `public/_headers`, `public/robots.txt`, and per-page meta noindex; GitHub Actions also validates the static build and test suite. **noindex is not access control**: private visibility must be enforced by the hosting service, not search-engine directives.


## Verified 2026-10-31 development checkpoint
- **Exact checked commit:** `bf7fdb6d5f1baa6cae7a0dbf9987f0014c75a920` on draft PR #1, not merged to `main`.
- **Build and validation:** [success](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41181607821).
- **Safety and operations report:** [success](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41181607850).
- **Chromium desktop/mobile acceptance and keyboard scrolling:** [success](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41181607800).
- **GitHub Netlify private deploy-preview status:** success at this SHA; this is not authenticated remote acceptance.
- **Anonymous external fetch:** nine documented private preview routes returned HTTP 401 on 2026-10-31. Point-in-time sample only, not exhaustive security proof. Evidence and route list recorded in GitHub [issue #2](https://github.com/hithisisakii09/stackpilot-ai/issues/2).
- **Open gates:** authenticated remote desktop/mobile owner testing, actual Netlify account credits/billing and visibility recheck, editorial signoff on six candidate vendor statements, publisher/legal/privacy verification, affiliate approvals if separately authorized, and explicit owner public release authorization.
- **Latest baseline:** 16 static pages. Legacy Vercel Hobby build-rate-limit is not a blocker to private Netlify development.
- **Authorization boundary:** ₹0, private/locked, no merge, public indexing, contracts or affiliate activation.

## Release gates — current state
- **No public launch** or search-engine indexing authorized. Do not unlock Netlify's production auto-publishing, change visitor visibility, merge `main`, attach public DNS, remove robots/noindex, or promote code without separate explicit owner approval.
- **No affiliate activation** or real referral links; the six software catalog entries are not independently approved products, partner research leads are unapplied, and reported commissions remain unknown. Neither vendor-claimed facts nor affiliate program existence proves program acceptance.
- **No paid upgrade**, purchases, domains, AI services, ad spend, payment methods, or contractual acceptance. Monthly budget **₹0**; delegated spending **₹0**.
- **Editorial approval pending** for every product claim and pricing comparison. The product-specific source notes are only candidate vendor statements until a real designated reviewer authenticates claims and addresses plan, geography, date and conditions.
- Publisher brand/identity and contact information, final legal/privacy and affiliate disclosures, commercial host-account entitlement and billing checks, custom domain choice, actual audience evidence, affiliate applications and KYC/tax/payout details still require the owner where applicable. Do not request secrets in a repository issue.

## Not independently verified
1. Netlify plan/account-level billing entitlement, active credit/usage quotas and any stored payment method.
2. Netlify visitor-auth enforcement via an independent, unauthenticated HTTP test at the latest SHA. The owner previously reported successful Incognito blocking.
3. The remote **authenticated** full UI and response headers of each new Netlify Deploy Preview. Local CI Chromium/axe tests are not that same test.
4. Any current production change beyond the older dashboard screenshot, legal signoff, editorial approvals, traffic, commission conversion, or actual monetary revenue.
5. Continued public reachability of every vendor-documentation URL; automated crawlers can disagree with the publisher website (e.g., Kinsta docs source index versus direct fetch).

## Verified checkpoint — 2026-10-31 later development cycle
- **Exact head:** `97c5b18c312c75d6fc91850fc3d36760b33c035b` (draft PR #1; development branch, not `main`).
- **GitHub build/tests:** [SUCCESS](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41195030857).
- **Safety/operations:** [SUCCESS](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41195030899).
- **Chromium desktop/mobile acceptance:** [SUCCESS](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41195030943).
- **Netlify PRIVATE Deploy Preview:** GitHub commit status SUCCESS. This does not independently establish authenticated remote UAT or present account settings.
- **Current product:** 17 static pages; requirements worksheet locally exports CSV with vendor responses blank and status Unverified; CRM and hosting migration guides are private/noindex.
- **Open owner-only gates:** authenticated exact-head remote acceptance, billing/credit-plan UI evidence, final privacy/legal/contact, six editorial claim approvals, and separate publication/monetization authorization.
- **Budget/release constraints:** ₹0 per month and ₹0 delegated; no production merge, public access/indexing, affiliate activation, contracts or purchases.

## What the autonomous agents should do next
1. Read `AGENTS.md`, this file, operating policy and latest [GitHub PR](https://github.com/hithisisakii09/stackpilot-ai/pull/1). Reconcile any stale snapshot against **current** GitHub checks and owner-provided provider UI evidence.
2. Run/read `npm run ops:report -- --json`, `npm run ops:backlog -- --json`, `npm run research:claims -- --json` and `npm run partners:queue -- --json` as appropriate, without changing accounts.
3. Prioritize source freshness and original comparison usefulness. Keep `status:candidate`, approvals false, vendor prices unknown, all affiliate URLs null and unreviewed claims out of public copy.
4. Run test-first changes only on the development branch. For final claims cite the exact CI, browser and Netlify status checks. Separate local browser QA from remote provider UAT.
5. Keep existing ChatGPT daily development/growth and hourly incident-watch tasks bounded and economical; report Vercel quota conditions without silently upgrading.
6. Escalate **only owner-only decisions** from [issue #2](https://github.com/hithisisakii09/stackpilot-ai/issues/2) and commercial [issue #3](https://github.com/hithisisakii09/stackpilot-ai/issues/3). No public, paid, contract, account or legal actions without explicit authorization.

## References for provenance
- [Draft development PR #1](https://github.com/hithisisakii09/stackpilot-ai/pull/1)
- [Owner's GitHub release checklist #2](https://github.com/hithisisakii09/stackpilot-ai/issues/2)
- [Official affiliate eligibility research](affiliate-eligibility/2026-10-31-primary-source-review.md)
- [Editorial research backlog #4](https://github.com/hithisisakii09/stackpilot-ai/issues/4)
- `docs/roadmap-to-launch.md` and `docs/zero-budget-hosting.md` for planning; this dated report supersedes outdated **status claims**, not the underlying policy or owner permissions.
