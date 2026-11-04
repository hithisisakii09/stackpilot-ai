# StackPilot private prelaunch guard: prevent header and robots overrides

**Date:** 2026-11-02. **Scope:** draft PR #1 only, no deployment, account change or public launch authorization.

## Why

The previous static audit checked whether wildcard Netlify headers and the robots disallow rule existed, but did not reject later route-specific overrides, duplicate X-Robots headers or a conflicting Allow/user-agent block. A safe wildcard and a conflicting exception could coexist while preflight reported PASS.

## Plan and evidence

1. RED: add two security regression tests to `tests/release-preflight.test.mjs` covering route-scoped Netlify overrides, duplicate noindex and conflicting robots directives. Verified expected RED in GitHub [Validate and build #41391112566](https://github.com/hithisisakii09/stackpilot-ai/actions/runs/41391112566): 416 tests, 414 passed, exactly two new tests failed.
2. GREEN: make `auditDeploymentConstraints` in `src/lib/release-preflight.mjs` fail closed unless `_headers` has exactly one wildcard scope, wildcard security headers are unique, and `robots.txt` contains exactly User-agent: * and Disallow: / (with optional comments/blank lines).
3. QA: rerun full unit/data/static-build/release-preflight pipeline and Chromium mobile/desktop workflow for the exact resulting Git SHA. Do not report success until GitHub Actions shows the outcome.
4. Release governance: noindex, robots and CSP are defense in depth, **not authentication**; Netlify private/locked settings, live response headers, billing/Analytics, authenticated owner UAT, editorial/legal/affiliate and launch gates remain unverified and require separate evidence.

## Risks

This intentionally forbids future route-specific `_headers` or any extra `robots.txt` directives until separately reviewed and their tests updated. The existing plain wildcard block and robots directives remain valid. Do not modify `main`, Netlify provider configuration, visibility, affiliate URLs or spending policy.
