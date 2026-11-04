# StackPilot AI — Product Evidence Contract (Phase 1.2)

This catalog remains **unverified**. The presence of a vendor profile is not evidence that the product is suitable for any specific agency or budget.

## Fields

- `verified`: editorial approval flag; starts `false`
- `researchStatus`: `unresearched`, `needs-review`, or `verified`
- `sources`: array of `{ url, claim, checkedAt }` containing HTTPS evidence links, specific claim summaries, and YYYY-MM-DD check dates
- `lastVerifiedAt`: nullable YYYY-MM-DD date of completed editorial review
- `supportedTeams`: supported labels from `Solo`, `2–20`, `21+`; empty means **unknown**, not unsupported
- `budgetTiers`: supported labels `Minimal`, `Moderate`, `Premium`; empty means **unknown**
- `pricing`: currently locked to `{status: "unverified", amount: null, currency: null}`; never infer live prices
- `affiliateUrl`: remains `null`, enforced by validation

## Research approval flow (future work, not active)

1. Record official vendor primary-source URLs, specific claims, and date checked.
2. Cross-check pricing currency, billing frequency, plan limitations and geography.
3. Review conflicting evidence and approve internally.
4. Only then consider verified eligibility or ranking attributes; do not approve based solely on a marketing claim.
5. Affiliate applications and links have a completely separate approval process.

## Known limitations

The MVP has no research agents, ingestion pipeline, independent verification workflow, or immutable approval record. The schema validates structure and basic prerequisites only; it **cannot prove the truth or freshness of a source**. The static catalog has no real pricing or team compatibility evidence and must not imply otherwise.
