# Milestone 2 — Offline manual excerpt-to-snapshot consistency check

Date: 2026-11-05. Scope: private Draft PR #8 only.

## Problem / safety
Candidate manual capture digests bind local text bytes but do not show whether that excerpt appears in any saved source text. Add a **strictly local, read-only consistency check** between one validated manual capture and a human-supplied plain-text snapshot. A local text match is **not** proof of remote vendor page authenticity, independent verification, plan accuracy, or approval.

## Test-first implementation
1. Tests first: accept an already-recorded or explicitly drafted candidate capture only if it matches a currently validated source-specific proposal and the exact private comparison assertion; validate claim/vendor/source URL scope and all original capture fields. Reject altered same-ID records, unknown proposal, future/mismatched snapshot date, wrong source URL, oversized/invalid text, unapproved metadata injection, and malformed inputs. Require a byte-exact UTF-8 substring; near-matches, HTML-escaped fragments and whitespace folding do not count.
2. Pure `src/lib/offline-snapshot-consistency.mjs`: input `{capture,snapshot:{sourceUrl,snapshotOn,text},...validatedProjectData}`; SHA-256 hash the local snapshot, return only bounded safe metadata (capture ID, source risk, hash, matched bool and explicit NO-APPROVAL flags). Never return or log source text or raw assertion. Distinguish `LOCAL-TEXT-MATCH-UNVERIFIED`, `LOCAL-TEXT-MISMATCH` and `LOCAL-TEXT-MATCH-REFRESH-REQUIRED`.
3. Read-only stdin CLI `npm run research:snapshot-check < private-check.json`; private-check JSON embeds `capture` and `snapshot` and contains sensitive research. Limit stdin bytes to 256 KiB, no repo writes, no network calls, no new dependencies. Treat mismatches as nonzero exit and avoid echoing the source text in error logs.
4. Add static build-leak guards for accidental `source-snapshot-check.json`, `source-snapshot.json`, `snapshotText`, or `localSnapshotSha256` fields in generated browser assets.
5. Document exact manual process, boundary (local copy may be forged), and next independent reviewer/owner gate. Verify GitHub CI on exact final commit; no merge or public launch.

## Explicit owner restrictions
₹0 spending, no paid services, affiliate activation, outreach, account/credentials, irreversible edits, production deployment or release. PR #8 stays Draft; `main` unchanged. No claim gains `approved:true`, `verified:true`, or source IDs in the public evidence ledger.
