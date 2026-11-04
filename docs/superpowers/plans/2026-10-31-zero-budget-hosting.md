# Zero-Budget Commercial Hosting Preparation

> **For agentic workers:** Use Superpowers test-driven development and verification-before-completion, and gstack review/QA. No live account creation or publishing is authorized.

**Goal:** Prepare StackPilot AI for a commercially permissible ₹0 hosting configuration without creating a public deployment or incurring charges.

**Architecture:** Continue Astro static output and locked dependencies. Configure Netlify Free static builds and platform noindex headers, enforce a ₹0 account-operations policy in a structured file and a fail-closed report, and test the published artifacts locally through CI. Existing Vercel protected preview is unchanged.

**Tech Stack:** Astro 7, Node.js 22.22+, Netlify static publish, GitHub Actions.

**Spec:** `AGENTS.md`, `docs/autonomous-business.md`, `docs/roadmap-to-launch.md`.

## Constraints
- Budget ₹0/month, delegated spending ₹0; no paid hosting, agent API, paid automation, ads, domains, or commercial contracts.
- Netlify Free is a **candidate**, not a connected or approved account. Public deploy requires separate authorization.
- Pages must remain non-indexed and devoid of affiliate tracking links and unapproved claims.
- Do not modify `main` or Vercel production, merge draft PR #1 or create a Netlify account/project.
- Distinguish a public URL from a protected preview. A `netlify.app` site is publicly reachable unless separately protected; `noindex` is not access control.

## Task 1: Guards first
- [ ] Add failing unit and build-smoke assertions for `config/operating-policy.json`, `netlify.toml`, and `public/_headers`.
- [ ] Confirm CI RED because files do not yet exist.
- [ ] Add config with `monthlyBudgetINR:0`, `delegatedSpendINR:0`, `productionLaunchApproved:false`, `affiliateActivationApproved:false`, `hostingCandidate:'netlify-free'`, `commercialHostingApproved:false`.
- [ ] Add Netlify static build configuration, preserving no-index in preview and default production artifacts.
- [ ] Run full `npm test`, Chromium and security audit GREEN.

## Task 2: Update operator decision support
- [ ] Extend operations report to read the budget policy and decline to claim any external hosting approval from configuration alone.
- [ ] Test that `canSpend`, `canPublish` and `canMonetize` remain false for the current project.
- [ ] Document official free-tier limits, account onboarding, published site exposure, and explicit owner permissions.

## Task 3: Handoff and review
- [ ] Update `AGENTS.md` and draft PR, record exact CI run.
- [ ] Update owner gate issue #2 with zero budget and pending Netlify sign-up/permission.
- [ ] Do not deploy or accept account terms.
