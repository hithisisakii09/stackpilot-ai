# Phase 4.0 — Remove arbitrary buyer suitability scores from unverified research

**2026-11-01 | Zero-cost private development | Draft PR #1 only**

## Finding and user value
The homepage appropriately shows alphabetical, unranked category matches. But the underlying `src/lib/recommend.mjs` still invents a 60/100 baseline and can produce 100/100 when products use the `verified` flag. This conflicts with the publisher's "no fabricated product scores" research standard and makes it easy for a future autonomous consumer of the library to display ungrounded 60/100 recommendations. Scores represent neither tested product quality nor commercial performance. The current six catalog products are unverified.

## Proposed contract
- `recommend(products,{goal,team,budget})` continues returning only members of a chosen category, with per-candidate `{product,reasons,cautions}` and strict validation of the three selectors.
- **Remove** `score`, implicit numeric rankings, baseline score, and score sorting in the **underlying shared helper**, not just the UI. Sort candidates alphabetically by product name, with product ID as a stable deterministic tie-breaker.
- Do **not** conflate verified compatibility metadata with a percentage. For a truly `verified:true` product, preserve factual explanatory reasons/cautions for known team and budget traits without a weighted number or preference placement. For `verified:false`, neither tentative supported-team nor budget annotations may become positive claims; keep clear warnings.
- Keep affiliate URLs out of ranking, scores and reasons. Every candidate is neither a winner nor an affiliate selection. The homepage existing UI consumes only reasons/cautions and already titles results "alphabetical, unranked". No new page, new dependencies, feeds, hosting calls, production changes or commercial claims.
- Update the existing score-dependent unit tests to verify schema and ordering. Add new tests **first**, commit, observe RED on exact GitHub CI. Next implement, inspect GREEN unit/build/Chromium/ops and Netlify status.
- Security review: no unsafe DOM rendering, no arithmetic-derived fit score, no paid ranking, no public claim, no site visibility change.

## Deployment, human-review boundaries
Budget ₹0, delegated ₹0; production and publication NO-GO. No merge, site visibility unlock, external scripts, affiliate activation, verified-claim flag changes, contract, or spend. Netlify CI preview provider SUCCESS remains different from authenticated hosted UAT; the latter requires owner and remains unverified.

## Method
Follow existing `AGENTS.md`, gstack plan/QA and Superpowers TDD RED→GREEN/verification-before-completion. The methodology sources were re-read on this development turn.
