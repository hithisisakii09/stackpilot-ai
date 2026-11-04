# 2026-11-01 — Private owner-hosted UAT evidence worksheet
**Scope:** private Astro feature branch only. No public launch, merge, account access change, new tool subscription, hosted source approval, affiliate activation or spending.

## Problem
The current exact-SHA UAT packet is generated in GitHub Actions, but an owner on mobile must manually locate that artifact, compare the protected site's actual SHA to PR HEAD, test routes and settings, and export results. This friction has kept authenticated hosted UAT unresolved. Avoid replacing owner observation with another fake CI-derived green result.

## Proposed solution
Add a **local-only self-attested owner UAT worksheet** linked from the protected /preview-build/ page and homepage footer. It must not be presented as a remote testing agent or actual account verification.

### Behavior
- Owner enters the current **expected** PR HEAD and **observed** 40-character Git SHA shown on a legitimately authenticated preview page. Both must be lower-case hex (strict, no whitespace, no shortened hashes), never populated by CI, tool code, or guessed current version.
- Six fixed manual status selectors: `previewSha`, `authenticatedRoutes`, `anonymousDenial`, `liveHeaders`, `privateAndLocked`, `billingAnalytics`. Values: `not-checked` (default), `pass`, `fail`, `blocked`. These are *self-reported status labels*, not independently verified. User can review static instructions with a link to the precise CI packet. Never collect credentials, cookies, personal data, customer information, free-text notes, screenshots or financial/account IDs.
- Pure `src/lib/owner-uat-worksheet.mjs`: accepts an exact schema and strict hash/status formats; recomputes `shaMatches` and explicit blocking IDs. Even when all gates are self-reported pass and SHA matches, report `OWNER_SELF_REPORTED_ONLY`, with `hostedUatIndependentlyVerified:false`, `publicReleaseAuthorized:false`, `accountSettingsChanged:false`, `canSpend:false` and `editorialApproved:false`. Any mismatch or unassessed/failed/blocked selector: `BLOCKED_UNVERIFIED`. Formatted human text and fixed-schema CSV reject forged output and omit formula-capable freeform values.
- Browser-only page `src/pages/tools/private-uat-worksheet/index.astro`, noindex, local form submission prevented, no storage/network, copy and CSV download buttons disabled until valid assessment. Any input/select change or reset invalidates outputs and disables export. Responsive and keyboard accessible. Export is **local evidence for human review** and never submits approval to GitHub/Netlify.
- Add navigational link on /preview-build/ and homepage footer. Extend current Chromium QA with mismatch/default, self-reported all-pass still NOT approved, actual CSV download, edit invalidation, no network form requests and accessibility. Add route in the SHA-bound UAT packet for manual reviewer verification. Dedicated tests validate enums, hash mismatch, forged approvals, strict schema, no added data and no privacy-bypassing network.
- Preserve today's existing design and unapproved vendor claims; avoid new analytics, external access, dependency or subscription.
- Review gstack review/QA and Superpowers test-driven-development and verification-before-completion methods. Tests first, verify initial RED via GitHub Actions, minimum GREEN, exact-head CI + Chromium/axe/ops, PR comment. Any failure gets fixed or reported. No claim of real hosted UAT.

## Hard stops
Private protected preview only, Netlify project `inspiring-chaja-cfb85f`, branch `feature/phase-1-1-recommendation-engine` and draft PR #1; no edits to `main`, Netlify plan, production, visibility, publish settings, affiliate programs, domain or checkout. Keep ₹0. Separate owner publication, legal/privacy, vendor editorial and commercial approvals remain NO-GO.
