# 2026-11-01 — Netlify owner-only release and zero-cash hosting verification
**Scope:** read-only review, dated documentation update, no provider account action.

## Goal
The user wants StackPilot AI to keep operating autonomously under ₹0 and to reach production only after a separate owner release decision. Before asking them to check account settings, confirm real 2026 Netlify terms rather than relying on a 2024 blog post or historical screenshots.

## Verified official sources (2026-11-01)
- [Credit-based Free plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/): $0/month, 300 credits shared across team per billing cycle, hard limit, no Free auto recharge.
- [How credits work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/): Deploy Previews/branch deploys 0 build credits but bandwidth and web requests still use credits; production deploys 15 credits each. Pricing/allowance may change; do not use these values as an account measurement.
- [Billing FAQ](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/): exhausted credit balance pauses **all team web projects** until next cycle or explicit plan change. No upgrade authorized.
- [Project visibility](https://docs.netlify.com/manage/security/secure-access-to-sites/project-visibility/): Free private deployments owner-only; separate production and Deploy Preview settings. A 401 sample is a useful point-in-time observation, not universal proof of private access.
- [Netlify Free blog](https://www.netlify.com/blog/introducing-netlify-free-plan/): commercial projects explicitly allowed (November 2024); account-specific current terms and legal applicability remain owner-owned.
- [Netlify build environment](https://docs.netlify.com/build/configure-builds/environment-variables/): `COMMIT_REF`, `CONTEXT`, `PULL_REQUEST`, `REVIEW_ID` available to indicate preview build, but emitted values are not cryptographic attestation.

## Work
1. Amend `docs/zero-budget-hosting.md` (rather than adding new user features or deployments) with precise verified commercial/free limits and the no-billing-risk vs no-outage distinction.
2. Provide one compact **owner-only checklist** for Netlify account verification, actual signed-in preview SHA match, remote headers, and evidence-free unknown verdicts. Preserve all existing source code, pricing/affiliate status, noindex and publication hold.
3. Verify exact SHA GitHub build/operations/Chromium and Netlify preview reporting if committing; note that each new documentation commit triggers CI and that CI does NOT replace hosted UAT. Update draft PR with factual report; stop rather than merge.

## Acceptance
No token/identity/document upload, login automation, purchase, domain action, visibility change, production promotion, agreement or affiliate activation. Work is complete when documentation is accurate and exact-head CI is reviewed; launch remains NO-GO and real owner UAT remains UNVERIFIED. Use gstack review/QA and Superpowers verification guidance manually (read this turn). No code is changed, so no behavior TDD.
