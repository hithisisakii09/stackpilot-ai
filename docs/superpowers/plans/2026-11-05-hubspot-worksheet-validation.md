# Milestone 2 — Strict offline HubSpot worksheet assessment

Date: 2026-11-05. Existing private Draft PR #8 only. No live vendor inspection.

## Why
The four-row unverified HubSpot export worksheet can now be filled by a genuine human researcher, but there is no safe read-only validation after editing it. An unsupported or malformed spreadsheet could be mistaken for verified evidence, cross-vendor sources could be accepted, or source excerpts could accidentally leak into automated logs.

## Test-first increment
1. RED tests for an offline parser/validator that accepts only **the existing canonical four-row, 12-column CSV**. Require exact headers, question text and predicate order; allow RFC-style double-quoted cells/escaped quotes, CRLF only, no embedded newlines, max 32 KiB, no duplicate or altered predicates. Defend against spreadsheet formula triggers and malformed control characters.
2. Validate user-entered fields independently: HTTPS candidate URL on hubspot.com or a subdomain (syntax only, **not** provenance); real inspection date not in the future; bounded plain-text plan, region, permission, limitations; excerpt checked by existing private excerpt hash validator. Reject inserting the original unverified candidate claim as purported vendor quotation. Never print raw URL, excerpts or notes in validation output/errors.
3. Only allow `NEEDS-EVIDENCE`, `OBSERVED-UNVERIFIED`, `CONTRADICTION-REPORTED-UNVERIFIED`, or blank manual disposition. Incomplete observations remain gaps. Even complete self-reported observations remain **UNVERIFIED**, cannot attribute a source to a predicate, and cannot promote the combined comparison to publication.
4. Read-only stdin-only `npm run research:hubspot-worksheet-check < /absolute/private/worksheet.csv` that produces a redacted JSON summary with exact predicate IDs, missing-field codes, local-research stage, lead match flag and **all approval/verification/publish flags false**. No side effects or remote calls.
5. Update private Git material ignore and static-build protection for a conventional report filename, plus docs for human handoff. Keep original source-specific proposal/capture validators as the only candidate entry path; **no spreadsheet import into evidence registers**.
6. Validate exact final head in CI: Node tests/build/static privacy audit, operations, Chromium and Netlify preview. Keep PR Draft, main unchanged, ₹0 spend, no affiliate activation, no release.

## Trust boundary
User-supplied CSV can be invented or wrong. A syntactically valid vendor-hosted URL is **not** proof of the site's current content. Reported observations, even with short excerpts and matching source leads, are not remotely authenticated. No reviewer signing keys, approval roles, or production decisions exist. Continue to require genuine manual inspection and separate independent reviewer and owner approvals.
