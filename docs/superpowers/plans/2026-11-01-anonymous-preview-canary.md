# Phase 3.9 — Bounded anonymous Netlify preview exposure check
**2026-11-01, private development only. ZERO budget.**

## Why
The largest remaining technical uncertainty is whether StackPilot's current separate private Netlify Deploy Preview rejects unauthenticated visitors. A successful provider commit status or local Chromium pass does not establish this. The existing manual UAT gate remains unverified. Add a small **read-only anonymous canary** into the *existing* safety/operations workflow (no new schedule, provider, paid tool, login, or long-lived credentials).

## Guard design and threat model
- Fix the *one* allowed origin as `https://deploy-preview-1--inspiring-chaja-cfb85f.netlify.app`. Probe only two known site paths `/` and `/compare/`, **GET once per path**. No arbitrary URLs, customizable host, credentials, Netlify API tokens, cookies, authorization headers, request bodies, dynamic form actions, redirects, or external third-party calls. No retry loops. Use Node native `fetch`, `redirect:'manual'`, `credentials:'omit'`, `cache:'no-store'`, an AbortSignal timeout (≤4 seconds each), and cancel the response body without reading it. One pipeline run emits at most two anonymous page hits; traffic may appear in Netlify visit analytics.
- Pure `assessAnonymousHttpStatus(status)` maps 401/403 to `DENIED_FROM_CI_RUNNER`; all 2xx to `POTENTIAL_ANONYMOUS_RESPONSE` (NOT proof of content leak; some providers return 200 login pages); 3xx, 404, 5xx, timeouts and network errors to `INCONCLUSIVE`. Never mark `remoteAuthenticatedUatPassed`, `releaseAuthorized`, or `currentDeployShaVerified` true. Response behavior may differ by region and provider; only point-in-time uncredentialed checks from GitHub's runner.
- Export `probeAnonymousPreview({fetchImpl,requestedCommit,timeoutMs})`, with injectable fake fetch in tests. Validate requestedCommit as 40 lower-hex SHA, annotate `requestedCommit` as **requested not verified**; no claim the inspected host served that SHA. Build deterministic two-row report (schema/source, `sampleCount`, `overallStatus`, statuses and a fixed safety disclaimer); do not store server response bodies, headers, login redirects, IPs, login links, cookies, secrets or fetched content.
- New `scripts/anonymous-preview-probe.mjs`: writes bounded JSON-only to `artifacts/ops/anonymous-preview-probe.json`, no print of fetched content. GitHub Actions reuse existing `.github/workflows/agent-ops.yml`: run after tests with exact `PREVIEW_SOURCE_COMMIT`; upload artifact using current 7-day retention, then a final gate returns a failed operations job for any potential anonymous 2xx. Other results remain advisory and MUST NOT be interpreted as release-ready.
- The operations report and human UAT packet retain all remote checks **UNVERIFIED**, even for 401/403. A more exhaustive owner-authorized live test is still mandatory before any public action.

## Test-first
1. Commit plan, add tests for 401/403, 200/206, redirects, errors, no redirects/cookies/headers/response body, exact host/routes, invalid SHA, bound sample count, no false authorization, no leaked secrets, pinned workflow and failure post-artifact; check RED CI.
2. Implement pure helper and CLI and CI integration to GREEN; inspect logs, exact-head GitHub workflows, and provider status.
3. If a suspicious anonymous 2xx occurs, **do not change site visibility** or bypass controls. Fail the operations check, retain only sanitized evidence, flag for owner inspection. If a network timeout, report INCONCLUSIVE, not PASS.
4. Record exact SHA, CI evidence and limits in draft PR. No Netlify setting, main, production, affiliate, indexing, brand, contracts or spending changes.

## Skills followed manually
- gstack: plan-eng-review, qa (read from `garrytan/gstack`).
- Superpowers: test-driven-development and verification-before-completion (read from `obra/superpowers`).
