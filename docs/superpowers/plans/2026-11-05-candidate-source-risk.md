# Milestone 2 increment: candidate source freshness and revocation risk

Date: 2026-11-05. Scope: existing draft PR #8, zero-budget and no release authorization.

## Need and trust boundary

Six vendor-doc research candidates exist, but recordedOn is only an intake timestamp, not independently verified accuracy. All 36 comparison cells have no reviewed evidence. A later source withdrawal or simple age threshold must be visible during internal review; none should imply evidence approval.

## Change plan

1. Write source-risk tests first for unreviewed, stale (strictly >90 days), and manually revoked leads; malformed/future/duplicate/mismatched revocations must fail closed. Tests require no external network, credentials or vendor requests.
2. Add an empty `src/data/research-source-revocations.json` intake file. Add a pure `src/lib/candidate-source-risk.mjs` validator/report referencing the existing `validateResearchClaims` and vendor-doc records. Revocation records record only source ID, date, and plain-text reason. No approvals, no auto-approval, no mutable vendor contact.
3. Add a read-only CLI and extend the repository-only production readiness inventory with candidate source risk counts and blocking gates. Do not feed candidate source text to public comparison rendering.
4. Run test/build, safety/ops and Chromium CI against the exact last commit. If unavailable, report the blocker, not success.

## Risk handling

Fresh timestamp means only recent collection, **not proof**. A revocation is a reason to disregard a research lead; no undo/approve command is provided. Local reports do not verify whether vendor documents remain online. The release remains NO-GO until human editorial, private-hosted UAT, legal, hosting, security, and owner approval.

## Hard gates

Private repository and Deploy Preview only, no changes to main, no merge, publishing, commerce, paid services, affiliates, contracts, or external communication. ₹0 monthly and delegated budget.
