# StackPilot AI — Phase 3 Quality, Security, Performance and Trust Audit

**Audit Date:** 2026-11-03 (Asia/Kolkata)  
**Status:** PRIVATE ENGINEERING AUDIT / PRELAUNCH ONLY / RELEASE NO-GO  
**Active Development Branch:** `feature/phase-1-1-recommendation-engine`  
**Draft Pull Request:** [#1](https://github.com/hithisisakii09/stackpilot-ai/pull/1) (open, draft, unmerged)  
**Operating Policy:** ₹0 INR monthly budget, ₹0 delegated spend, Netlify Free ($0.00) hosting candidate, production locked, indexing disabled.

---

## 1. Technical Security Audit

### 1.1 Content Security Policy & Response Headers
The static hosting configuration in `public/_headers` enforces a strict, defense-in-depth CSP applied to all routes (`/*`):
```http
Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'; object-src 'none'; base-uri 'self'; worker-src 'none'; media-src 'self'; manifest-src 'self'; upgrade-insecure-requests
X-Robots-Tag: noindex, nofollow, noarchive
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-Frame-Options: DENY
Permissions-Policy: camera=(), microphone=(), geolocation=()
```
- **Execution Boundary:** External script injection, remote iframe framing (`frame-ancestors 'none'`), and unauthorized form POST targets (`form-action 'self'`) are disallowed.
- **Hosted vs. Source Verification:** The above configuration is verified in local source files and validated at build-time by `scripts/release-preflight.mjs`. **Source configuration does not prove live network behavior.** Actual HTTP response headers must be independently verified by the owner on the live Netlify preview using browser DevTools.

### 1.2 Robots, Noindex & Crawl Prevention
- **`public/robots.txt`:** Fully restricts crawlers (`User-agent: *`, `Disallow: /`).
- **HTML Meta Tags:** All 25 emitted static pages contain `<meta name="robots" content="noindex, nofollow">`.
- **Prelaunch Protection Notice:** Noindex prevents search engine indexation but is **not** an access control or authentication layer. Netlify project visitor visibility must remain set to **Private** in the Netlify admin dashboard.

### 1.3 External Resources, Data Leakage & Links
- **Resource Audits:** `scripts/release-preflight.mjs` scans all 25 emitted HTML routes and emitted CSS for external imports, protocol-relative URLs, background image fetches, and entity-encoded URLs. Zero third-party asset calls exist.
- **Link Hygiene:** All outbound links to vendor domains (e.g. `hubspot.com`, `semrush.com`, `kinsta.com`, `pipedrive.com`, `ahrefs.com`, `digitalocean.com`) enforce `rel="noopener noreferrer"` and `target="_blank"`. No affiliate tracking query parameters or referral tags are present.
- **Input Sanitization & Output Escaping:** All calculators and worksheets (cost calculator, CRM seat audit, hosting hidden costs, SEO audit scope) run entirely client-side. Formula-injection risks in CSV exports are mitigated by escaping formula trigger characters (`=`, `+`, `-`, `@`).

### 1.4 Dependency Security
- Astro dependency is defined as `"astro": "^7.4.4"` in `package.json` (locked to `7.4.4` in committed `package-lock.json`, and resolving `7.4.5` in GitHub Actions CI runners).
- In GitHub Actions CI, `npm audit --omit=dev --audit-level=high` reports **0 high or critical vulnerabilities** in production dependencies.
- A full development-dependency audit on the locked graph similarly reports **0 vulnerabilities**.

---

## 2. Full Application QA & Route Coverage

All 25 emitted static routes were audited across desktop and mobile form factors:

| Route Path | Category / Purpose | <h1> Heading | Client Tool / Calculator | Mobile Layout (320px–390px) |
|---|---|---|---|---|
| `/` | Homepage & Explorer | Find your software stack | 3-factor category matcher | Single-column, zero overflow |
| `/compare/` | Category Comparison | Compare agency software | Alphabetical candidate tables | Horizontal scroll table container |
| `/software/hubspot/` | Profile | HubSpot | Profile summary & evidence leads | Responsive card layout |
| `/software/pipedrive/` | Profile | Pipedrive | Profile summary & evidence leads | Responsive card layout |
| `/software/semrush/` | Profile | Semrush | Profile summary & evidence leads | Responsive card layout |
| `/software/ahrefs/` | Profile | Ahrefs | Profile summary & evidence leads | Responsive card layout |
| `/software/kinsta/` | Profile | Kinsta | Profile summary & evidence leads | Responsive card layout |
| `/software/cloudways/` | Profile | Cloudways | Profile summary & evidence leads | Responsive card layout |
| `/tools/requirements-checklist/` | Buyer Tool | Agency software requirements | Offline checklist & CSV export | Stacked form fields |
| `/tools/software-cost-calculator/` | Calculator | Software cost calculator | Local multi-tool cost estimator | Stacked input fields |
| `/tools/crm-seat-audit/` | Audit Tool | CRM paid-seat audit | Vacant seat & license estimator | Grid collapses to 1fr |
| `/tools/crm-migration-readiness/` | Migration Tool | CRM migration readiness | Data object mapping checklist | Collapsible panels |
| `/tools/hosting-cutover-gates/` | Decision Tool | Hosting cutover gates | Rollback & cutover criteria | Stacked check items |
| `/tools/backup-restore-drill/` | Resilience Tool | Backup restore drill | RTO/RPO recovery time estimator | Stacked input fields |
| `/tools/hosting-hidden-costs/` | Cost Tool | Hosting hidden-cost worksheet | Bandwidth/overage calculator | Grid collapses to 1fr |
| `/tools/seo-audit-scope/` | Scope Tool | SEO audit scope planner | Page cap & crawl budget planner | Grid collapses to 1fr |
| `/tools/private-uat-worksheet/` | Inspection Tool | Private preview UAT worksheet | Offline test recording sheet | Stacked inputs |
| `/guides/saas-total-cost-of-ownership/` | Buyer Guide | SaaS total cost of ownership | Worked example & formulas | Responsive reading width |
| `/guides/crm-migration-checklist/` | Migration Guide | CRM migration checklist | Step-by-step migration guide | Responsive reading width |
| `/guides/hosting-migration-checklist/` | Migration Guide | Hosting migration checklist | Pre-cutover runbook | Responsive reading width |
| `/research/` | Workbench | Research evidence ledger | Candidate leads inspector | Responsive card layout |
| `/preview-build/` | Identity | Preview build identity | Displays deployed commit SHA | Responsive panel |
| `/methodology/` | Disclosure | Prelaunch methodology | Explains unverified matching | Responsive text |
| `/disclosure/` | Disclosure | Affiliate disclosure | States no active affiliate links | Notice callout |
| `/privacy/` | Privacy Notice | Privacy notes | Details Netlify CDN logging | Notice callout |

- **Automated Accessibility (WCAG 2.1 AA):** All 25 routes pass automated axe-core scans in Chromium browser sweeps (`scripts/browser-acceptance.mjs`) testing rulesets `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`. Each page includes a single `<h1>` element, semantic `<main>`, `<nav>`, `<header>`, and `<footer>` regions, and accessible color contrast. **Automated accessibility testing covers automated rules only; manual mobile hardware and screen-reader testing remains a separate human gate.**
- **Horizontal Overflow:** All pages apply `box-sizing: border-box` and mobile-breakpoint media queries (`@media (max-width: 600px)`–`700px`) collapsing grids to `1fr`. Horizontal scroll width is asserted to remain $\le 395\text{px}$ on standard 390px mobile viewports.

---

## 3. Performance & Maintainability Review

- **Total Static Build Weight:** 257,462 bytes (under Linux LF) / 257,478 bytes (under Windows CRLF) across 40 files in `dist/`.
- **Largest HTML Document:** `index.html` at 14.5 KB.
- **Static Assets:** 10 bundled JavaScript chunks (all client-side calculators combined total < 60 KB).
- **Measured Build Timing:** Full static compilation of all 25 pages completes in **2.28s–3.76s** in local builds and ~3.5s in CI runners.
- **Measured Local Preview Response:** Headless HTTP responses under `astro preview` average **< 45ms** per static page route.
- **External Network Requests:** 0 external CSS, 0 Google Fonts, 0 tracking scripts, 0 third-party CDNs.
- **Maintainability & DRY:** Common data schemas and validation logic reside in `src/lib/` and are shared between client Astro pages and automated test scripts.

---

## 4. Technical Preflight Status & Automated Results

1. **Node Unit & Contract Tests:** 431 passed out of 431 (`node --test tests/*.test.mjs`).
2. **Catalog Integrity (`npm run check:data`):** Validated 6 products, 6 source leads, 6 partner candidate records, and 6 unapproved vendor statements.
3. **Static Build Smoke Test (`node scripts/check-build.mjs`):** Confirmed all 25 pages exist, are non-indexed, and bear the StackPilot AI brand identity.
4. **Release Preflight (`node scripts/release-preflight.mjs`):** PASS (25 routes scanned, 226 internal links verified, 10 static assets verified).
5. **Operating Policy & Operations Report:** Fail-closed defaults confirmed (`canPublish: false`, `canMonetize: false`, `canSpend: false`).
6. **Anonymous Preview Canary:** Automated CI probe of two fixed routes (`/` and `/preview-build/`) returned HTTP 401. This verifies that Netlify visitor authentication is engaged; it is **not** an exhaustive access-control audit.

---

## 5. Owner-Only UAT Packet (Living Checklist)

To verify the private deployment, the owner must perform the following non-sensitive checks:

### Step 1: Netlify Build Identity Match
1. Sign in to your Netlify account in your browser.
2. Open the authenticated private preview at:  
   👉 `https://deploy-preview-1--inspiring-chaja-cfb85f.netlify.app/preview-build/`
3. Verify that the displayed **Commit SHA** matches the latest commit on PR #1.

### Step 2: Anonymous Access Denial
1. Open a new private/incognito browser window (where you are **not** logged into Netlify).
2. Attempt to open:  
   `https://deploy-preview-1--inspiring-chaja-cfb85f.netlify.app/`
3. Verify that Netlify denies access (prompts for login or returns HTTP 401/404) and does not publicly display the application content.

### Step 3: Live HTTP Security Headers
1. In your authenticated browser window, open DevTools $\rightarrow$ Network tab.
2. Reload `https://deploy-preview-1--inspiring-chaja-cfb85f.netlify.app/`.
3. Check the response headers of the document:
   - `X-Robots-Tag: noindex, nofollow, noarchive`
   - `Content-Security-Policy` present with `default-src 'none'`
   - `X-Content-Type-Options: nosniff`

### Step 4: Netlify Account & Billing Verification
1. Navigate to **Netlify Admin $\rightarrow$ Site configuration $\rightarrow$ Access & security $\rightarrow$ Visitor access**.
2. Confirm that site visibility is set to **Private**.
3. Under **Build & deploy**, confirm **Auto publishing** is **Locked**.
4. Check **Billing / Usage**: confirm plan is **Free ($0.00)** with sufficient build credits remaining and no unexpected charges or add-ons.

---

## 6. Editorial & Legal Handoff

### 6.1 Vendor Claim Status (0 of 6 Approved)
All six vendor feature and limitation claims in `src/data/research-claims.json` remain unapproved candidates:
- **HubSpot (`hubspot-doc-claim-1`):** CRM record export permissions and association limits. Requires human reviewer verification against specific Sales Hub plans.
- **Pipedrive (`pipedrive-doc-claim-1`):** Spreadsheet bulk import permissions and format limits. Requires human reviewer verification.
- **Ahrefs (`ahrefs-doc-claim-1`):** Site Audit crawl credit expenditure on internal 200 vs redirects. Requires verification against active plan quotas.
- **Semrush (`semrush-doc-claim-1`):** Configurable page limits and crawl scope restrictions. Requires verification against current toolkit tiers.
- **Kinsta (`kinsta-doc-claim-1`):** WordPress hosting plan usage allowances and overage rates. Requires verification.
- **Cloudways (`cloudways-doc-claim-1`):** Separate off-site backup charges for Flexible vs included Autonomous backups. Requires verification.

### 6.2 Partner Program Discovery & Eligibility Gaps
- **Ahrefs:** No public self-serve affiliate program found. Marked as a partner discovery gap.
- **HubSpot / Cloudways:** Payout eligibility for Indian resident operators must be confirmed directly with program terms prior to any application.
- **Kinsta / Semrush:** Minimum traffic and audience depth requirements must be met before application.

### 6.3 Publisher Legal & Privacy Tasks
- Confirm formal publisher identity and public contact email.
- Review Netlify Web Analytics CDN log disclosure on the privacy page before any public release.

---

## 7. Phase 3 Verdict

- **ENGINEERING READINESS: PASSED (GREEN)**  
  All 25 static routes, client tools, security headers, preflight checks, and 431 automated tests pass.
- **PUBLIC LAUNCH & MONETIZATION: STRICT NO-GO**  
  Public production launch, search indexing, domain changes, and affiliate program applications remain strictly blocked pending owner review and explicit authorization.
