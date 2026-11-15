# Cloudways India Tax Evidence and Ahrefs Program Recheck — Plan

**Date:** 2026-11-11  
**Status:** PRIVATE RESEARCH ONLY — UNAPPROVED — NOT PUBLISHED  
**Base:** `main@1672461bea5fa09e01965c5e8bdd4819852b06fd`  
**Branch:** `growth/cloudways-india-tax-evidence-2026-11-11`  
**Budget:** ₹0

## Goal

Make one narrowly scoped improvement to the existing SaaS usage-meter buyer brief: add Cloudways' current official billing-tax guidance for India and record the latest public Ahrefs affiliate-program recheck. Do not create another article or calculator.

## Evidence reviewed

1. **Cloudways — Fiscal Taxes Handling at Cloudways** (official help page dated 2026-06-23): tax depends on billing location; the country table lists India at 18%; an eligible, valid Tax ID such as GST may be verified for exemption; an approved exemption applies to future invoices; month-to-date tax is an estimate and may differ from the final invoice. No customer account or invoice was accessed.
2. **Ahrefs — Affiliate Program. We Don't Have One** (official article dated 2023-06-12): says the former program was discontinued and there were no plans to relaunch at that time. This is historical, not proof of 2026 absence.
3. **Ahrefs — Affiliate Marketing: What It Is & How to Start in 2026** (official article dated 2026-10-22): general affiliate-marketing education; it is not an Ahrefs SEO-product affiliate signup page. No current official public SEO-product affiliate registration page surfaced in this recheck.

## Scope

- Update `docs/growth/2026-11-04-saas-usage-meter-buyer-brief.md` only.
- Add a qualitative India-specific Cloudways tax query hypothesis and a dated first-party evidence row.
- Add a cautious explanation to the existing unpublished article and source register.
- Refresh the Ahrefs affiliate note without changing program records, URLs, status, applications or tracking.
- Update the exact-head backlog snapshot in the brief to the 2026-11-09 PR #8 artifact.

## Explicit non-goals

- No new public route, article, comparison, calculator, analytics or tracking.
- No change to `main`, PR #8/#9/#10/#12, vendor claim approvals, source-intake dates, reviewer fields, affiliate records or `affiliateUrl`.
- No tax/legal advice, buyer-specific tax calculation, assumed GST exemption, price quote or payout/tax inference.
- No account signup, partner application, contract, outreach, public post, indexing submission, provider change, publication or spend.
- Keep Netlify Private/Locked and noindex protections untouched.

## Plan / review sequence

1. **Think / inspect:** read current `AGENTS.md`, operating policy, current operational state, the target brief, open PRs and issue #6; confirm no open PR already edits the target.
2. **Source review:** inspect the official Cloudways tax page and both Ahrefs pages; preserve dates, wording and limitations.
3. **Build:** make an append-only evidence update inside the existing brief; avoid a duplicate page.
4. **gstack review:** check for unsupported tax conclusions, stale or misleading affiliate claims, invented metrics, and scope/security/release changes.
5. **Verification:** create a draft PR and inspect exact-head build, operations, browser and Netlify Deploy Preview checks. Documentation-only change; no TDD RED/GREEN cycle is claimed because executable behavior is unchanged.
6. **Reflect:** report the exact commit and checks, retain all claims as unapproved, and leave the draft PR unmerged.

## Acceptance criteria

- Cloudways' 18% India entry is attributed to its dated vendor billing page and explicitly conditioned on billing location; no flat tax is added to a hypothetical quote.
- GST/Tax ID exemption is described only as possible after verification and only for future invoices.
- Ahrefs' 2023 statement remains historical; the 2026 educational article is not represented as an affiliate offer; no program URL is invented.
- Search volume, rankings, visits, impressions, leads, conversions and earnings remain UNKNOWN.
- All six vendor claim records remain candidate-only; all applications and active affiliate links remain zero.
- Operating policy remains ₹0, noindex and privacy controls are unchanged, and the PR remains draft/unmerged.


## 2026-11-13 follow-up — Kinsta direct-browser verification

The exact public Kinsta Overages URL (https://kinsta.com/docs/billing/wordpress-hosting-plans/overages/) was opened in a normal browser. It rendered without authentication, showed the title “Overages” and last-updated date 2026-03-09, and exposed four separate meters: visits ($0.50/1,000 after cap), server bandwidth ($0.50/GB), SSD disk ($2/GB/month prorated daily) and CDN ($0.05/GB). It also described plan alerts and non-retroactive upgrades. No canonical URL was visible in the rendered content.

This is a reachability and vendor-documentation check only. It does not verify a customer's account, plan, geography, tax, usage, invoice or custom terms, and it does not approve the claim. No sign-in or account action occurred. Keep the source candidate-only.


## 2026-11-16 follow-up — Kinsta visit-meter semantics

**Official source:** [Kinsta WordPress Hosting Plans — Overages](https://kinsta.com/docs/billing/wordpress-hosting-plans/overages/), displayed last updated **2026-03-09**; public documentation retrieved 2026-11-16.

The page defines monthly visits as the sum of unique IP addresses seen within a 24-hour period, shared across sites in a WordPress Hosting plan. It says the visit count is not the same as unique IPs in `access.log`, because that log does not include visits served through the edge cache.

**Required wording:** describe this only as Kinsta's published billing definition. Do not relabel it as unique people, compare it as if it were identical to Google Analytics sessions, or infer the billed count from `access.log` alone. No customer account, plan entitlement, region, usage counter or invoice was inspected.

**Scope:** append-only clarification to the existing Kinsta evidence row and article section. No new article, route, application code, source-intake date, reviewer field, approval flag, product catalogue or affiliate record changed. All six vendor claim records remain candidate-only.

**Verification:** documentation-only; no executable behavior changed, so no TDD RED/GREEN or local test run is claimed. Require exact-head GitHub Build/tests, safety/operations, Chromium and Netlify Deploy Preview statuses. Keep the PR draft and unmerged, with no public indexing or release.
