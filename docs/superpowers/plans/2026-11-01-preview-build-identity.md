# Phase 4.2 — Private Netlify Preview source-commit identity for authenticated UAT
**2026-11-01 | private draft PR #1 | monthly and delegated budget ₹0**

## Finding and source basis
The review packet asks the owner to confirm that the *actually served* private Netlify preview matches current PR HEAD, but the rendered site currently has no visible, commit-bound identity. GitHub's `deploy-preview` success confirms a provider-reported status, not proof of actual served page contents. Netlify's [official build environment documentation](https://docs.netlify.com/build/configure-builds/environment-variables/) describes `NETLIFY`, `CONTEXT`, `COMMIT_REF`, `PULL_REQUEST` and `REVIEW_ID` as read-only provider-supplied build variables. Use these **only at build time** for a visible, static, noindex source-identity page that the owner can inspect while legitimately signed in.

## Scope and requirements
- New pure `src/lib/preview-build-identity.mjs` with `buildPreviewBuildIdentity(meta)`. Accept precisely the five build-env fields with no other provider or user data retained. Only when `NETLIFY === 'true'`, `CONTEXT === 'deploy-preview'`, `PULL_REQUEST === 'true'`, `REVIEW_ID === '1'` and `COMMIT_REF` is exactly 40 lowercase hex, expose `status: 'PREVIEW_COMMIT_REPORTED'`, `sourceCommit` full SHA, `prNumber: 1`. In all other cases (e.g., GitHub Actions or localhost, wrong PR, missing invalid env, production context), expose `UNVERIFIED_CONTEXT` and `sourceCommit: null`. Never allow production metadata to masquerade as authenticated preview evidence.
- Both cases report `authenticatedHostedUatPassed:false`, `anonymousPreviewDenialVerified:false`, `providerAccountVerified:false`, `publicReleaseAuthorized:false`, `productionPromoted:false` and `delegatedSpendINR:0`. This SHA is **Netlify build metadata as rendered by the page**, not a cryptographic attestation nor independent access-control proof.
- Add an accessible static `/preview-build/` page with noindex, one h1, visible status and full SHA if known. No dynamic browser script, user input, tracking, remote calls, account data or secrets. Show 'Unavailable — cannot confirm served commit' in non-preview/unknown contexts. Preserve privacy disclosures and site navigation.
- Link route from the private homepage footer and the owner UAT reference document. Expand SHA-bound UAT packet with a checklist case to open this page while signed in, compare displayed full SHA to current PR HEAD, and record a non-sensitive PASS/FAIL/BLOCKED. Treat it as a human inspection only. Never automatically mark UAT PASS.
- Tests-first: pure metadata behavior including wrong review ID, production context, stale/fake commit, missing/extra values, nondisclosure and immutability. Additional source page checks for noindex, true build-time variable usage and link/packet scenario. Observe RED; implement; verify GREEN exact-head unit/build/preflight, browser all-route desktop/mobile axe, Netlify provider status and 401 anonymous sampler. Owner authenticated hosted UAT remains open.
- Browser local CI renders `UNVERIFIED_CONTEXT` because GitHub Actions isn't Netlify. **Do not insert fake COMMIT_REF into GitHub Actions to impersonate Netlify or claim exact-host verification.**
- Do not change Netlify hosting settings, domain, production, public indexing, affiliates, PR draft, contracts, legal/editorial decisions or spend. No new package or workflow.

## Test & release checkpoints
1. Commit this plan, tests and a TDD stub to draft feature branch.
2. Confirm intentional RED in CI.
3. Implement minimal helper, static page, homepage link, checklist. Green check at exact SHA.
4. Report only GitHub CI & provider status. Owner separately confirms authenticated remote loaded page + source SHA, real headers and provider UI before any release decision.

References: repo `AGENTS.md` and current state, gstack `review` and `qa` and Superpowers `test-driven-development` and `verification-before-completion` (skills read 2026-11-01). No package installation or paid tools.
