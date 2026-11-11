# Affiliate Publisher Readiness Recheck — Plan

**Date:** 2026-11-12  
**Status:** PRIVATE RESEARCH ONLY — NO APPLICATION — NO APPROVAL  
**Base:** `main@1672461bea5fa09e01965c5e8bdd4819852b06fd`  
**Branch:** `growth/affiliate-publisher-readiness-recheck-2026-11-12`  
**Budget:** ₹0

## Goal

Refresh the existing official affiliate-program eligibility brief with source-backed publisher-readiness criteria and one material Cloudways cookie-duration conflict, without creating accounts, submitting applications or activating links.

## Evidence reviewed

- Pipedrive official affiliate page: professional website with landing pages **or** appropriate professional social channel; geographic exceptions may be communicated during approval. No numeric audience minimum stated.
  - https://www.pipedrive.com/en/affiliate-partnership
- HubSpot official affiliate overview: identifies SaaS reviewers, content publishers, course creators, B2B marketplaces and app builders; no customer account or minimum sales required; no numeric public traffic minimum stated on the reviewed page.
  - https://www.hubspot.com/partners/affiliates
- Kinsta official FAQ: manual review; rejects unfinished/no-own-domain/list-only/no-disclosure properties and social-only profiles; expects significant relevant high-quality content.
  - https://kinsta.com/affiliates/faq/
- Semrush official affiliate FAQ: 1,000 monthly unique website visitors or typically 1,000 organic social followers/likes/views; checks relevance, traffic sources, rankings, content frequency and verifiable contact details; generally declines unfinished/newly launched properties.
  - https://www.semrush.com/lp/affiliate-program/en/?list_view=true
- Cloudways official public landing page: 60-day cookie.
  - https://www.cloudways.com/affiliate/affiliates/
- Cloudways Help Center FAQ dated 2026-04-28: 90-day cookie; approval after two paid invoices; PayPal threshold $250, wire transfer described for $1,000+; profile created through Cloudways Platform login.
  - https://support.cloudways.com/en/articles/5134056-how-to-join-cloudways-affiliate-program-faqs-benefits
- Ahrefs official article dated 2023-06-12 remains historical; no current public Ahrefs SEO-product registration page identified.
  - https://ahrefs.com/blog/ahrefs-affiliate-program/

## Scope

- Append a dated 2026-11-12 source recheck to `docs/affiliate-eligibility/2026-10-31-primary-source-review.md`.
- Explicitly preserve the 60-day vs 90-day Cloudways conflict without selecting a definitive term.
- Distinguish Pipedrive's social-channel alternative from Kinsta's exclusion of social-only profiles and Semrush's numeric audience threshold.
- Record HubSpot's lack of a published numeric traffic threshold as “not stated,” not as proof of no threshold.
- Record actual traffic, social audience and channel proof as UNKNOWN.
- Keep the Pipedrive and HubSpot applications UNSUBMITTED.

## Explicit non-goals

- No changes to `affiliate-programs.json`, `research-claims.json`, source-intake dates, reviewer fields, approval flags, program URLs or tracking links.
- No account creation, login, signup, affiliate application, contract acceptance, payout/KYC check, tax determination, outreach or public posting.
- No commission projections, revenue estimates, traffic claims, testimonials or fabricated audience.
- No new public route, runtime code, analytics, tracking, noindex/privacy or hosting change.
- No production promotion, main merge, paid service or spend; preserve Netlify Private/Locked as last owner-reported and budget ₹0.

## Plan / review sequence

1. **Think / inspect:** read current AGENTS.md, operating policy, operational state, current PRs and the existing affiliate eligibility brief; confirm no open PR edits the target.
2. **Source review:** re-open official program pages and record the exact distinctions and Cloudways inconsistency.
3. **Build:** append the dated evidence note to the existing brief; do not alter program or approval records.
4. **gstack review:** manually apply current evidence, scope, trust-boundary and release-gate review. Upstream gstack says `/plan-eng-review` was cut on 2026-11-06; its methodology remains in `/autoplan`'s eng phase and `/review` checks the diff. No local gstack command runtime was exposed in this host, so no slash command or setup script is claimed to have run.
5. **Superpowers verification:** documentation-only; no executable behavior changes, so TDD RED/GREEN is not applicable. Verify exact changed paths and run the repository's PR CI: build/tests, safety/operations, Chromium and Netlify Deploy Preview.
6. **Reflect:** record exact commit and checks, keep the PR draft and unmerged.

## Acceptance criteria

- Every program statement is attributed to an official source and date where available.
- Cloudways 60/90-day discrepancy remains explicitly unresolved.
- Kinsta and Semrush requirements are not represented as satisfied.
- Pipedrive/HubSpot application drafts remain unsubmitted; no traffic or social proof is fabricated.
- No application, account, payout, tracking, publication or spend action occurs.
- All vendor claims remain candidate-only and all release controls remain unchanged.
