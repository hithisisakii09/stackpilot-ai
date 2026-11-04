# Affiliate monetization preparation — candidate research, no activation
Original intake: 2026-10-31. Latest public-source review: 2026-11-04. `₹0` cash budget and no permission to sign up, apply, accept contracts, remove noindex, make the site public, or enable tracked URLs.

## What this phase actually delivers
- A validated, machine-readable **research intake** for all six listed vendors in `src/data/affiliate-programs.json`.
- Five public affiliate-program candidate pages remain under owner review. For Ahrefs, no public registration page was found on 2026-11-04; the ledger records `no-public-program-found`, not a confirmed offer or a claim that private arrangements are impossible. These URLs are untracked candidate information, not referral links.
- A deterministic, **read-only** queue via `npm run partners:queue` or `npm run partners:queue -- --json`; `lastReviewedOn` is separate from original `sourceLoggedOn`, and fresh program reviews are not repeated daily.
- Integration into `npm run ops:report -- --json` and `npm test`. All status values fail closed: applications 0, acceptance 0, referrals 0, actual earnings unknown.
- No automated partner applications or approval mutations. The owner must provide real identity/contract consent and separate activation approval.

## Official vendor reference pages for research
| Vendor | Official candidate page | Unverified approval obstacle / next research |
|---|---|---|
| Pipedrive | https://www.pipedrive.com/en/affiliate-partnership | An established professional website or qualifying professional social channel is required; obtain authentic public site only after owner launch approval |
| HubSpot | https://www.hubspot.com/partners/affiliates | Review current affiliate terms, operator identity, eligibility, and approval process; no application submitted |
| Kinsta | https://kinsta.com/affiliates/ | Review editorial-depth and own-domain requirements; incomplete/list-only websites are typically not eligible |
| Semrush | https://www.semrush.com/lp/affiliate-program/en/ | Review current thresholds; official FAQ indicates ~1,000 monthly visitors or substantial relevant professional social audience |
| Cloudways | https://support.cloudways.com/en/articles/5134056-how-to-join-cloudways-affiliate-program-faqs-benefits | Verify current country/payout terms and account-related requirements; do not pay for hosting or create an account |
| Ahrefs | *(no public registration found on 2026-11-04)* | Recheck official status after the 90-day review window; no public application or terms currently established |

These are research leads, not certified policy summaries. Any commission amounts, tracking cookies, actual terms and country eligibility must be verified at application time. Vendor program rules can change and approval is entirely discretionary.

## Zero-cost organic growth backlog — drafts only
1. **CRM:** Carefully fact-check HubSpot vs Pipedrive plans/features, region/billing differences, onboarding and data export. Write an evergreen comparison with claim-level citations and methodology; do not invent testing results.
2. **SEO:** Produce a decision framework for Ahrefs vs Semrush using verified trial/free-plan/limitation information, not unsupported "best" rankings or commissions.
3. **Hosting:** Produce decision criteria for Kinsta vs Cloudways with workload, traffic, scaling, support, pricing and migration scope, region-specific nuances, and evidence dates.
4. **Utility content:** Add an independently useful user-supplied requirement checklist and filter controls; prioritize useful research over automatically generated thin pages.
5. **Publisher transparency:** Complete truthful disclosures, authorship, contact, privacy and editorial methodology after owner provides real business identity.
6. **Traffic:** No Search Console/analytics access or organic traffic measurements are yet established. Never invent clicks, trials, purchases, RPM, earnings or conversion rates. Public indexing and marketing distribution require launch permission.

## Owner-only launch prerequisites
See [Issue #2](https://github.com/hithisisakii09/stackpilot-ai/issues/2). Public release, Netlify visibility changes and branch merge remain separate approval gates. Vendor applications and tax/KYC/payment information must never be entered in PRs, repo files or public pages.

## Current runbook for the daily operator
1. Run `npm run partners:queue -- --json`, cross-check source freshness and the actual affiliate-program legal terms.
2. Maintain an **unapproved research backlog**, not an affiliate account. Raise a non-sensitive issue when source links go stale.
3. Select a low-cost, valuable user-facing editorial/test improvement, follow gstack engineering review and Superpowers TDD, and verify the exact commit via CI.
4. Report owner-only blockers without re-asking for the ₹0 budget or permission already given for safe private development.
5. Do **not** claim passive income before external affiliate statements provide independently verifiable commission evidence.

## Historical owner QA acceptance
The owner manually confirmed that their Netlify private preview homepage, comparison and research work after logging in, and Incognito without authentication is blocked. This is **user-reported acceptance**; no independent network penetration assessment has been conducted.
