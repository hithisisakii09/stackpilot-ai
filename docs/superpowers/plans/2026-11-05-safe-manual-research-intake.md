# Milestone 2 — Safe manual vendor-research intake CLI

Date: 2026-11-05. Scope: existing private Draft PR #8 only.

## Problem and objectives

All 36 comparison claims remain unverified. Researcher workflow currently requires hand-editing complex candidate proposal and excerpt capture JSON, computing SHA-256 digests by hand, and manually copying official source URLs. Errors could silently mismatch the claim or capture, and invented defaults could be confused with independent vendor proof.

Introduce a **read-only local intake formatter** that consumes a **human-supplied JSON object on stdin** and emits a validated, unapproved candidate JSON record on stdout. It must never fetch vendor sites, modify repository files, invent relevance or excerpts, authenticate reviewers, or approve evidence. Source URL is *only* copied from an existing exact-vendor candidate research lead; this is not live verification.

## Test-first implementation
1. Behavior tests for offline proposal intake: exact recognized `claimId`/`productId`/`researchLeadId`, human-supplied meaningful relevance note, real nonfuture UTC proposed date, optional plan/region scope. Reject extra fields, spoofed vendor, unknown IDs, future date, disallowed HTML/control or empty note. Return only the schema used by existing `validateComparisonSourceProposals`, `status:'candidate'`, `approved:false`, plus unchanged source lead URL in a **separate informational wrapper**.
2. Behavior tests for excerpt intake: human-supplied short single-line excerpt and capture ID/date, **must already have** a matching recorded source proposal, automatically derive exact private candidate-claim SHA-256 and excerpt digest, use the existing source URL and proposal scope, and revalidate via `validateComparisonEvidenceCaptures`. Reject unknown/prohibited fields, duplicate capture IDs/day, unrecorded proposal and source mismatch. Never allow capture to imply a vendor page was fetched.
3. Build `src/lib/manual-research-intake.mjs` as a pure helper; add `scripts/manual-research-intake.mjs` CLI accepting only `--proposal` or `--capture` with strict JSON stdin. Default/invalid flags show safe usage and fail closed. No writes or network calls. As data may be private, emit no candidate assertion or source excerpt in errors.
4. Add `npm run research:intake -- --proposal` / `--capture`, docs with copy/paste workflow and security limitations. Keep public Astro routes unchanged.
5. Run exact-SHA CI build, browser, operations and private preview provider status; do not merge, spend, publish, activate affiliates or change trust gates.

## Limitations

A source lead can be first-party by URL and still irrelevant or wrong; a manual excerpt can be invented. Structural validation and SHA-256 are not factual proof, reviewer authentication or editorial approval. Output is a **draft** that must be reviewed and explicitly added to the private candidate registers by a human. Never put CLI outputs in `dist` or other public artifacts. Owner-controlled identity and trusted audit remain a separate future task.
