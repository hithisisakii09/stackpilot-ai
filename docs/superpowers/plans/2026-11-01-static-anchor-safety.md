# Static anchor destination safety Implementation Plan

> **For agentic workers:** Use Superpowers test-driven-development and verification-before-completion; apply gstack code review and browser QA. This plan is private prelaunch engineering, not public release clearance.

**Goal:** Reject executable, protocol-relative, insecure HTTP, and entity-obfuscated anchor destinations in all emitted static HTML pages while preserving ordinary HTTPS and relative navigation.

**Architecture:** Extend the existing pure `auditStaticRoutes(pages)` in `src/lib/release-preflight.mjs`; do not add dependencies or perform network calls. Inspect actual `<a href>` attributes only, with conservative numeric/essential named HTML entity decoding and normalization of URL whitespace/control characters. The existing build-wide preflight already invokes this function.

**Tech Stack:** Node.js >=22.23.4, Astro static build, node:test.

**Spec:** Current `docs/product-evidence-contract.md`, `AGENTS.md` and `docs/current-operational-state.md`; strict prelaunch restrictions remain unchanged.

## Global constraints
- Authorized monthly and delegated spending: ₹0.
- Keep PR #1 DRAFT; do not merge to main, publish publicly, enable indexing, affiliates, analytics, paid services, or external contracts.
- No new dependencies; do not alter the Netlify visibility or production publishing lock.
- Links to official HTTPS vendors are allowed as ordinary navigational anchors, never affiliate or verification claims.

## Review focus
- Numeric entity encoding of an executable scheme must not bypass the scanner.
- HTML named colon and hidden tab/newline inside the scheme must not bypass the scanner.
- Protocol-relative and HTTP destinations must be rejected; HTTPS external vendor links are allowed.
- Non-actionable data-href attributes are ignored; local/fragment links remain valid.
- Route-level errors are preflight findings only; they never authorize deployment or attest remote hosted authentication.

## Task 1: Anchor URL preflight regression
**Files:**
- Create: `tests/anchor-destination-guards.test.mjs`
- Modify: `src/lib/release-preflight.mjs`

**Interfaces:**
- Consume `auditStaticRoutes([{path:'index.html',html}])`.
- Return a violation containing `unsafe anchor destination` for each dangerous `<a href>`.

- [ ] Write tests covering `javascript:`, `data:`, `http:`, `//host`, `java&#x73;cript:`, `javascript&colon;`, and control-character-obfuscated scheme.
- [ ] Verify RED in GitHub CI: expected failing behavior assertions at the test-only commit; distinguish failures from build/environment issues.
- [ ] Implement safe scheme handling in `auditStaticRoutes` using a constrained entity decoder; reject unrecognized absolute schemes rather than accepting them.
- [ ] Verify GREEN: all unit tests, data validation, Astro build, static route preflight and Chromium desktop/mobile checks at exact final commit SHA.
- [ ] Review changed source for regex bypass, falsified host-authorization, accidental vendor link block and unrelated changes; record any remaining limitations.
- [ ] Leave the PR draft and production state unchanged.

## Verification
Run `npm test` and GitHub Chromium/browser acceptance workflow at the final SHA. Inspect Netlify Deploy Preview GitHub status separately; it cannot prove remote authenticated UAT. Owner editorial/legal/host-billing/release gates remain NO-GO.
