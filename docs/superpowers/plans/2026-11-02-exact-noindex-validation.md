# Correct false-positive private noindex and security header validation

**Date:** 2026-11-02. **Owner gates:** all human UAT, editorial, provider billing and public release gates remain NO-GO. Work only on draft PR #1 development branch. ₹0 budget.

## Problem / bounded reproduction (RED)

The previous noindex scan searched a substring within a whole `<meta>` tag, so `data-name="robots"` could impersonate `name="robots"`, and `content="noindex-test"` matched the word-boundary regex even though not a true noindex token. Similarly, Netlify header values `noindex-bogus`, `nosniff-bogus` and `DENY-bogus` passed the required-header audit. On 2026-11-02 the current source functions were executed as-is in a read-only isolated JavaScript harness: **all five malicious cases incorrectly returned zero violations**. Actual baseline `public/_headers` passed as expected.

## Plan (gstack eng review / Superpowers TDD)

1. Add behavior tests to `tests/release-preflight.test.mjs`: spoofed meta attributes, invalid token suffixes, conflicting index directives, malformed or mixed-case header values, and known valid alternatives.
2. Fix `auditStaticRoutes` to parse real `name` and `content` attributes using the existing attribute parser, split robots content on comma tokens, require true `noindex` without `index`. This is a static defense-in-depth guard, not a browser parser.
3. Fix `auditDeploymentConstraints` to parse individual wildcard header values: `X-Robots-Tag` must contain the exact `noindex` directive plus only previously allowed tokens, `X-Content-Type-Options` exactly `nosniff`, and `X-Frame-Options` exactly `DENY`. Preserve existing strict CSP and duplicate/scope checks.
4. Run actual before/after pure-function harness assertions in isolated JavaScript, then commit tests+code+plan together to avoid repeated free Netlify preview builds. Verify exact-head GitHub unit tests, static build, ops, Chromium/axe and deployment status before claiming GREEN.

## QA and risks

- No dependency changes or new network actions. Existing 25 rendered pages and `public/_headers` remain unchanged.
- This deliberately rejects suffix or nonstandard directives until reviewed; the existing exact `noindex, nofollow, noarchive` is valid.
- No public launch, `main` merge, visibility/analytics/billing changes, affiliate activation or fabricated business/traffic claims.
- CI builds are engineering evidence only; provider billing, actual served commit, authenticated preview UAT and live security headers still require independent owner checks.

## Method references
- gstack `plan-eng-review` and `review`: https://github.com/garrytan/gstack
- Superpowers `test-driven-development`, `writing-plans`, `verification-before-completion`: https://github.com/obra/superpowers
