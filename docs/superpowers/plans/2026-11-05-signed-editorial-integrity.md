# Milestone 2 increment — signed editorial receipt integrity (not approval)
Date: 2026-11-05. Scope: existing private Draft PR #8 only.

## Need / boundary
A future owner-controlled editorial workflow must prove that a review record was not altered and binds the correct claim, vendor, source snapshot and plan/region scope. The current static Astro site has **no authenticated editor service or owner-pinned signing key**. It is unsafe to treat a Git edit or arbitrary signature as human editorial approval.

## Proposed increment
1. Add tests first for Ed25519 signature verification with **ephemeral test-only keys**, exact claim text digest and source snapshot digest, scoped plan/region, dates, key IDs, signer revocation, expiry and tampering. Signing canonicalization must be deterministic and domain-separated.
2. Add a pure, offline `src/lib/editorial-receipt-integrity.mjs`. Valid signatures establish integrity **only**; output must always say `editorialApproved:false`, `reviewerAuthenticated:false`, `canPublish:false`. Any malformed/expired/mismatched records fail closed. No private keys, network calls, identity collection, secrets or crypto packages.
3. Add zero-trust `src/data/editorial-review-trust-anchors.json` and `src/data/editorial-review-receipts.json`, both `[]`. Enforce that both stay empty in `npm run check:data` and in production-readiness reports until *separately approved* owner-controlled provisioning. No repository-based toggle can activate approvals.
4. Document future gates: owner-pinned keys or independently authenticated authorization, secured reviewers, least privilege, source-snapshot capture, trusted audit trail, key rotation/revocation and expiry, third-party source verification, clear publisher controls, exact-SHA hosted QA.
5. Verify GitHub Actions build, operations and Chromium at exact final commit; release NO-GO irrespective of signature validity.

## Threat model
- Forged signing key introduced in a PR: rejected by zero-trust configuration lock.
- Signature replay to different claim, vendor, source or plan: rejected by exact signed payload and expected-context validation.
- Key compromise/revocation, future or expired receipt, malformed signature, unknown authority: reject.
- Vendor misinformation: crypto cannot prove that content is factually true.
- Source/claim approval laundering: no approval transition exists and display still neutral.
- No owner authorization to merge, publish, spend, activate affiliates, collect credentials, or move to production.

Use test-first incremental commits; no new dependency or backend setup.
