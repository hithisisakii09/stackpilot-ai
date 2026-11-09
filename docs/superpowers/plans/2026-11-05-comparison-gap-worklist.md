# Milestone 2 — Private research gap worklist and CSV handoff
Date: 2026-11-05. Scope: existing Draft PR #8, zero spend, no release.

## Problem and approach
All 36 vendor-dimension claims are unverified; no source-specific research proposals or manually captured excerpts are currently recorded. Live vendor-document inspection is not available in this development run, and no URLs or evidence must be invented. Researchers need a deterministic private worklist that identifies the **next manual action** per claim and makes a usable worksheet without promoting research leads into facts.

## Test-first steps
1. Write behavior tests for exactly 36 claim/vendor entries, stable order, neutral NO-GO status, zero approvals, no fabricated source associations, clear manual tasks, rejection handling, and progression to source capture/independent review only with synthetically valid test fixtures.
2. Add a pure `src/lib/comparison-gap-worklist.mjs` driven by the already-validated `buildPrivateReviewPacketBundle`. Unknown/mismatched or incomplete source data must fail closed through existing validators. All actions remain research-only; captured excerpts are still unverified.
3. Add private CSV serialization with formula-injection safeguards for EVERY cell, including leading Unicode whitespace/zero-width characters, and a read-only CLI `npm run research:gap-worklist -- --csv|--json`. Only `--csv` or `--json` emits raw candidate content; default summary contains IDs/status/tasks without raw candidate assertions.
4. Document how owner/researcher can fill the worksheet manually and enter evidence into existing proposal/capture registers, **without** claiming web retrieval, reviewer identity or approval. Do not add new public routes, packages, host calls, or content.
5. Verify exact-commit Node/build/preflight, operations, Chromium and private preview provider status. Report any failed/pending checks. Keep PR in Draft and production NO-GO.

## Security and release gates
The worklist is private and may contain unreviewed candidate assertions. It must never be committed as a populated public artifact, included in `dist`, submitted to vendors, or mistaken for approved claims. CSV is an operational research worksheet only, not a source/approval ledger. No payments, new accounts, external outreach, merge, production publication, affiliates, or commercial actions.
