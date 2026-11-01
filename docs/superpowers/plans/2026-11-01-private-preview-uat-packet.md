# Private-preview route-bound UAT packet — 2026-11-01

## Goal and scope
The existing release-readiness handoff refers to old static page totals and manually edited SHA references. Instead, have every private-preview packaging workflow automatically generate **a current-source-SHA route inventory and owner-only UAT checklist** using the manifest of actual emitted HTML. The packet is an instruction/evidence request, not evidence that any remote request passed. No extra providers, network calls, or spend.

## Architecture
- `src/lib/preview-uat-packet.mjs` exports `buildPrivatePreviewUatPacket({manifest,policy,publisher})` and `formatPrivatePreviewUatPacketMarkdown(packet)`.
- Reconstruct the existing private-preview manifest using `buildPrivatePreviewManifest(manifest.files, policy, manifest.sourceCommit)` and compare exact permitted fields to block extra approvals, altered hashes, mismatched counts/bytes, unsafe paths or forged flags. Use `buildPublisherReadiness` output from actual repository data; reject unknown/approved publisher gates and external preview status. Never infer authenticated access, provider pricing/privacy, credentials, or legal signoff.
- Route URL paths come ONLY from manifest HTML `index.html` files, including the root. Every route is `UNTESTED`; **not** a claim a remote server served HTTP 200 or had headers. Keep exact 40-hex source SHA, route path and optional built-asset SHA256 in the packet to prevent mixing revisions.
- Always `releaseVerdict:'NO_GO'`, `publicReleaseAuthorized:false`, `remoteAuthenticatedUatPassed:false`, `anonymousPreviewDenialVerified:false`, `hostingProviderAccountVerified:false`. Include six remote owner/provider gates, a checklist for authentication, anonymous denial, headers, responsive/export interactions, contract/billing and editorial approval. Every entry UNVERIFIED.
- Deterministic Markdown with no untrusted text injection, empty checkboxes reserved **only for an owner to fill outside CI**, and no credentials/PII. No count of approved vendors inferred from source research.
- `scripts/create-private-preview-package.mjs` produces `artifacts/private-preview/uat-packet.json` and `uat-packet.md` alongside validated manifest, no changes to production or GitHub workflows (existing three-day short-lived artifact retention).

## Files and phases
1. Plan here; read `AGENTS.md`, current release packet, gstack plan/review/QA and Superpowers TDD/verification instructions, apply manually.
2. RED tests in `tests/preview-uat-packet.test.mjs`: 5 synthetic artifacts, 3 HTML routes with distinct paths, exact commit and hashes, deterministic rendering, no route falsely passed, reject modified manifest, false approvals, extra fields, unsafe paths, stale mismatched publisher record. Static integration assertions require packaging script to create both packet files. Commit tests before production code and observe failures in CI.
3. GREEN implement pure builder/formatter; wire packaging script to use existing built manifest and static publisher report, no packages, server connections or account writes.
4. Validate current exact PR SHA: unit/build/static preflight, operations artifact packaging, Chromium desktop/mobile, Netlify Deploy Preview provider status. Distinguish local CI from authenticated hosted UAT. Add PR comment with verified run IDs and outstanding gates.

## Non-negotiable limits
No main merge, production unlock, public indexing, publisher/claim approval, affiliate link activation, spend >₹0, brand change, KYC, provider account change, or recreation of deleted Vercel. Netlify historically Private/Locked by owner's screenshots, not independently reverified by CI.
