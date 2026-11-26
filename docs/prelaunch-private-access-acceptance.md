# StackPilot AI — private preview access and privacy acceptance protocol

> **Current Phase 2 owner UAT note (2026-11-06):** This runbook's historical PR #1 instructions are **not** the active source of the PR number for Draft PR #8. On the current protected Netlify preview, `/tools/private-uat-worksheet/` derives its GitHub PR link and label from the same validated *build-time* `REVIEW_ID` metadata used by `/preview-build/`. If valid Netlify Deploy Preview metadata is unavailable, the worksheet labels the preview PR **BLOCKED / unavailable** and provides a generic PR-list link instead of guessing. The owner must personally compare the displayed PR number and full **40-character** source SHA against the current draft PR, and must separately test anonymous denial, deployed headers and actual account Private/Locked settings. No SHA fields are prefilled and a matching self-report **does not** constitute independently authenticated remote UAT or release approval. Public launch remains NO-GO; ₹0 budget and private/locked conditions remain binding.
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
- On worksheet, choose CRM, select two requirements, generate and copy locally. Download `stackpilot-requirements-crm.csv` and verify it contains two questions, `Unverified` status and blank vendor evidence fields. Check no CSV is uploaded; change one checkbox and confirm Download becomes disabled until regeneration. Repeat a mobile download for SEO; Reset must clear selections.
- On cost calculator, verify two entered scenarios, invalid input handling, currency and term limits; no fabricated vendor quotes.
- Verify CRM migration guide includes sample import, export permission, data minimization, rollback and staff-hour cost caveats. Download the fictional field-mapping CSV; check there are no real personal details.
- Verify the new hosting migration guide includes DNS/MX/SPF/DKIM, backups, rollback and the scrollable GO/NO-GO table on mobile. Confirm homepage links to both migration guides.
- Confirm page source includes `noindex, nofollow`, deployed `robots.txt` blocks indexing and `_headers` includes robots/security headers. These controls are **not** substitutes for authentication.
- Verify no referral URLs, payment form or data-submission requests were added.


## Exact-head owner UAT runbook — checkpoint 6e16e0a (2026-10-31)

1. **No changes needed:** keep Netlify `Production: Private`, `Deploy Previews: Private`, and `Auto Publishing: Locked`. Confirm actual account Free plan and remaining credits under Usage & billing. Do not upgrade.
2. Visit the [existing private PR #1 preview](https://deploy-preview-1--inspiring-chaja-cfb85f.netlify.app) in the owner's normal logged-in session, then inspect homepage, compare, research, both migration guides and both tools at desktop and phone viewport.
3. On `/tools/requirements-checklist/`, select CRM and two items, Generate, Download CSV. The filename should be `stackpilot-requirements-crm.csv`. Open it locally, verify exactly the selected questions, blank vendor responses, and `Unverified` status. Change a selection: stale download must disable. Repeat with a different category on mobile.
4. On `/guides/crm-migration-checklist/`, follow the fictional field-mapping CSV link; on `/guides/hosting-migration-checklist/`, use the horizontal GO/NO-GO table with keyboard focus/scroll. Confirm content displays correctly.
5. In browser DevTools Network, observe that worksheet inputs and CSV contents are not sent to any server. Inspect provider telemetry, cookies, response headers (`X-Robots-Tag`) and downloaded asset access. Do **not** post cookies, auth headers, HARs, emails, credentials, screenshots containing account details, or actual buyer records to GitHub.
6. Open a **fresh unauthenticated** profile (not a normal incognito window that inherits login) and attempt homepage, /compare/, /research/, worksheet, cost calculator, both guides, and both CSV asset URLs. Record HTTP response and whether content is readable. Denial must apply to all relevant paths, not only homepage.
7. Keep a private local pass/fail note with date, exact SHA, deployment ID, page, observed status and failure description (sanitized). If a private route can be read anonymously, stop and report **NO-GO** immediately; do not change visibility to 'fix' testing.

**Owner-specific evidence remains missing until these actions are performed.** An owner-reported prior incognito check and GitHub's local browser checks do not prove this exact remote deploy was tested with credentials. Passing this runbook also does not approve privacy text, affiliate terms, editorial claims, or public launch.

## C. Privacy and legal inventory (not yet verified)
- Review provider logs, IP processing, retention, subprocessors and geographic handling in the actual account and up-to-date provider terms.
- Check browser network requests for external analytics/tracking, cookies and client-side storage. If any exist, correct the public privacy notice accordingly before release.
- Provide a legitimate publisher contact channel and a human-readable method for privacy inquiries via a separately approved publishing workflow; do not commit personal contact data prematurely.
- Have the individual owner review jurisdiction-appropriate privacy, affiliate disclosure, editorial and licensing language before any public production.
- Retain only non-sensitive, time-stamped pass/fail notes and links to exact CI/deploy artifacts.

## Evidence register (all pending until performed)
| Evidence | Expected | Actual |
|---|---|---|
| Exact-head CI/Chromium/ops | All green | **PASS for `6e16e0a4b35eb46a636bc181521d67902debe4c8`** — build 41194487801, operations 41194487923, browser 41194487898. Recheck for later commits. |
| Netlify deploy status | Success for exact commit | **PASS** GitHub Netlify private Deploy Preview status for `6e16e0a4b35eb46a636bc181521d67902debe4c8`; not authenticated UAT. |
| Production and preview Private, Locked | Confirmed in provider UI | PENDING latest inspection |
| Anonymous deep-link access | All restricted | Nine-route HTTP 401 sample recorded previously at an earlier commit. **PENDING exact-head recheck and expanded routes.** |
| Authenticated UI on exact SHA | Functional | PENDING |
| Deployed headers/robots | Correct | PENDING |
| No unintended telemetry/form submission | Verified by network inspection | PENDING |
| Final owner/legal privacy review | Explicitly approved | PENDING |

**Verdict rule:** CI green is necessary, not sufficient, for remote-preview privacy PASS. This draft cannot check any box on the owner's behalf. No public launch, `main` merge, affiliate activation, spending, contracts or publication are authorized. Budget remains ₹0.
