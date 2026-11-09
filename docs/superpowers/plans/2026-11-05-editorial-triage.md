# Milestone 2 increment: fail-closed editorial triage register
Date: 2026-11-05. Branch: feature/phase-2-product-readiness (Draft PR #8 only).

## Design / threat model
A reviewer needs a traceable place to flag a specific vendor comparison cell as rejected or needing more evidence. Git repository data is not authenticated editorial sign-off. Claim IDs and product IDs form unique canonical identifiers; no claim approvals, verified source mappings, vendor assertions, affiliate metadata, or release gates may be inferred from a record.

Use a simple offline JSON register rather than a database. No new packages or paid infrastructure. The register contains zero records initially, so none of the 36 source-free claims is falsely reviewed.

## Steps
1. Test-first: validator rejects fabricated approvals, forged reviewer attestations, duplicate or unknown IDs, malformed/future dates, HTML/control characters, invalid status and mismatched source IDs. Reject incomplete comparison ledger. The queue must stay deterministic, mark all entries nonpublishable and honor a negative-only disposition for one claim.
2. Add `src/data/editorial-triage.json` initially `[]` and `src/lib/editorial-triage.mjs` with strict schema. Each optional record is limited to `claimId`, `productId`, `decision` (needs-evidence/rejected), `reason`, `recordedOn`. No reviewer identity, audit attestation, approved or source URL field. Git diff history is useful for tracking, but not a tamper-proof audit system.
3. Integrate into `scripts/validate.mjs`, `scripts/comparison-evidence-report.mjs`, and `src/lib/production-readiness.mjs` as an extra BLOCKED inventory. Tests ensure NO-GO is invariant.
4. Run exact-SHA CI, Node build/a11y/Chromium, private preview status. Preserve all release locks.

## Remaining owner-controlled gate
A real approval or rejection lifecycle with verified reviewer identity, source-specific claim matching, attestations, immutable audit log, expiration and revocation requires separately reviewed authenticated workflow. This increment intentionally does not implement approval or claimed authentication.
