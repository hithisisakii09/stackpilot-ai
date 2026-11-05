# Milestone 2: claim-specific, offline evidence-excerpt capture

Date: 2026-11-05. Branch: `feature/phase-2-product-readiness` (private Draft PR #8 only).

## Trust boundary and user need

There are 36 candidate comparison cells, six unverified vendor-document leads, and zero claim-specific source proposals. A link to vendor documentation is not evidence for an exact claim. Before authenticated editorial review can exist, researchers need a **manual, local** way to record the relevant excerpt, exact origin, collection date, and claimed plan/region scope—without silently approving assertions, contacting vendors, or exposing research in built pages.

## Increment

1. **RED tests first:** A candidate capture must reference a validated, matching claim/vendor/research-lead proposal; the source URL must exactly match the existing official vendor lead; dates must be real, nonfuture, and no earlier than the proposal/source record; plan and region must match the proposal; a bounded single-line plain-text excerpt must match its SHA-256; duplicate capture IDs and same-claim/source/day records fail. Unknown fields, reviewer identity, verified/approved states, bad hashes, fabricated URLs and HTML/control content fail closed.
2. Create `src/data/comparison-evidence-captures.json` as `[]`, containing **no fabricated vendor text or proof**. Add `src/lib/comparison-evidence-captures.mjs` with pure digest, validation and deterministic candidate-only reporting. A valid excerpt proves only local text consistency, never that a vendor page currently contains it or that it supports the associated claim.
3. Integrate explicit capture inventory into private `research:review-packets`, new read-only `research:evidence-captures` report, `check:data`, and the `release:readiness` NO-GO inventory. No approval transition or web-fetching function.
4. Extend `release:preflight` privacy scanner to reject captured evidence files and excerpt metadata in browser-delivered assets.
5. Verify exact final SHA with Node tests, Astro build, preflight, safety/operations and Chromium. Keep PR draft and production NO-GO.

## Risks and non-goals

- Manual excerpts may be falsely entered, misquoted or stale: validate consistency, label **UNVERIFIED**, no automatic editorial sign-off.
- Do not fetch vendor websites or invent a capture. The empty register accurately reports **0** captured excerpts; synthetic fixtures exist only in tests.
- Git history does not authenticate reviewers or provide tamper-proof audit. No credentials or private key stored in repo.
- All ₹0 budget, no merge, private-preview, no publication, no affiliate, no outreach, no contract and release locks stay intact.
