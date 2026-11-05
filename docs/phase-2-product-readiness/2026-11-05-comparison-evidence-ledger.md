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

## Negative-only local review-history integrity

`src/data/editorial-review-history.json` starts as an **empty array**. The offline validator in `src/lib/editorial-review-history.mjs` accepts strictly ordered, negative-only events (`needs-evidence` and `rejected`) tied to a valid claim/product combination. Each event records a bounded plain-text reason, date, unique ID, sequence, previous SHA-256 digest, and its own domain-separated SHA-256 digest. Invalid fields, unknown claims, duplicate IDs, future or out-of-order dates, broken digest links, and any approval action fail closed.

Run `npm run research:review-history -- --json` for a **local structural consistency** report. `npm run check:data` validates the event file, and `npm run release:readiness` keeps an `independent-review-audit` blocker permanently active. This is not a reviewer session, signature authority, proof of independent human inspection, or a publishing capability.

**Critical limitation:** hashes alone do not create an immutable, authenticated audit log. A repository editor can rewrite every event and recompute all hashes. The output therefore explicitly reports `externallyAnchored:false`, `reviewerAuthenticated:false`, `authenticatedApprovals:0`, and `canPublish:false` even when `localChainConsistent:true`. Never call the event file a trusted approval history. Future independently managed storage, signed checkpoints and authorization are required before any approval functionality is considered.

## Reviewer authorization and static service surface (default-deny)

`src/lib/editorial-authorization.mjs` defines the eight future editorial actions and **always returns `DENY`** with `reviewerAuthenticated:false`, `verifiedReviewerRole:false`, `trustedSigningAuthority:false`, `independentAuditAvailable:false`, `sourceVerified:false` and `canPublish:false`. It rejects unrecognized actions, permissive operating policies, and caller-supplied principal/role/JWT/approval fields instead of trusting client statements. This is a future integration **contract**, not a login, review API or authorization server.

`npm run editorial:authorization` provides a read-only JSON inventory of all denied operations and the repository's static runtime surface. `npm run check:data` enforces the same controls: Astro must remain an explicitly static build, Netlify config must remain the approved static build/publish setup, and no `src/pages/api`, `src/pages/admin`, `src/pages/editorial`, `src/pages/review`, `src/middleware`, Astro actions, or serverless/edge function routes may be introduced without a separately reviewed architecture and authorization. A violation causes a CI failure. These checks examine the *local source tree* and **do not establish Netlify account-level restrictions or authenticated remote access**.

The release NO-GO report now explicitly names `reviewer-authorization-service` as blocked. A real editorial system requires separate owner approval for an independently authenticated service, securely provisioned identities and authorization roles, claim-specific evidence attestation, independently anchored audit records and trustworthy key management. Do not circumvent the default-deny boundary by setting a Git JSON flag or adding a client-side role.

## Strict public comparison view model (Milestone 2)

The raw `COMPARISON_PAIRS` matrix and original, unreviewed SEO comparison descriptions remain **private editorial research candidates**. `getComparisonPair(slug,products)` now returns a detached, explicit allowlist of neutral metadata (`slug`, `category`, `title`, `firstId`, `secondId`, `metaDescription`, `relatedTools`, `relatedGuides`) and a separate evidence-safe public matrix. The public `pair` object has **no raw research matrix** and tool/guide records carry only `title` and `href`. The generated description explicitly labels the comparisons unverified rather than restating unsourced vendor or architecture claims.

The Astro comparison pages pass **only the route slug** through `getStaticPaths` and call `getComparisonPair(Astro.params.slug,products)`, rather than passing private pair records through route props. The static build preflight also scans generated text assets for the original, unreviewed SEO descriptions in addition to raw candidate matrix values. The source-specific review-packet CLI still reads the private candidates offline for later independent assessment; it remains nonpublishable.

This is a public/private data boundary, not factual verification, authenticated reviewer identity, a host-access guarantee, or production approval. No raw vendor statements, SEO conclusions, pricing, scores, or affiliate links are authorized by it. PR #8 remains draft; no merge or public launch.

## Manual claim-specific excerpt capture (Milestone 2; private-only)

`src/data/comparison-evidence-captures.json` is intentionally **`[]`**. No vendor page has been fetched, no excerpt has been fabricated, and there are currently **zero** verified comparison claims. Before adding a record, an internal researcher must first create a strictly unapproved, claim-specific research-lead entry in `src/data/comparison-source-proposals.json`. A capture must match the exact `claimId`, `productId`, `researchLeadId`, original vendor `sourceUrl` and proposed plan/region scope. It also binds to the SHA-256 of the exact *private candidate assertion*; editing that assertion invalidates the old association. Each capture has a unique ID, a real UTC capture date no earlier than the proposal or source intake, `captureMethod:"manual"`, `status:"candidate"`, and `approved:false`.

The locally supplied `excerpt` is a bounded, single-line, plain-text research snippet (40–1000 characters, no HTML or control characters). `excerptSha256` is the SHA-256 of **those exact UTF-8 excerpt bytes only**. Use the pure `hashEvidenceExcerpt(excerpt)` helper in `src/lib/comparison-evidence-captures.mjs` to calculate this field. The hash does **not** prove the excerpt came from the URL, that it was independently verified, that the web page is live, or that the excerpt actually supports the comparison claim. Do not collect credentials, personal data, copyrighted full documents, or private customer information in excerpts.

Run `npm run research:evidence-captures -- --json` **only in trusted private development** for the full deterministic candidate report; the default text report prints IDs and source risk without revealing excerpt content. The existing `npm run research:review-packets -- --json` now groups unverified captured snippets with their matching private candidate claim packet. Both commands are offline read-only and never contact vendors. `npm run check:data` rejects unknown source associations, mismatched plan/region, altered snippet or claim digests, duplicate IDs and same-claim/source/date captures, malformed dates, and any extra approval/reviewer fields.

`npm run release:readiness` now exposes `manualEvidenceCaptures` counts and keeps a `source-excerpt-verification` **BLOCKED** gate; even a well-formed manual record is `independentlyVerified:false`, `supportsClaimVerified:false`, `eligibleForPublication:false`, and never changes the 36 comparison rows' `sourceId:null` or `approved:false`. `npm run release:preflight` blocks the private capture JSON filename and excerpt/capture metadata from browser-delivered text assets.

**Owner-gated next step:** independently collect and inspect first-party vendor content, verify the exact plan/region/claim meaning with an authenticated and independently authorized reviewer, preserve genuine source provenance and expiration, anchor the review audit outside untrusted repository files, then require separate owner approval before any public claim or production release. None of those approval authorities exists or is enabled in this increment.
