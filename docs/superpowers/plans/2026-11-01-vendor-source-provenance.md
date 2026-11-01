# Source URL provenance hardening — 2026-11-01

**Goal:** Make every vendor-source URL in the unapproved software catalog match the same first-party provenance rules as comparison counts, so a future mistaken or malicious source cannot appear in the profile as an official vendor research lead.

**Scope:** Private feature branch and draft PR #1 only. No catalog facts, prices, approval flags, affiliate links, third-party accounts or live provider configuration changes. Preserve ₹0 spend, private Netlify and blocked public launch.

**TDD plan:**
1. Add negative tests to `tests/catalog-validation.test.mjs`: outsider host, lookalike host, tracking parameters, credentials, abnormal port and homepage source. Add positive cases: official vendor subdomain and the explicit DigitalOcean-managed Cloudways product path. Test missing `src/lib/vendor-source.mjs` helper as RED.
2. Create pure `isVendorSourceUrl(product, sourceUrl)` in `src/lib/vendor-source.mjs`: HTTPS, official hostname subdomain boundary, no userinfo/query/hash/port, meaningful documentation path, explicit Cloudways DigitalOcean product-page exception only.
3. Reuse predicate in `src/lib/catalog-validation.mjs` and `src/lib/comparison.mjs`. Validate catalog sources fail-closed rather than showing unauthorized external links. Keep unapproved status.
4. Verify exact-head Node tests, data/build, 17-route static preflight, Chromium/axe and Netlify private preview. Review diff for false positives and no domain bypasses, then record in PR #1 and issue #5.

**Risks:** Cloudways is branded separately from DigitalOcean; its owned product path must remain allowed but unrelated DigitalOcean pages must not be. Official first-party URL is only *source provenance*, not independent editorial verification. No provider-authenticated remote QA or legal readiness follows from unit test pass.

**Method:** Superpowers writing-plans, TDD RED→GREEN, verification-before-completion; gstack architecture review, QA and security review. Read upstream docs, did not install external tools.
