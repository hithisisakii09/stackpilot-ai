# Private Netlify CSP hardening — 2026-11-01

**Purpose:** Add a fail-closed Content-Security-Policy (CSP) to StackPilot's private Netlify static pages. The existing static preflight rejects known external HTML resources but does not enforce browser-level isolation when an HTML parser/runtime loads other network resources.

## Product/security review
- StackPilot is a static Astro site. The four interactive page scripts are built/bundled (none declared `is:inline`). Existing source CSS is embedded in `<style>` and thus requires `style-src 'unsafe-inline'` temporarily.
- Normal outbound vendor `<a>` links remain permitted, but direct browser loading of external scripts, frames, fonts, images, network calls and form submissions is unnecessary.
- Use Netlify `public/_headers` rather than provider account changes. CSP also copied into static build artifacts for any supported static hosting. This does **not** prove Netlify private visitor authentication or legal/privacy compliance.

## Implementation and tests
1. **RED:** Add `tests/release-preflight.test.mjs` fixtures and checks that reject missing CSP, permissive external script/connection/image origins, `unsafe-inline` script, unsafe eval, framing, and missing `object-src 'none'`. Verify GitHub CI fails the new tests before implementation.
2. **GREEN:** Modify `src/lib/release-preflight.mjs` to parse the wildcard CSP and require a small exact directive whitelist with no remote host wildcards or executable script exceptions. Add policy to `public/_headers`; update baseline test fixture. Prefer exact directive token set, not string-substring matching.
3. Verify `npm test` (unit/data/build/17-page preflight), npm audit, GitHub safety/ops, Chromium/axe desktop/mobile and Netlify private deploy-preview status on the same final SHA. Track any future need for CSP nonce/hash if JS architecture changes.
4. Do not claim CSP is live on the latest authenticated Netlify browser session without independent response-header UAT.

## Proposed policy
`default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'; object-src 'none'; base-uri 'self'; worker-src 'none'; media-src 'self'; manifest-src 'self'; upgrade-insecure-requests`

## Restrictions
Keep ₹0/month and delegated spend, no new packages, no production merge or public deployment, no indexing, no affiliate activation, Netlify Private/Locked, six vendor claims unverified. Draft PR #1 only.

**Sources/method:** Read gstack README, Superpowers writing-plans/TDD/verification-before-completion public instructions for this sprint. Apply RED→GREEN, design/security review and exact-head QA; no external installation.
