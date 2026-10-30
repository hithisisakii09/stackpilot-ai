# StackPilot AI — From Protected Preview to Commercial Launch

**Status: engineering development in a protected Vercel preview. Not released.**
**Required workflow:** read `AGENTS.md`; use gstack architecture/review/QA and Superpowers plans/TDD/debug/verification on every sprint.

## Phase gates

| Phase | Scope | Evidence required to advance | Owner action |
|---|---|---|---|
| 1 — MVP foundation | Static Astro site, category quiz, profiles, compare, no-index pages | Tests, desktop/mobile Chromium and WCAG scans | None for protected development |
| 2.0 — Research evidence intake | Candidate source ledger + read-only workbench with strict approval boundary | Ledger integrity tests, build, browser QA | None to collect unreviewed leads |
| 2.1 — Human editorial research | Specific source-backed vendor feature, pricing, availability, plan restrictions, checked dates | Authentic, dated primary sources; exact pricing units and limits; explicit human review | Designate reviewer(s), approve research policy |
| 2.2 — Evidence-backed comparison | Plan-scoped and location-aware comparison; no unsupported winner claims | Approved claim-level citations and regression tests | Human editorial approvals |
| 3 — Quality, performance and trust | Mobile WCAG manual testing, security headers, privacy/terms, privacy inventory, monitoring strategy | Reproducible CI, audited hosting config, reviewed policies, remote protected browser QA | Operator identity, chosen jurisdiction, legal/privacy review |
| 4 — Production launch preparation | Domain, brand, indexing plan, backups, observability, reliability and plan limits | Rollback playbook, domain ownership, public page review, release checklist | Authorize paid/commercial hosting where necessary and public publication |
| 5 — Affiliate monetization | Program enrollment, policy checks, affiliate disclosures, approved links, independence tests | Verified program participation, link destination and expiration checks, FTC/region disclosures | Separate approval per affiliate program and activation |
| 6 — Operations and iteration | Source freshness audits, change monitoring, editorial queue, conversion testing | User consent, privacy-safe metrics, security/review evidence, incident playbook | Approve data retention/telemetry and commercial roadmap |

## Hard boundaries

- No automatic conversion from vendor-source lead to verified fact: **the current static system cannot authenticate editors or approve claims**.
- No production merge, public domain/indexing, traffic acquisition, affiliate link activation, payments or real-user tracking without separate authorization.
- No fabricated approval history, fictitious reviews or guesswork about vendor pricing.
- Free Vercel Hobby has commercial-use limitations; review plan eligibility before monetization.
- A protected preview's READY status is not a public launch or a substitute for live authenticated browser testing.
- Confirm older `main` production target and avoid disrupting it.

## Current handoff

Branch: `feature/phase-1-1-recommendation-engine`
Draft PR: https://github.com/hithisisakii09/stackpilot-ai/pull/1
Private project: `masher2/stackpilot-ai` (Vercel)

To pick up any future work: inspect the latest PR SHA; run `npm test`, `npm run research:evidence` and Chromium browser QA; read `AGENTS.md`; don't call a phase complete until CI confirms.
