# Milestone 2 — Default-deny editorial service boundary

Date: 2026-11-05. Existing Draft PR #8, zero spend, no merge or release.

## Context and scope
StackPilot AI is static Astro with private internal research CLI tooling but no authenticated reviewer backend, independent identity provider, secured signing authority, or tamper-proof audit store. A browser/client-provided role or Git JSON edit must never authorize approval or publishing. Adding a "working" authentication form without owner-controlled credentials would be unsafe.

This increment establishes a **default-deny policy** and prevents accidentally introducing public or server-callable editorial endpoints in the source tree. It is **not** an authentication implementation.

## Planned implementation (test first)
1. Create tests for exhaustive editorial actions (view internal packets, propose evidence, record negative decision, approve, revoke, publish); all must deny while reviewer authn and trusted source review are absent. Reject unknown actions and any caller-supplied principal, role, JWT, signature, or "approved" field rather than pretending to verify them.
2. Create a source-tree audit covering `src/pages`, `src/middleware`, `netlify/functions`, `netlify/edge-functions`, `functions`, `api`, `server`, and equivalent endpoints. Reject server-capable files in Astro pages and any serverless/edge functions, regardless of their filename. Require Astro `output:'static'` and fail if Netlify config attempts function rewrites, though provider account-state remains outside this scan.
3. Wire audit to `npm run check:data` and show reviewer-auth status as a NO-GO blocker in `npm run release:readiness`. No signing keys, receipts, tokens, user accounts, APIs, route changes, new packages or public artifact changes.
4. Run exact-commit CI (tests, Astro build, operations and Chromium browser acceptance) and report what remains unverified.

## Attack assumptions and non-goals
An attacker can edit a Git data file or submit arbitrary browser assertions. Those are **not** evidence of a verified identity or role. The audit detects accidental server entrypoints in the repository, not every conceivable dynamic hosting mechanism or externally configured Netlify function; account-level provider settings need owner review. Do not infer authenticated remote preview UAT from GitHub CI.

## Owner gates
Monthly and delegated INR budget 0; private Netlify preview; public release NO-GO; no affiliate activation, credential collection, vendor outreach, merge or production promotion. The owner must separately authorize real identity/key provisioning, authentic reviewer RBAC, independently anchored audit and releases.
