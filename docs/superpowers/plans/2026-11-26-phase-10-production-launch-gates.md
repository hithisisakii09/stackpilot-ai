# Phase 10 — Production Launch Gates, Owner Key-Ceremony Verifier & 6-Vendor Readiness

**Branch:** `feature/phase-10-production-launch-gates-2026-11-26`  
**Parent Commit:** `f093c93eff97d52ed65e418fdeae11e5397fead5` (Phase 9)  
**Status:** Fail-Closed Pre-Launch Gate (`decision: 'blocked'` without real offline owner ceremony & 6-vendor approvals)

## 1. Production Go/No-Go Gate Contract (Phases 1–9)

Every production launch requires ALL of the following gates to pass simultaneously:
1. **Zero-Budget & Pre-Launch Invariants:** `monthlyBudgetInr === 0`, `delegatedSpendInr === 0`, `migrationCrlf === 0`, `recoveryDrillStatus === 'pass'`, `preflightViolations === 0`, `highOrCriticalVulnerabilities === 0`. Missing (`null`) signals fail closed.
2. **6-Vendor Claim Approval Readiness:** All 6 canonical vendors (`hubspot`, `pipedrive`, `semrush`, `ahrefs`, `kinsta`, `cloudways`) must have an `'approved'` vendor claim bound to an independent `owner` approval (`actorRole === 'owner'`, `actorId !== requesterId`, non-future timestamp). `agent` and `reviewer` approvals are rejected.
3. **Offline Owner Key-Ceremony Attestation:** Ed25519 SPKI PEM public key + matching SHA-256 fingerprint + `ceremonyMode: 'offline_owner'` + valid Ed25519 signature over the canonical launch-readiness payload. Any private key material (`PRIVATE KEY`, JWK `d`) is hard-rejected.

## 2. Offline Owner Key-Ceremony Procedure (Outside Git)

1. Generate an offline Ed25519 keypair on an air-gapped or owner-controlled device (never commit private keys to Git).
2. Export the SPKI public key PEM and compute its canonical SHA-256 fingerprint.
3. After independent human editorial review of all 6 vendors and legal/privacy sign-off, sign the canonical launch-readiness payload (`{ schema: 'stackpilot-launch-attestation-v1', organizationId, approvedVendors, monthlyBudgetInr: 0, delegatedSpendInr: 0, attestedAt }`).
4. Run `node scripts/platform-launch-gate.mjs --json --input <attestation.json>` and confirm `decision: 'ready'` and exit code `0`.

## 3. Ordered Post-CI Merge & Launch Sequence

1. Confirm all stacked Draft PRs (Phases 1–10) are CI-green on Ubuntu PostgreSQL 18.7 (all 19 PG suites) and Chromium browser acceptance.
2. Merge PR #8 + `main` hygiene + stacked platform PRs in order with explicit owner authorization.
3. Execute the offline owner key-ceremony and 6-vendor editorial approval sign-off.
4. Run `node scripts/platform-launch-gate.mjs --json` to verify `decision: 'ready'` before any separate owner authorization to unlock Netlify production or remove `noindex`.
