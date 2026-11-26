# Milestone 2 — Separate public comparison metadata from private research candidates

Date: 2026-11-05. Existing private Draft PR #8 only.

## Problem
`getComparisonPair` currently masks matrix row values, but returns `pair` as a reference to the original `COMPARISON_PAIRS` record, which still contains unsourced `matrix` data and unreviewed comparative SEO descriptions. The Astro route also receives raw pair data as static route props. While build leakage checks exist, it is safer to prevent these private research assertions from ever crossing the public view-model boundary.

## Increment (test first)
1. Tests require `getComparisonPair().pair` to be a fresh, neutral public metadata object with no raw `matrix`, no underlying pair object reference, unverified meta description, detached tool/guide arrays, and no unsourced candidate assertions anywhere in serialized public model. Keep existing neutral row placeholders, claim IDs, and CSV worksheet.
2. Update `getComparisonPair` to return safe shallow public pair metadata; leave `COMPARISON_PAIRS` intact for private source-specific review packets.
3. Update `src/pages/compare/[slug].astro` to use only the route slug and safe public view model, never raw pair props or raw meta descriptions. Update build-leak audit to flag raw original SEO descriptions alongside raw matrix candidate assertions.
4. Run 100% Node tests, Astro build, check:build, release:preflight, operations, and Chromium browser checks at exact final SHA.

## Threat boundary
This reduces accidental leakage, not a formal proof against all transformed/compressed data. All 36 claims remain unverified; no pricing, vendor ranking, affiliate activation, owner approval, public launch, or server-side access changes. No spending or external source contact.

## Completion
Record actual CI status on exact commit. Keep private Deploy Preview only, PR draft, main unchanged and production NO-GO.
