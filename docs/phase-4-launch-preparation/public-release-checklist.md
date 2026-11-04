# StackPilot AI — Phase 4 Public Release Checklist

**Document Date:** 2026-11-03 (Asia/Kolkata)  
**Status:** DRAFT PREPARATION FRAMEWORK / NOT AN AUTHORIZATION TO PUBLISH  
**Operating Policy:** ₹0 INR spend, zero delegated authority, fail-closed security.

> [!IMPORTANT]
> This checklist defines the mandatory gates that must be satisfied before any public production release or commercial monetization. An AI agent cannot authorize or check off any owner-only gate. Release remains strictly gated behind explicit human sign-off.

---

## 1. Technical & Infrastructure Gates (Owner-Only)

- [ ] **Exact-SHA Build Identity Verification:**
  - Owner navigates to `/preview-build/` on Netlify Deploy Preview.
  - Verifies exact Git SHA and expected PR match the target release commit.
- [ ] **Incognito Anonymous Access Denial:**
  - Confirm private preview returns HTTP 401 / access denied when accessed without Netlify team session.
- [ ] **Live HTTP Security Header Verification:**
  - Inspect live response headers using Chrome/Firefox DevTools Network tab.
  - Verify `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- [ ] **Netlify Account & Free-Tier Plan Review:**
  - Verify Netlify account remains on Free tier ($0.00).
  - Verify build minutes usage is within 300 minutes/month limit.
  - Verify bandwidth usage is within 100 GB/month limit.
  - Confirm Auto Publishing remains **Locked** until launch hour.
- [ ] **Custom Domain & DNS Setup (When Authorized):**
  - Configure DNS CNAME / ALIAS to Netlify.
  - Confirm TLS/SSL certificate issuance via Let's Encrypt.

---

## 2. Editorial & Research Integrity Gates (Owner-Only)

- [ ] **Primary Source Verification of Software Claims (6/6 Products):**
  - HubSpot CRM: Free tier limits, paid seat pricing, and integration claims verified against official pricing page.
  - Pipedrive: Tier feature matrices, add-on pricing, and free trial terms verified.
  - Ahrefs: Webmaster Tools vs paid plan access verified (note: no affiliate program).
  - Semrush: Pro/Guru pricing and project limits verified against official site.
  - Kinsta: Application/database vs WordPress managed hosting pricing and limits verified.
  - Cloudways: DigitalOcean/AWS compute pricing, support tiers, and add-ons verified.
- [ ] **Editorial Handoff & Research Sign-Off:**
  - Candidate claims transitioned from candidate state to approved state in research ledger.
  - All source access dates refreshed within 30 days of release.

---

## 3. Legal, Privacy & Publisher Disclosure Gates (Owner-Only)

- [ ] **Publisher Legal Entity & Identity:**
  - Final legal publisher name and business entity declared.
  - Official publisher contact email established (e.g. `contact@toolchoicelab.com`).
  - Physical or postal contact address documented if required by jurisdictional regulations.
- [ ] **Privacy Policy & Terms Approval:**
  - Review and finalize privacy policy text in `src/pages/privacy/index.astro`.
  - Approve disclosures regarding Netlify server-side logging and Netlify Web Analytics.
- [ ] **Affiliate & FTC Disclosure Approval:**
  - Review affiliate disclosure in `src/pages/disclosure/index.astro` ensuring full compliance with FTC Guides on Endorsements and Testimonials.
  - Ensure clear statement that editorial matching is never influenced by commissions.

---

## 4. Commercial & Affiliate Account Gates (Owner-Only)

- [ ] **Affiliate Network / Partner Account Setup:**
  - Apply to partner programs independently (Impact, PartnerStack, or in-house).
  - Provide tax identification, PAN / GSTIN (India), and business banking details independently.
- [ ] **Commercial Hosting Eligibility Attestation:**
  - Confirm terms of service compliance with host (Netlify Free permits commercial use).
- [ ] **Affiliate Link Verification & Fail-Closed Guard:**
  - Verify that links are inserted only for approved vendor accounts with valid tracking IDs.
  - Confirm all unapproved or non-partnered products maintain `affiliateUrl: null`.

---

## 5. Production Cutover Sequence (Step-by-Step)

1. Owner verifies all gates 1–4 are signed off.
2. Owner issues explicit instruction to merge PR #1 into `main`.
3. CI runs on `main` branch: validates build, security guards, browser acceptance, and zero-spend constraints.
4. Owner unlocks Auto Publishing or triggers production deployment in Netlify dashboard.
5. Post-deployment smoke check on public custom domain:
   - Check all 25 routes load with HTTP 200.
   - Verify CSP headers on public production domain.
   - Verify robots.txt and sitemap.xml.
   - Verify canonical URLs match production domain.
6. Owner submits sitemap to search engines (Google Search Console, Bing Webmaster Tools).
