# Milestone 2 — Offline source-specific comparison review packets

Date: 2026-11-05. Scope: existing private Draft PR #8 only. No merge, public publishing, spending, partner activation or reviewer approval.

## Problem
The internal 36-item comparison queue asks reviewers to verify dimensions but omits the exact raw candidate assertions and a safe, source-specific way to propose *research leads*. Existing six vendor documents cannot be presumed to substantiate any particular comparison. A Git edit must never act as authenticated editorial approval.

## Design
- Add `src/data/comparison-source-proposals.json` initialized empty. Each record is a **candidate research lead proposal**, not verified evidence.
- Strict, fail-closed `validateComparisonSourceProposals`: canonical claim/product key, candidate researchLeadId matching the vendor, recorded dates, no extra fields, bounded plain relevance note, optional plan and region scope, no approvals/reviewers/signatures. Multiple leads per claim allowed; identical claim/product/source triples rejected.
- `buildComparisonReviewPackets`: deterministic **offline-only** output of 36 private packets. Include the exact raw candidate text for reviewers to inspect; all packets clearly marked unverified and nonpublishable; source leads remain explicitly unmatched, with stale/revoked risk; triage status remains negative-only.
- CLI `npm run research:review-packets -- --json`, never a web page. CI data gate and read-only NO-GO report include proposal coverage, never assert verification.
- Behavior tests first, then implementation, full GitHub CI/Chromium. Record exact-SHA status and remote-UAT limitations.

## Threats and limitations
Raw vendor matrix candidate assertions are unsuitable for public display and are only exposed to a local internal script. A research URL or plain-text relevance note does not prove correspondence to a claim. A repository contributor cannot authenticate editorial identity via JSON; approval remains absent. Existing public comparison rendering continues to replace unsourced assertions with neutral questions.

## Owner gates
Zero spend, private preview, no main changes, no automated source crawling or external contact, no secrets/identity/contract handling, no claims approved, no production release.
