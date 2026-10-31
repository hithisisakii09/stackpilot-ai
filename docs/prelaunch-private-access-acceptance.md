# StackPilot AI — private preview access and privacy acceptance protocol
**Draft date:** 2026-10-31. **Not an executed test or legal certification.**

## Purpose
Provide a reproducible, zero-cost evidence protocol for verifying the existing *private* Netlify preview and the data-handling claims of the site's static buyer tools. Do not modify hosting settings or collect credentials. Run only against the owner's own project, with owner authorization.

## Environment and safety preconditions
- Project: `inspiring-chaja-cfb85f`. Target: the current GitHub PR #1 Netlify **Deploy Preview**, not legacy Vercel or production.
- Record exact GitHub commit, deployed build identifier and check timestamp. A successful Netlify deployment status proves only build/deployment success.
- Check in Netlify UI that Production and Deploy Preview visibility are **Private** and Auto Publishing is **Locked**. No setting changes.
- Never publish access tokens, authenticated URLs, browser cookies, screenshots with email/account identifiers, KYC documents or private records to GitHub issues/artifacts.
- Do not use a paid service, bypass site authentication, weaken `robots.txt`, or change deployment visibility.

## A. Anonymous access rejection (manual, owner-controlled)
1. Open the deployed preview URL in a fresh unauthenticated browser profile with no Netlify session.
2. Check that homepage, `/compare/`, `/research/`, `/tools/requirements-checklist/`, `/tools/software-cost-calculator/`, and `/guides/crm-migration-checklist/` cannot be read anonymously.
3. Confirm denial applies to static asset and direct deep links, not merely homepage navigation. Do not attempt abusive enumeration, credential attacks or auth bypass.
4. Record a non-sensitive PASS/FAIL per route; if any protected page is publicly readable, flag an incident and do not release.

## B. Authenticated functional acceptance
With the owner's authorized Netlify login in a normal browser:
- Open each path above in desktop and mobile viewport; verify headings, navigation, scrolling and accessibility.
- On worksheet, choose a category and generate/copy locally. Reset must clear selections.
- On cost calculator, verify two entered scenarios, invalid input handling, currency and term limits; no fabricated vendor quotes.
- Verify CRM migration guide includes sample import, export permission, data minimization, rollback and staff-hour cost caveats.
- Confirm page source includes `noindex, nofollow`, deployed `robots.txt` blocks indexing and `_headers` includes robots/security headers. These controls are **not** substitutes for authentication.
- Verify no referral URLs, payment form or data-submission requests were added.

## C. Privacy and legal inventory (not yet verified)
- Review provider logs, IP processing, retention, subprocessors and geographic handling in the actual account and up-to-date provider terms.
- Check browser network requests for external analytics/tracking, cookies and client-side storage. If any exist, correct the public privacy notice accordingly before release.
- Provide a legitimate publisher contact channel and a human-readable method for privacy inquiries via a separately approved publishing workflow; do not commit personal contact data prematurely.
- Have the individual owner review jurisdiction-appropriate privacy, affiliate disclosure, editorial and licensing language before any public production.
- Retain only non-sensitive, time-stamped pass/fail notes and links to exact CI/deploy artifacts.

## Evidence register (all pending until performed)
| Evidence | Expected | Actual |
|---|---|---|
| Exact-head CI/Chromium/ops | All green | PENDING latest recheck |
| Netlify deploy status | Success for exact commit | PENDING latest recheck |
| Production and preview Private, Locked | Confirmed in provider UI | PENDING latest inspection |
| Anonymous deep-link access | All restricted | PENDING |
| Authenticated UI on exact SHA | Functional | PENDING |
| Deployed headers/robots | Correct | PENDING |
| No unintended telemetry/form submission | Verified by network inspection | PENDING |
| Final owner/legal privacy review | Explicitly approved | PENDING |

**Verdict rule:** CI green is necessary, not sufficient, for remote-preview privacy PASS. This draft cannot check any box on the owner's behalf. No public launch, `main` merge, affiliate activation, spending, contracts or publication are authorized. Budget remains ₹0.
