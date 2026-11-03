# StackPilot AI — Privacy Inventory and Data-Flow Specification

**Document Date:** 2026-11-03 (Asia/Kolkata)  
**Status:** INTERNAL ENGINEERING SPECIFICATION / PRELAUNCH REVIEW ONLY  
**Branch:** `feature/phase-1-1-recommendation-engine` | **PR:** [#1](https://github.com/hithisisakii09/stackpilot-ai/pull/1) (draft)  
**Policy Baseline:** ₹0 INR monthly spend, zero tracking cookies, zero client-side personal data collection.

---

## 1. Client-Side Data Processing Boundary

StackPilot AI is architected as a pure static site (`output: 'static'`) with zero server-side application runtimes, databases, or API handlers.

### 1.1 Local Browser Tools & Calculators
The application includes seven client-side evaluation tools:
1. **Software Stack Advisor (`/`):** Processes category, team size, and budget choices entirely inside the browser's JavaScript event loop. Selections are discarded on page refresh.
2. **Software Cost Calculator (`/tools/software-cost-calculator/`):** Accepts user-entered tool costs, currency choices, and discount assumptions. Computes totals locally in JavaScript.
3. **CRM Paid-Seat Audit (`/tools/crm-seat-audit/`):** Accepts user-entered seat counts, allocated roles, and monthly fee estimates. Computes vacant seat costs in memory.
4. **CRM Migration Readiness (`/tools/crm-migration-readiness/`):** Accepts user-entered record counts and field mapping statuses. Computes migration risk scores in memory.
5. **Hosting Cutover Gates (`/tools/hosting-cutover-gates/`):** Interactive checklist evaluating DNS, SSL, and rollback preparedness.
6. **Backup Restore Drill (`/tools/backup-restore-drill/`):** Evaluates user-entered RTO/RPO metrics and database sizes.
7. **SEO Audit Scope Planner (`/tools/seo-audit-scope/`):** Calculates crawl credit consumption across sitemaps and subfolders.

### 1.2 Data Transmission Safeguards
- **Zero Form POSTs:** No `<form>` tag contains an external `action`. The CSP enforces `form-action 'self'`.
- **Zero Local/Session Storage:** Client tools do not persist personal data into `localStorage`, `sessionStorage`, or IndexedDB.
- **CSV Data Exports:** All export features (e.g. `uat-cases.csv`, requirements CSV, SEO scope CSV) generate local Data URLs or Blob objects (`text/csv;charset=utf-8`) created via `URL.createObjectURL()`. No file data is uploaded to any server. Formula injection protection is enforced by prefixing any leading `=+-@` characters.

---

## 2. Hosting & Infrastructure Layer (Netlify Free)

While the Astro static client application executes zero tracking, hosting providers process standard HTTP traffic:

### 2.1 CDN Edge & Access Logs
- **Log Collection:** Netlify edge servers process incoming HTTP request metadata (client IP address, user-agent string, requested path, HTTP referrer, timestamp).
- **Purpose:** Security monitoring, DDoS mitigation, and content delivery routing.
- **Access Control:** Server logs are restricted to the authenticated Netlify account holder.

### 2.2 Netlify Web Analytics
- **Mechanism:** Netlify Web Analytics is active at the hosting platform layer. It derives aggregated page-view metrics directly from edge CDN logs.
- **Client Impact:** It does **not** inject client-side tracking scripts, third-party JavaScript tags, or tracking cookies into the delivered HTML.
- **Owner Action:** The owner must verify log retention policies and confirm jurisdiction-specific disclosures (GDPR/ePrivacy/CCPA) prior to public release.

---

## 3. Outbound Link Governance

- **Outbound Destinations:** Outbound links point exclusively to official vendor domains (`hubspot.com`, `semrush.com`, `kinsta.com`, `pipedrive.com`, `ahrefs.com`, `digitalocean.com`).
- **Security Attributes:** All external links enforce `rel="noopener noreferrer"` and `target="_blank"`.
- **Zero Referral Tracking:** In accordance with `scripts/validate.mjs` and `tests/anchor-destination-guards.test.mjs`, outbound URLs contain zero tracking parameters (`utm_*`, `ref`, `affiliate_id`, etc.) and zero unapproved referral redirect chains.
- **Affiliate URLs:** All `affiliateUrl` fields in `src/data/products.json` remain strictly `null`.

---

## 4. Privacy Risk Inventory & Remediation Matrix

| Processing Element | Risk Level | Current Engineering Control | Outstanding Owner Action |
|---|---|---|---|
| Calculator Inputs | Low (Local Only) | Executed in-memory, no server endpoint, no storage persistence. | None. |
| CSV Export Downloads | Low | Client-side Blob creation with formula-injection character escaping. | None. |
| Netlify Edge Server Logs | Low–Medium | Infrastructure-level; no personal identifiers stored in repository. | Owner confirms provider log retention policy. |
| Netlify Web Analytics | Low–Medium | CDN log aggregation; no cookies or client tracking scripts. | Owner approves disclosure copy on `/privacy/`. |
| Outbound Vendor Links | Low | Enforced `noopener noreferrer`, zero query tracking parameters. | None. |
| Contact Information | Medium | Prototype uses placeholder contact notices. | Owner provides real business contact email. |

---

## 5. Prelaunch Verdict
The application architecture adheres to strict privacy-by-design principles: zero cookies, zero client-side tracking, zero data exfiltration, and full local calculation containment. Formal publication requires owner signoff on publisher identity and hosting provider log disclosures.

