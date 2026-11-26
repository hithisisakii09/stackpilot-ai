# Phase 2 — Fix wrong pull-request identity in private owner UAT worksheet

Date: 2026-11-06. Draft PR #8 (`feature/phase-2-product-readiness`). Budget ₹0; no production actions.

## User-facing bug and trust boundary

On the current PR #8 Deploy Preview, `/tools/private-uat-worksheet/` tells the owner to use **PR #1** and its SHA. The underlying `OWNER_UAT_CHECKS.previewSha` hint also references PR #1. This is misleading after PR #1 was merged, could generate a false mismatch or an apparently complete self-attestation against an unrelated build.

`/preview-build/` already has a fail-closed, static-build-only `buildPreviewBuildIdentity` classifier using Netlify's `NETLIFY`, `CONTEXT`, `PULL_REQUEST`, `REVIEW_ID`, and `COMMIT_REF` inputs. Reuse this classifier to dynamically label the GitHub PR number **only for valid Deploy Preview metadata**. Do not automatically fill or approve the owner-entered expected or observed SHA. A local/non-Netlify build must say the preview PR identity is unavailable and direct the owner to stop the identity check until they can inspect the actual authenticated preview.

## Plan — regression test first
1. Add RED tests asserting the worksheet's guidance uses `buildPreviewBuildIdentity` with the identical five whitelisted Netlify values, never hardcodes PR #1, and gives a safe generic fallback for invalid preview context. Ensure the shared six-check hint is PR-neutral.
2. Minimal Astro page fix: read only whitelisted build-time identity values, conditionally show `current draft GitHub PR #<validated REVIEW_ID>` and the corresponding GitHub link. When the context cannot be validated, show an explicit **BLOCKED** unknown-PR warning and a generic PR-list link; do not use user-controlled query parameters, page scripts, or tokens. The form's expected SHA remains blank and user-supplied.
3. Update local Chromium browser acceptance to guard against regression (the local non-Netlify build must show the unavailable state and must not link PR #1). Keep owner-self-reported status and export unchanged.
4. Document the dynamic PR identity behavior, the exact-head check and mandatory separate remote authenticated owner UAT, without claiming this engineering fix proves remote security.
5. Verify current SHA: Node tests, data validation, Astro build, privacy and release preflight, Chromium QA and Netlify **private** preview. Confirm release NO-GO, main unchanged, PR remains draft.

## Explicit non-goals
No vendor-source inspection, source proposals, excerpts, evidence approvals, production/public deployment, Netlify access changes, new dependencies, payments, affiliates, outreach, contracts, auto-merge, authenticated remote testing or claim of zero billing. The browser form remains local/self-reported and lacks independent authentication. Owner must still inspect the actual preview while signed in.
