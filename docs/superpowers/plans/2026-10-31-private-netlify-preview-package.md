# Private Netlify Preview Build Package (Zero-Rupee Phase)

> **Agent method:** gstack review/QA; Superpowers RED→GREEN TDD and fresh verification.

## Existing state verified (2026-10-31)
- Owner screenshots: Netlify project `inspiring-chaja-cfb85f`; production `main@c8fadcb`; auto-publishing locked; production **Private**, previews **Private**.
- Development PR #1 remains draft, unmerged: branch `feature/phase-1-1-recommendation-engine`.
- No Netlify API connection from this ChatGPT context. Do not attempt secret extraction, spend wallet credits, disable protection, or publish on behalf of owner.
- Owner budget/delegation ₹0. No public launch authorization.

## Goal
Create a reproducible, short-lived **GitHub Actions private-preview package** with all 12 Astro static pages, prelaunch headers, robots rules, and a reviewable machine manifest. It can be used to verify or later stage a Netlify **Deploy Preview** but must not alter production, unlock publishing, or enable affiliates.

## Task 1 — test-first manifest policy
- Add failing Node tests for `buildPrivatePreviewManifest(files, policy, sha)`.
- Reject unsafe paths, duplicate files, missing mandatory routes/headers, unapproved publishing flags, nonzero budget and invalid SHA.
- Require an explicit nonpublication record and a sorted, deterministic file index.
- Verify expected CI RED with no implementation.

## Task 2 — build artifact without deployment
- Implement `src/lib/preview-package.mjs` pure validation.
- Add `scripts/create-private-preview-package.mjs`: walk `dist` without symlink traversal; hash generated files; verify noindex / robots / security headers / no unapproved affiliate URLs; write only `artifacts/private-preview/manifest.json`.
- Update existing read-only `.github/workflows/agent-ops.yml` job to build one tarball from `dist`, upload it and the manifest as a **three-day GitHub Actions artifact** without a Netlify token, remote deployment command, or extra job. Keep permissions read only.
- Tests assert workflow does not invoke any Netlify deployment or production promotion.

## Task 3 — review & handoff
- Run unit/build/ops and Chromium checks on exact head SHA.
- Update draft PR and operator issue #2 with VERIFIED evidence and remaining Netlify manual preview-creation workflow.
- No public launch, merges or Netlify account writes.

## Netlify preview detail
Netlify docs say Deploy Previews are associated with PRs on the connected repository, while visibility Private requires authorized Netlify login and does not imply public access. An existing PR predating Netlify connection may need a new PR commit or explicit Netlify UI action to create a Deploy Preview. A GitHub artifact **is not** a Netlify deployment.

References: https://docs.netlify.com/deploy/deploy-types/deploy-previews/ , https://docs.netlify.com/manage/security/secure-access-to-sites/project-visibility/
