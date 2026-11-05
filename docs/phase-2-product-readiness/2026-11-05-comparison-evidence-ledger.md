# Candidate comparison evidence ledger

This ledger is **not** an editorial approval ledger. All 36 records cover the six dimensions for each of the three comparison pairs, for both vendors. Every record is `candidate`, `approved:false`, `checkedAt:null` and `expiresAt:null`.

`sourceId` is deliberately **null for every candidate record**. Existing vendor documentation research candidates are tracked separately in `src/data/research-claims.json`; none has been reviewed as proof of any particular comparison dimension. A future reviewer must inspect the exact assertion, its plan/region/date scope, and a relevant source before any verification claim can be made.

`src/lib/comparison-evidence.mjs` enforces the current candidate-only schema, exact pair/product references, null unreviewed source references, duplicate rejection and complete ledger coverage. It intentionally offers no method to approve a claim. The comparison page validates the ledger during static build; the presentation layer still suppresses all raw vendor assertions and displays neutral questions.

To support verified assertions later, create a separate owner-authorized approval design with source-scope matching, dated reviewer attestation, expiration, audit trail and revocation. Never flip `approved` manually or treat the current candidate source reference as proof.

Owner gates remain: ₹0 spending, private Netlify preview, production auto-publishing locked, no public launch, no affiliate activation, no merge to `main` without separate approval.

## Offline review queue

Run `npm run research:comparisons -- --json` to generate the deterministic, read-only list of 36 vendor-dimension research questions. The command performs no network calls and does not modify files, approve evidence, rank vendors, publish pages or activate affiliates.

The queue intentionally provides no source URL or evidence approval. Reviewers must first collect source-specific evidence independently; this command cannot turn candidate assertions into verified claims.
