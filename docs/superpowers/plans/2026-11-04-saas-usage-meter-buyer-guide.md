# SaaS Usage Meter Buyer Guide — Implementation Plan

> **For agentic workers:** Apply the repository's gstack and Superpowers workflow manually when executable skills are not available. This is a documentation-only task; do not add code or change product behavior.

**Goal:** Prepare one private, source-anchored buyer guide that explains how SaaS and hosting providers define billable usage units, limits, exclusions and overages.

**Architecture:** Add a dated research brief and unpublished article draft under docs/growth. Keep vendor statements attributed, plan/region uncertainty visible, and all publication, indexing, affiliate and account actions outside this plan. Reuse the existing TCO guide, calculator, SEO audit brief and six-vendor issue review instead of creating duplicate routes or repeating completed research.

**Tech Stack:** Markdown documentation, GitHub branch/PR workflow, existing read-only operations artifacts and GitHub Actions.

**Spec:** Owner request for StackPilot AI organic growth research, plus AGENTS.md and config/operating-policy.json.

## Scope and files

- Create docs/growth/2026-11-04-saas-usage-meter-buyer-brief.md — keyword hypotheses, competitor scan, official-source evidence, article draft, measurement plan and ethical distribution research.
- Keep this plan at docs/superpowers/plans/2026-11-04-saas-usage-meter-buyer-guide.md.
- Append one evidence handoff to open issue #6, cross-referencing closed issue #4; do not reopen either issue.
- Do not modify application code, product catalog, research-claims.json, affiliate-programs.json, package.json, robots.txt, public/_headers, netlify.toml, main, Netlify settings or production.

## Plan

- [ ] Confirm current branch, PR #1, main SHA, exact-head CI/Netlify status and ₹0 operating policy.
- [ ] Read the latest ops/backlog.json artifact. Do not execute ownerGates or change source intake dates. Avoid repeating the six claim-level checks already recorded in issue #6.
- [ ] Reopen first-party vendor documentation for Kinsta usage meters, Cloudways backup metering, Ahrefs crawl credits and Semrush monthly/per-audit limits. Recheck current HubSpot/Pipedrive export and partner-program caveats only where they materially affect buyer guidance.
- [ ] Research current content competitors qualitatively. Treat their displayed product counts and traffic statements as self-reported unless independently verified; do not claim measured SERP position or keyword volume.
- [ ] Draft a distinct article about billable units and meter reconciliation. Do not regenerate the existing TCO guide or SEO audit comparison.
- [ ] Define measurable post-approval metrics and explicit UNKNOWN baselines. Do not use CI requests, preview checks or private tool usage as visitor data.
- [ ] Review every numeric and plan-specific statement against a dated first-party source. Label it vendor-stated, not independently tested or editorially approved.
- [ ] Verify the documentation diff and exact final commit. Require fresh build, Chromium and operations CI plus Netlify Deploy Preview status. Keep PR #1 draft and unmerged.

## Safety and review gates

- Monthly budget ₹0; delegated spend ₹0; paid services, commercial hosting, production launch and affiliate activation remain false.
- No publishing, public indexing, external posts, account creation, outreach, affiliate application, tracking link, contract, provider change or spend.
- No change to vendor claim approval fields, source intake dates, product verification flags or affiliate URLs.
- No TDD RED/GREEN cycle is claimed: no executable behavior is changed. The documentation receives source-by-source review, Git diff review and the repository's existing CI checks.
- A successful CI run or Netlify status does not prove authenticated remote UAT, served-commit identity, account-level Private/Locked settings or billing status.

## Review references

- gstack plan-eng-review: https://github.com/garrytan/gstack/blob/main/plan-eng-review/SKILL.md
- gstack review: https://github.com/garrytan/gstack/blob/main/review/SKILL.md
- gstack QA: https://github.com/garrytan/gstack/blob/main/qa/SKILL.md
- Superpowers writing-plans: https://github.com/obra/superpowers/blob/2ce8aa15d05bd57213e6f746f953aafb7ded7a8b/skills/writing-plans/SKILL.md
- Superpowers TDD: https://github.com/obra/superpowers/blob/2ce8aa15d05bd57213e6f746f953aafb7ded7a8b/skills/test-driven-development/SKILL.md
- Superpowers verification-before-completion: https://github.com/obra/superpowers/blob/2ce8aa15d05bd57213e6f746f953aafb7ded7a8b/skills/verification-before-completion/SKILL.md
