# Entity-encoded external resource URL blocking — private prelaunch hardening

**Date:** 2026-11-02. **Target:** StackPilot AI draft PR #1, `feature/phase-1-1-recommendation-engine`. **Authorization:** private development only; public launch NO-GO and ₹0 monthly/delegated budget.

## Scope and reason

A privacy-oriented release preflight already rejected literal external script, image, iframe, form and link URLs, but actual HTML character references can conceal the scheme or protocol-relative prefix. In the existing pure `auditStaticRoutes` at starting head `a8ce392a3fb5e8cdca9c44f0c35bf55ca297940c`, eight executable-network markup samples using `&#x68;`, `&colon;`, `&sol;`, or `&#x2f;` all had **zero violations**. One case uses `dns-prefetch`, a speculative cross-site request that shouldn't rely on CSP.

No assertion is made that live product pages contain any such markup. The issue is missing pre-deployment detection.

## Implementation plan

1. **RED:** test that entity-encoded cross-site `src`, `srcset`, `href`, `action`, `formaction` fail the static audit. Confirm old audit accepts all eight (unexpected passes). Include false-positive controls for a locally encoded path, official HTTPS anchor and inert `data-src`.
2. **GREEN:** reuse one narrow HTML URL reference decoder for the existing anchor validation and the fetched-resource/form URL detector. Decode numeric code points and common named HTML references; strip URL parser whitespace/control characters before scheme and protocol-relative checks. No dependency or network access.
3. **Review:** cross-check against Netlify CSP, noindex restrictions, local assets and safe official navigation. This scan remains defense in depth, not a full browser parser or privacy guarantee.
4. **Verify:** run full Node tests, catalog/static release preflight, CI packaging/operations, Chromium desktop/mobile tests and inspect exact-head Netlify deploy status. Publish only verifiable CI evidence in draft PR.

## Non-goals and safeguards

Do not change `main`, Netlify provider access/Analytics/Auto Publishing, production, domain, robots or actual `_headers`; do not approve claims, activate affiliates, accept legal agreements, collect secrets or spend. Human owner gates (billing, current served SHA, authenticated UAT, actual HTTP headers, privacy/legal, editorial, partner and release) remain separately UNVERIFIED.

## Method source material

- gstack: https://github.com/garrytan/gstack (plan-eng-review, review)
- Superpowers: https://github.com/obra/superpowers (writing-plans, test-driven-development, verification-before-completion)
