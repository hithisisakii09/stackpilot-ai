# Netlify Free publisher preflight — documented facts versus account evidence
**2026-10-31 | PRIVATE review draft | No provider setting changed**

## Scope
Review selected host Netlify Free for StackPilot AI (ToolChoice Lab is a candidate future brand only). This document is **not** a legal assurance of commercial eligibility, a verification of current team/account billing, or an authorization to launch.

## First-party documentation check (checked 2026-10-31)
- Netlify's published credit-based-plan docs describe **Free at $0/month with 300 monthly credits and a hard limit/no auto recharge option**. Once a Free team's balance is exhausted, sites can pause until the next cycle. Read: https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/
- Credit consumption may include bandwidth, requests and certain other usage, and monthly credit allowances are **shared across a team**; do not infer unlimited free traffic or availability. https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/
- Netlify Web Analytics, if enabled, relies on server-side activity and includes unique-visitor measures based on IP information; **do not assume zero personal-data processing**. https://docs.netlify.com/manage/monitoring/web-analytics/how-web-analytics-works/ and https://docs.netlify.com/manage/monitoring/web-analytics/overview/
- The provider documents platform logs with plan- and service-dependent retention. This does not establish that any particular feature is enabled on this user's account. https://docs.netlify.com/manage/monitoring/logs/

## What actual project checks establish
At last preflight, GitHub PR #1 is draft and unmerged, source-build, safety/ops and Chromium tests previously passed, and Netlify private Deploy Preview status succeeded. Owner's prior private UI screenshots show production and preview visitor access Private and auto publishing Locked, with selected incognito access checks passed at that time. **GitHub status does not prove current billing/account configuration or privacy settings.**

## Owner-only read-only confirmation, screenshots should be REDACTED
1. Team/account plan actually lists **Free** and displays current billing period, credits used and remaining. Do not change plan, payment methods or add-ons.
2. No paid subscription, purchased credit packs, or unexpected billable services associated with this team. Treat actual account statement as evidence.
3. Project Production and Deploy Preview visibility still **Private**; Auto Publishing still **Locked**.
4. Netlify Analytics settings: confirm if Web Analytics/Real User Monitoring or optional measurement is enabled, which data it captures, whether it can be disabled, and actual implementation-specific controls. Do not enable analytics just to inspect.
5. Netlify Functions, Forms, Blobs, database, Edge Functions and any team-wide projects used: identify the services that are ACTUALLY configured, and any relevant logs/retention/subprocessors. Check for external scripts, pixels, marketing tags and form endpoints in StackPilot code.
6. Commercial use / free-plan suitability: obtain applicable current Netlify terms and any relevant limitations for the intended business. **Do not accept new terms or change settings in this step.**
7. Privacy disclosure: name the actual operator/controller and country, applicable rights/contact, retention and cookies only from verified facts. A proposed business mailbox was privately supplied in chat but is intentionally NOT written in GitHub until a separate public-use decision.

## Concrete evidence ledger
| Item | Provider-document research | Actual-account evidence | Decision |
| --- | --- | --- | --- |
| Free list price / credit hard limit | Documented by Netlify | Owner screenshot from earlier Free dashboard; fresh check pending | PENDING |
| Monthly credits / pause risk | Netlify published account and credit rules | Fresh current team/billing dashboard needed | PENDING |
| Auto recharge exposure | Free says no auto recharge option | Fresh actual plan and financial settings check needed | PENDING |
| Private production and preview | Prior owner UI + prior anonymous sample | Fresh access-policy UI if release reconsidered | PENDING RECHECK |
| Auto publishing Locked | Prior screenshot | Fresh owner UI if release reconsidered | PENDING RECHECK |
| Web Analytics / RUM configuration | Product docs describe options | Actual project setting not established | UNKNOWN |
| Logs / data processing | Provider documentation indicates technical logging possibilities | Account-specific services and applicable processing terms not established | UNKNOWN |
| Commercial eligibility/legal terms | Not established by merely having a free plan | Owner legal/terms review needed | BLOCKED |
| Public publisher name and email | Candidate name and mailbox privately selected | No publication approval | BLOCKED |
| Public release | No owner consent | Remains prohibited | NO-GO |

## Prohibited shortcuts
Do not equate 'no custom form submission in app' with 'no traffic data processed by platform'. Do not infer site compliance from HTTP headers. Do not publish a final privacy policy while actual subprocessors/retention are unknown. Do not edit live privacy text, register services, activate analytics, alter Netlify visibility or auto publishing, spend money, merge PR, enable affiliates or launch public production.

**Budget:** ₹0 monthly, ₹0 delegated spend. **Status:** research-only; site PRIVATE and public-production NO-GO.
