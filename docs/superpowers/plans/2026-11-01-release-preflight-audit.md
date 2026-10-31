# StackPilot AI production preflight — 2026-11-01

**Goal:** Make the private release candidate *engineering-ready* with a fail-closed audit of every generated static HTML route and deploy-level crawl/safety settings. This is **not** a public launch, editorial signoff or account-level access test.

**Technical plan — test first**
1. Add `tests/release-preflight.test.mjs` against `auditStaticRoutes` and `auditDeploymentConstraints` exports. Expected RED: functions unavailable. Cases: all pages reviewed, rogue new route missing noindex fails, hidden externally hosted scripts/form posts fail, empty output fails, safe routes pass, nonzero budget/approved affiliate/production flags fail, absent wildcard hosting headers/robots fail. Use small representative fixtures, never live credentials.
2. Implement `src/lib/release-preflight.mjs` pure functions, with strict matching and deterministic issue list.
3. Add `scripts/release-preflight.mjs` read-only CLI to recursively enumerate every `dist/**/*.html`, inspect built `_headers` and `robots.txt`, and load the budget/approval policy. Exit nonzero if any check fails. Produce JSON with no secrets or account claims when `--json` is supplied.
4. Add `release:preflight` npm script and call it after `check:build` in `npm test`. Existing PR CI thereby validates the complete *static* route set and policy on each new code change.
5. Verify RED and GREEN at actual commit SHAs with GitHub Actions (Node tests, Astro build, Chromium/axe, operations report, Netlify private preview status). Record any external/owner-only gates separately in release issue #5.

**Threat model and review:** A new static route might be accidentally publicly indexable even if older known routes pass; a page could embed an external script or submit a form to an unexpected endpoint. Detect these before merge; do not claim browser-only telemetry inspection covers provider-level Netlify Analytics. Scan rendered HTML rather than only a hard-coded route list. Avoid mistaking `noindex` for private access control; Netlify authentication/visibility requires independent remote verification.

**Ownership boundaries:** ₹0 monthly/delegated spend; no packages, payments, new provider accounts, contracts, production publishing, DNS, PR merge, public indexing, affiliate links, fabricated vendor approvals, or changing Netlify visibility. This plan authorizes only a private release engineering hardening pass.

**Methodology sources:** gstack README and Superpowers skills `writing-plans`, `test-driven-development`, `verification-before-completion` read 2026-11-01. No upstream scripts installed.
