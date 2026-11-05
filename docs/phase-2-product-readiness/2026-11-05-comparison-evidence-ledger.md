# Candidate comparison evidence ledger

This ledger is **not** an editorial approval ledger. All 36 records cover the six dimensions for each of the three comparison pairs, for both vendors. Every record is `candidate`, `approved:false`, `checkedAt:null` and `expiresAt:null`.

`sourceId` is deliberately **null for every candidate record**. Existing vendor documentation research candidates are tracked separately in `src/data/research-claims.json`; none has been reviewed as proof of any particular comparison dimension. A future reviewer must inspect the exact assertion, its plan/region/date scope, and a relevant source before any verification claim can be made.

`src/lib/comparison-evidence.mjs` enforces the current candidate-only schema, exact pair/product references, null unreviewed source references, duplicate rejection and complete ledger coverage. It intentionally offers no method to approve a claim. The comparison page validates the ledger during static build; the presentation layer still suppresses all raw vendor assertions and displays neutral questions.

To support verified assertions later, create a separate owner-authorized approval design with source-scope matching, dated reviewer attestation, expiration, audit trail and revocation. Never flip `approved` manually or treat the current candidate source reference as proof.

Owner gates remain: ₹0 spending, private Netlify preview, production auto-publishing locked, no public launch, no affiliate activation, no merge to `main` without separate approval.

## Offline review queue

Run `npm run research:comparisons -- --json` to generate the deterministic, read-only list of 36 vendor-dimension research questions. The command performs no network calls and does not modify files, approve evidence, rank vendors, publish pages or activate affiliates.

The queue intentionally provides no source URL or evidence approval. Reviewers must first collect source-specific evidence independently; this command cannot turn candidate assertions into verified claims.

## Production readiness inventory

Run `npm run release:readiness` to generate a read-only JSON **NO-GO** report. It checks restrictive operating policy, unverified catalog, inactive affiliate links and complete unapproved comparison evidence. It lists owner/editorial/hosted-UAT/legal/security release blockers.

The command is intentionally incapable of changing any release gate. A green CI build does not establish a production approval, hosted privacy, legal sign-off, or reviewed vendor evidence.

## Candidate research-source lifecycle (offline)

`npm run research:source-risk -- --json` reports all six vendor-document research candidates as **unverified**. The report records intake age using UTC dates. Items older than 90 days are tagged `stale`, but recently recorded candidates are merely `unreviewed`—not independently checked or approved.

`src/data/research-source-revocations.json` starts empty. An explicit revocation record may include only `sourceId`, `revokedOn` (on/after the original collection date, not in the future), and a plain-text `reason`. Duplicate, unknown, malformed and future-dated entries fail data validation. A revoked candidate stays unapproved and cannot be published. Records are a manually maintained internal warning, **not** evidence that an actual vendor page was withdrawn.

`npm run release:readiness` now includes counts of unreviewed, stale, and revoked candidate documents as additional blockers. Neither report fetches vendor websites, validates commercial terms, enables approval, contacts third parties or alters production. No source is linked to an approved comparison claim.
