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

## Negative-only editorial triage register (PR #8, Milestone 2)

`src/data/editorial-triage.json` starts as an empty array. It may contain at most one internal disposition for each exact `claimId` + `productId` in the complete 36-record evidence ledger. Allowed keys are exactly `claimId`, `productId`, `decision`, `reason` and `recordedOn`. Allowed decisions are `needs-evidence` and `rejected` **only**. No approval, reviewer identity, source association, signature or URL field is accepted. Dates are validated as real UTC dates not in the future; reasons are bounded single-line plain text. Unknown/duplicate claims or missing evidence fail closed during `npm run check:data` and `npm test`.

The offline `npm run research:comparisons -- --json` queue now displays optional negative dispositions, keeping `approved:false`, `approvalAuthenticated:false` and `publicationAllowed:false` for all 36 items. `npm run release:readiness` shows triage counts but always NO-GO and keeps all owner gates blocked. Raw candidate vendor assertions and triage reasons must never be rendered into public comparison pages.

**Security limitation:** a Git contributor's ability to edit a JSON record is not an authenticated editorial approval or a tamper-proof audit log. Git diffs may document changes but do not prove human sign-off. Authentic approval/rejection audit trails require owner-reviewed authentication, protected approval authority, scoped source evidence, review attestation and expiring/revocable claims. This implementation intentionally does not create any approval transition.

## Private, claim-specific editorial research packets

Run `npm run research:review-packets -- --json` **only within a trusted local development or private CI environment**. This read-only CLI outputs 36 candidate comparison assertions that were deliberately hidden from public pages, alongside their precise claim/vendor identifiers and triage questions. Treat the output as an internal research queue, **not as verified marketing content**.

The new `src/data/comparison-source-proposals.json` is empty initially. A research-only proposal may reference an existing vendor documentation candidate via a product-matched `researchLeadId`, explaining possible relevance to an exact comparison claim, with optional plan/region scope. Dates and fields are strictly validated; no `approved`, reviewer, signature, or source verification metadata can be set. Duplicate associations and cross-product sources fail closed. All proposed sources are explicitly `sourceReviewedForThisClaim:false`, `scopeVerified:false`, `eligibleAsEvidence:false`, including if a vendor document is recently recorded. Stale and revoked research-lead risks remain visible; rejected triage never becomes approval.

**Security boundary:** Research packets contain *unsourced original candidate comparison assertions*. Do not include these in Astro pages, the public build, public artifacts, external messages, or a production-ready content feed. The empty proposal file and CLI do not automatically contact any vendor or create valid proof. `npm run check:data` validates this intake and `npm run release:readiness` reports proposal coverage as an additional NO-GO blocker.

Before actual editorial sign-off is possible, the owner must separately approve a trusted authentication and authorization design (role-bound reviewers, independent source and plan/region verification, immutable review event logging, claim-specific approvals, expiration, revocation, publisher release control). A Git commit or research proposal is **not** an authenticated approval.

## Cryptographic receipt-integrity foundation (still no editorial approval)

The pure, offline module `src/lib/editorial-receipt-integrity.mjs` can check whether a source-inspection receipt is signed by a **caller-supplied** Ed25519 public key. It binds the signature to a specific comparison claim, product, exact candidate assertion SHA-256, source URL, source snapshot SHA-256, plan, region, review date, expiration date and key ID. Domain-separated deterministic serialization prevents accidental cross-protocol signature reuse. Invalid signatures, expired records, future review dates, unknown or revoked keys, wrong expected context, and unrecognized fields fail closed.

**CRITICAL:** Even when a test-only signature verifies, the output says `reviewerAuthenticated:false`, `editorialApproved:false` and `canPublish:false`. This is *signature integrity only*; it proves neither who owns the private key nor whether the vendor claim is true. The repository contains **no signing private key** and has no signing, authentication, or content-publishing action.

Both `src/data/editorial-review-trust-anchors.json` and `src/data/editorial-review-receipts.json` are intentionally empty arrays. `npm run check:data` and `npm run release:readiness` **fail** if either becomes populated or malformed. Do not edit either file or provision keys through a Git change as a workaround. The trust-anchor lock must remain until the owner separately approves and independently verifies a secure provisioning plan; this task does not authorize such approval.

Before an actual approval capability is designed or enabled, require: verified owner-controlled reviewer identity and role authority; key enrollment/rotation/revocation outside untrusted PR content; source-document capture and scoped human inspection; independently recorded review decisions and expiration; immutable/auditable event storage; reviewer conflict-of-interest checks; replay/revocation handling; legally accurate disclosures; and a separate owner-controlled publishing gate. A signature or green CI is not production authorization. The signed-receipt primitive does **not** implement these later requirements.

## Public-build private research leakage guard

`npm run release:preflight` now checks **every emitted text asset** in `dist/` (HTML, JavaScript, CSS, JSON, sourcemaps, text, XML, SVG, Markdown, and CSV) against the original unverified per-vendor comparison candidate values. It rejects accidentally shipped internal research JSON filenames and serialized editorial-only keys such as `candidateAssertion`, `triageReason`, `relevanceNote`, `sourceSnapshotSha256`, or `publicKeySpkiBase64`. Common HTML entities and JS string escapes are normalized before matching. The report names the affected file and stable claim reference **without printing any raw unverified assertion**.

This guard runs after Astro build in the existing `npm test` pipeline and through the operations preflight; any violation causes a nonzero exit. The neutral, buyer-facing comparison pages must continue to render only the unverified verification-question text. Internal packets from `npm run research:review-packets` must never be copied into `dist/`, client code, public artifacts, or live pages.

**Limit:** string-based scanning is defense in depth, not a formal guarantee against intentionally obfuscated or compressed leaks. The site must remain private, and reviewer records/signing keys must remain outside browser-delivered artifacts. No access policy, identity, editorial approval, or production release is inferred from a green scan.
