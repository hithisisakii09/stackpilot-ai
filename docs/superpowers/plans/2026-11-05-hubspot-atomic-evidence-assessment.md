# Milestone 2 — Atomic HubSpot export evidence assessment (private only)

Date: 2026-11-05. Branch: `feature/phase-2-product-readiness`, existing Draft PR #8.

## Problem / owner goal

The first manual pilot correctly isolates the HubSpot export candidate `comparison-hubspot-vs-pipedrive-05` but its combined research assertion contains **four independent factual predicates**: CSV export of deals, contacts and companies, plus API data sync. A link or single captured excerpt can superficially appear to address the whole row even if it supports only one predicate. Live vendor-page inspection is unavailable in this session; do not invent facts, snapshot text, dates or approvals.

## Test-first increment

1. RED behavior tests for `buildHubspotExportAssessment` requiring validated source/proposal/capture registers and exact private claim/vendor; reject any change in the original candidate assertion, wrong claim/vendor, malformed or unauthorized input, and attempted verified/approved flags.
2. Return precisely four **atomic** human questions. For each: evidence requirements (official vendor URL, exact supporting short excerpt, applicable plan/permission/region, capture date, caveats); an explicit false `independentlyVerified`, false `supportsPredicateVerified`, false `eligibleForPublication`, `status:'NEEDS-EVIDENCE'`; distinguish ordinary record export from continuous API data sync. Record only **counts/IDs** of matching, unapproved existing proposal/capture data. Candidate text never changes an outcome.
3. Surface source-lead age/revocation and the existing claim's research stage; **do not** auto-assign a lead or excerpt to a predicate. The current vendor document URL can be a research option but is not remotely validated or claim-relevant until human inspection.
4. Read-only CLI `npm run research:hubspot-export-checklist`: safe default prints questions and existing research status (no raw unsourced assertion), `--json` produces private structured checklist including raw candidate assertion. Fail closed for flags and invalid project data. No write, vendor fetching or approvals.
5. Document a blank human checklist/handoff in the first-claim pilot and test no public route imports or build artifacts. Validate 36 claims remain unapproved and `release:readiness` stays NO-GO.
6. Verify exact final PR SHA via GitHub Actions build, safety/operations and Chromium; private Netlify preview remains locked. Never merge, spend, activate affiliates or publish.

## Limits / explicit restrictions

This is structured gap analysis only. Neither a candidate research lead nor a captured local excerpt can substantiate a predicate without genuine independent review. Even four manually filled entries would not authenticate an editor, source or release. All $0 / ₹0 spend constraints and no-merge/no-production restrictions remain unchanged.
