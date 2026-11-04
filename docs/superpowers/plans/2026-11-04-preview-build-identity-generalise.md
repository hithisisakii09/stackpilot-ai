# Plan: Generalise preview-build identity to any deploy-preview PR

**Date:** 2026-11-04  
**Branch:** `docs/post-merge-operational-state` (PR #7)  
**Author:** Autonomous engineering session

---

## Problem

`src/lib/preview-build-identity.mjs` checks `meta.REVIEW_ID === '1'` exactly.  
Netlify populates `REVIEW_ID` with the actual PR number at build time.  
When built for PR #7, `REVIEW_ID` is `'7'`, so the page always shows `UNVERIFIED_CONTEXT`.  
This is a cosmetic diagnostic limitation — the deployment is correct but the page cannot display the commit SHA for any PR other than #1.

## Trusted environment metadata (Netlify)

All five fields already in use are documented Netlify build environment variables:

| Variable | Type | Description |
|---|---|---|
| `NETLIFY` | `'true'` | Set only inside a Netlify build |
| `CONTEXT` | `'deploy-preview'` | Discriminates from production / branch-deploy |
| `PULL_REQUEST` | `'true'` | Confirms PR-sourced deploy-preview |
| `REVIEW_ID` | numeric string | The actual GitHub PR number (e.g. `'7'`) |
| `COMMIT_REF` | 40-hex SHA | The exact commit being built |

No secrets are needed. No client-provided query parameters. No network calls.

## Chosen fix: validate REVIEW_ID as a positive integer string

Replace the literal `=== '1'` check with a regex that accepts any positive integer
(`/^[1-9][0-9]*$/`). Return the parsed integer as `prNumber`.

This:
- Keeps the strict field-set validation (no extra keys allowed)
- Keeps `UNVERIFIED_CONTEXT` for missing/invalid/zero/negative values
- Requires no new environment variables or secrets
- Works identically for PR #1, PR #7, or any future PR
- Does not expose any private data to browser code (PR number is public)

## Files changed

| File | Change |
|---|---|
| `src/lib/preview-build-identity.mjs` | Replace `=== '1'` with positive-integer regex; return parsed `prNumber` |
| `src/pages/preview-build/index.astro` | Remove hardcoded "PR #1" references; show dynamic `prNumber` |
| `tests/preview-build-identity.test.mjs` | Update fixture and tests to cover any PR number, edge cases |
| `src/lib/preview-uat-packet.mjs` | Remove "PR #1" from scenario description string |

## Tests (TDD — RED first)

Write updated tests that:
1. Accept `REVIEW_ID: '7'` → `status: PREVIEW_COMMIT_REPORTED`, `prNumber: 7`
2. Accept `REVIEW_ID: '1'` → still valid (not regressed)
3. Accept any positive integer string
4. Reject `REVIEW_ID: '0'`, `'-1'`, `'1.5'`, `'01'` (leading zero), `''`, `undefined`, non-numeric
5. Confirm `prNumber` in output is a parsed integer, not a string
6. Confirm no extra env keys accepted
7. Confirm secrets not reflected in output
8. Confirm page source uses dynamic `prNumber`, not hardcoded text

## Risks

- None identified: change is purely additive (broadens allowed REVIEW_ID range)
- No security implication: PR number is public information
- Existing tests for `REVIEW_ID: '1'` remain valid (must still pass)

## Release gates

- All 466+ tests pass with `--test-concurrency=1`
- `node scripts/validate.mjs`, `release-preflight.mjs`, `check-build.mjs` exit 0
- `npm audit --omit=dev --audit-level=high` → 0 vulnerabilities
- Push to branch, verify GitHub head SHA, all 3 CI workflows pass

