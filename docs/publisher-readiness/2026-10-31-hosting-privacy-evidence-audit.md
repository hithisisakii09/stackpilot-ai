# StackPilot AI — prelaunch hosting and privacy evidence assessment
**Assessment date:** 2026-10-31 (Asia/Kolkata)  
**Status:** PRIVATE development research, **NOT** legal signoff, account attestation, or public-launch permission.  
**Scope:** Existing Astro source and provider-published terms; no access to Netlify account billing, authenticated browser session, or private user data.

## A. What is verified from official Netlify documentation

| Question | Provider documentation evidence | Implication for ₹0 launch planning |
| --- | --- | --- |
| Does standard Free permit commercial projects? | https://www.netlify.com/blog/introducing-netlify-free-plan/ and support follow-up https://answers.netlify.com/t/can-we-use-netlify-free-plan-for-commercial-purposes/41545 | Netlify allows commercial projects on Free, subject to actual terms; *this does not verify account eligibility or particular affiliate network terms*. |
| How many credits are included? | https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/ | Credit-based Free: 300 credits/month with a hard limit, no auto-recharge; **owner must confirm the account is truly Free and credit-based**. |
| What consumes credits? | https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/ | Provider's published figures: production deploys 15 credits; Deploy Preview/branch deploys 0 deploy credits; web traffic 2 credits/10,000 requests; bandwidth 20 credits/GB. Preview *traffic* can still consume requests/bandwidth. |
| What happens at the cap? | https://docs.netlify.com/manage/accounts-and-billing/billing/resume-paused-projects/ | Free projects pause until balance resets or owner upgrades; do **not** upgrade or spend. |
| Can Free projects stay private? | https://docs.netlify.com/deploy/protect-deploys/ | Provider describes Private visibility for credit-based Free; owner has previously reported Private production/preview and Locked auto publishing. Recheck actual settings before release. |

Provider public documentation was checked 2026-10-31; numbers and contractual terms may change. No guarantee of uptime, indexing, billability, traffic, partner acceptance or a profitable public service follows from these documents.

## B. Direct source-code privacy inspection (bounded)

The following files were read directly from draft PR #1's development branch:
- `src/pages/index.astro`: quiz uses browser DOM state and writes results locally; external vendor links target official websites. No user registration or outbound form in inspected page.
- `src/pages/tools/requirements-checklist/index.astro`: uses client-side selections, local text output and clipboard, with no form submission in inspected source.
- `src/pages/tools/software-cost-calculator/index.astro`: local form calculations, intended to avoid submission; required **live network-panel verification** because source inspection is not a runtime audit.
- `src/pages/privacy/index.astro`: explicitly describes *prototype* data practices and acknowledges that host logs may exist. It is **not** a final public privacy notice.
- `src/pages/disclosure/index.astro`: says affiliate links are inactive; preserve until confirmed otherwise.
- `src/pages/methodology/index.astro`: clearly describes unverified catalog and editorial process.
- `public/_headers`: noindex and baseline security headers; these are **not** authentication.
- `netlify.toml`: Astro `dist` static build; corrected its outdated Vercel/current-development note in this sprint.

**Limitations:** This is a file-level inspection of selected sources, not a repo-wide dependency audit, browser Network/HAR/cookie inspection, provider telemetry check, security assessment or completed legal notice. We cannot certify 'no cookies' or 'no data processing' without actual deployed/browser/provider evidence. Do not add a cookie banner merely on speculation; first identify what really exists.

## C. Account owner only — minimal evidence capture, no secrets

1. Open Netlify team **Usage & billing > Plan details** and **credit balance**. Record only the plan label, whether billing is credit-based or legacy, credit limit, used/remaining balance and screenshot date **in private owner notes**. Never commit payment methods or full billing screenshots.
2. Confirm **Production = Private**, **Deploy Previews = Private**, and **Auto Publishing = Locked**; do not change them.
3. While logged into the owner's authorized Netlify session, test the deployed **exact SHA** homepage, comparisons, research, CRM guide, synthetic CSV download, worksheet, calculator on desktop and mobile; check browser Console and Network for external requests, storage, cookies and form posts. Record pass/fail only.
4. Identify a lawful publisher contact address and actual operating jurisdiction without posting identity/KYC/bank details to GitHub issues. Have qualified legal review where applicable.
5. Personally review six vendor claim packets and editorial policies; record source/plan/region/dates, decisions and reasoning. Research leads are not independently verified reviews.
6. Obtain separate consent **only after all mandatory gates** before any main merge, production-public setting, indexing, applications/contracts, or affiliate tracking. An owner checkbox alone is not evidence of steps 1–5.

## D. Release verdict

- **Source audit:** completed for enumerated files only.
- **Public hosting general terms research:** completed from provider docs; **account-specific host eligibility/usage: UNVERIFIED**.
- **Authenticated Netlify remote UAT and actual deployed telemetry:** UNVERIFIED.
- **Privacy notice, contact, jurisdiction and editorial approvals:** PENDING owner review.
- **Budget:** ₹0 monthly / ₹0 delegated. No payment, paid hosting, domain, partner signup, contracts, public launch, main merge, indexing, or affiliate activation allowed.
- **Decision:** Private development GO if exact-head CI passes; **public production NO-GO**.

### Engineering method provenance
Applied gstack engineering review/QA and Superpowers RED→GREEN / verify-before-completion from public SKILL.md references: https://github.com/garrytan/gstack/blob/main/plan-eng-review/SKILL.md ; https://github.com/garrytan/gstack/blob/main/review/SKILL.md ; https://github.com/garrytan/gstack/blob/main/qa/SKILL.md ; https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md ; https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md . These describe the methodology; they are not installed slash-command execution claims.
