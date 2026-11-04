# Audit emitted CSS and obfuscated inline CSS resource URLs

Date: 2026-11-02. Branch: feature/phase-1-1-recommendation-engine. Authorization: private engineering only; ₹0 monthly/delegated spend, no merge or publication.

## Scope and evidence

A read-only probe of the current preflight accepted four synthesized remote CSS references: an HTML-entity-encoded inline style URL, CSS hex-escaped remote url(), an escaped remote @import, and an escaped protocol-relative URL. The asset inventory also had no CSS-content input, so a first-party stylesheet could import remote CSS or load remote assets without the stylesheet's contents being checked. No claim that live product output contains these patterns.

## Plan and TDD

1. RED: add regression cases for the four inline CSS bypasses and external references in emitted CSS files; confirm all fail to flag on old head.
2. GREEN: decode HTML character references in style attributes; normalize CSS escape sequences before checking remote url() and @import; pass every emitted .css file into the static asset audit; fail closed when stylesheet content is omitted or malformed.
3. Review: permit relative first-party paths and data: URLs, preserve no network access and no new dependencies. Keep regex detection explicitly defense-in-depth, not a standards-complete CSS parser.
4. Verify: Node full suite, build/static preflight, exact-head Chromium desktop/mobile QA, operations package and Netlify deploy status. Report actual CI evidence; no owner-only hosted checks inferred from CI.

## Changed files

- src/lib/static-asset-audit.mjs: CSS escape normalizer, external CSS resource detector and complete emitted stylesheet inventory checks.
- src/lib/release-preflight.mjs: apply HTML-reference decoding and CSS escape detection to embedded/inline styles.
- scripts/release-preflight.mjs: load every emitted CSS file and pass contents to the asset audit.
- tests/static-asset-audit.test.mjs and tests/release-preflight.test.mjs: RED/GREEN regression coverage and CLI integration.
- This plan document.

## Boundaries

No production files, provider settings, analytics, hosting visibility, auto-publishing, secrets, vendor approvals, affiliate links or payment configuration changed. Protected remote preview authentication, exact served SHA, live headers, privacy/legal/editorial and separate production approval remain owner-only NO-GO gates.

## Method references

- gstack plan/review: https://github.com/garrytan/gstack/tree/main/plan-eng-review and https://github.com/garrytan/gstack/tree/main/review
- Superpowers TDD and verification: https://github.com/obra/superpowers/tree/main/skills/test-driven-development and https://github.com/obra/superpowers/tree/main/skills/verification-before-completion
