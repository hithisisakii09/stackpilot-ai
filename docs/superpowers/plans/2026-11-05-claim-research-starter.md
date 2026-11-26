# Milestone 2 — Private per-claim research starter

Date: 2026-11-05. Branch: `feature/phase-2-product-readiness`, Draft PR #8 only.

## User need / boundary

The existing offline research CLI validates source-proposal and excerpt-capture JSON, but researchers still have to manually match a specific claim/vendor combination to the six stored vendor-document leads. A page URL is not evidence of relevance to the claim. No live browsing is available this session and no source must be silently attached to a claim.

## Test-first increment

1. RED tests for a pure `buildClaimResearchStarter` function, requiring an **exact valid claim ID + vendor product ID**, verified against the existing 36-row internal worklist and its unapproved registers.
2. Return one private claim's unverified original candidate assertion, exact review question, current stage and next action, plus **vendor-matched research-lead options** (URLs from existing `research-claims.json`, including stale/revoked risk). Leads must be visibly `verified:false`, `proposedForClaim:false` until separately recorded, and never automatically become a source proposal.
3. Return blank, **deliberately invalid-until-filled** proposal input template (`researchLeadId`, `proposedOn`, `relevanceNote` all null), and blank capture input templates only for already-recorded source proposals. No dates, snippets, review notes, source associations, capture IDs or approval flags may be invented.
4. Add a **read-only local CLI** `npm run research:claim-starter -- --claim <id> --vendor <id> [--json]`. Its default summary must hide the raw candidate assertion; `--json` is intentionally private and contains unsourced research. Unsupported flags fail closed; no writes/network.
5. Deny accidental public build artifacts named `claim-research-starter.json` in the existing static leakage audit, add behavior tests, document private usage and next manual validation commands.
6. Verify exact final SHA GitHub build, safety and Chromium, private deploy-preview status. No production/merge/publishing/spending/affiliate activation; all 36 claims remain unapproved.

## Trust model and limitations

A vendor-matched URL is merely a candidate for manual inspection. The project cannot assert URL accessibility or claim support based on repository metadata, and the internal assertion is not public marketing copy. No human identity, signed approval or external audit is introduced. Researcher must manually inspect genuine vendor sources and supply their own notes/dates/excerpts before any intake draft is valid. Existing reviewer/owner release gates remain permanently locked.
