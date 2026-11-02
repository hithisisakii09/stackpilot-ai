# Private static asset integrity — engineering plan

Date: 2026-11-02 · Scope: StackPilot draft PR #1, private only · Public release: NO-GO

## Goal and impact
Validate every rendered first-party script, stylesheet, image and preload reference against the actual Astro dist file inventory before a Netlify Deploy Preview is considered technically ready. The existing navigation audit checks anchors, not referenced browser resources. Do not add runtime dependencies or any network access.

## Design
1. Add pure src/lib/static-asset-audit.mjs exporting auditStaticAssetReferences(pages,files), returning checkedAssets and violations. Inspect rendered HTML resource attributes and first-party stylesheet/preload href; ignore inert data-* and non-resource link relations; resolve nested routes and file suffixes against emitted files. Reject unsafe external schemes, malformed encodings and missing assets.
2. Add tests/static-asset-audit.test.mjs proving: missing assets are caught; relative assets/srcset/query work; unsafe paths and external URLs are rejected; inert attributes excluded; CLI integration exists.
3. Wire the audit into scripts/release-preflight.mjs using the existing pages/allFiles inventory, fail on new violations and report checkedAssets. This is static build integrity, not remote hosted QA.
4. Validate in exact-SHA CI Node tests, data/build, release preflight and desktop/mobile Chromium. Netlify private status must be independently checked; do not infer remote authenticated access.

## TDD evidence and verification
- Local Node v22.16.0: pure module RED (3 targeted behavior failures, 1 control pass) using unimplemented stub; GREEN (4/4 targeted tests) after implementation.
- Local CLI integration test RED when the preflight driver lacked auditStaticAssetReferences; implementation added before GitHub commit.
- GitHub checks and deployment status are not claimed until confirmed for the resulting SHA. The project's Node >=22.23.4 CI remains authoritative; local Node version is for narrow unit tests only.

## Guardrails
No changes to main, production Netlify configuration/visibility/lock, noindex, legal claims, affiliates, brand, operator identity, spending policy or permissions. ₹0 monthly budget and ₹0 delegated spend. No extra package installation; avoid unnecessary commits to preserve free build credits. gstack review/QA and Superpowers TDD/verification methodology applied from their public upstream SKILL.md sources.
