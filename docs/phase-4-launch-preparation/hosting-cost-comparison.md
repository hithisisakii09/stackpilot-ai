# StackPilot AI — Phase 4 Hosting Cost & Platform Comparison

**Document Date:** 2026-11-03 (Asia/Kolkata)  
**Status:** ARCHITECTURAL & OPERATING ANALYSIS / ₹0 INR BUDGET COMPLIANCE  
**Operating Policy:** ₹0 INR monthly budget, ₹0 delegated spend, strictly zero-cost hosting candidates.

---

## 1. Executive Summary

StackPilot AI is designed as a **pure static site (SSG)** built with Astro. Because all pages are pre-compiled HTML, CSS, and minimal vanilla JavaScript, hosting requirements are exclusively for static asset delivery via CDN.

Under the binding operating policy, hosting expenditure must remain **₹0.00 / month**. This document evaluates zero-cost static hosting options with explicit verification of commercial licensing terms.

---

## 2. Platform Comparison Matrix

| Feature / Limit | Netlify Free (Current Primary) | Cloudflare Pages Free (Fallback) | Vercel Hobby (Prohibited) |
| --- | --- | --- | --- |
| **Monthly Cost** | **$0.00 / ₹0** | **$0.00 / ₹0** | $0.00 (Non-commercial only) |
| **Commercial Terms** | **Permitted** (Free tier allows commercial sites) | **Permitted** (Commercial use permitted on Free tier) | **PROHIBITED** (Terms Section 2.1: personal / non-commercial only) |
| **Monthly Bandwidth** | 100 GB / month | **Unlimited** (fair use) | 100 GB / month |
| **Monthly Build Minutes** | 300 minutes / month | 500 builds / month (no minute meter) | 6,000 build minutes / month |
| **Custom Domains** | Unlimited with free Let's Encrypt SSL | Unlimited with free Cloudflare SSL | Prohibited for commercial projects |
| **Build Artifact Limits** | 250 MB per deploy | 25 MB max individual file size | Standard static limits |
| **Current Repository Status** | **Connected & Active** (Deploy Preview 1) | Candidate only (not connected) | **DELETED** by owner on 2026-10-31 |

> [!CAUTION]
> **Vercel Hobby Prohibition:** Vercel Hobby explicitly forbids commercial, affiliate, and business usage in its Terms of Service. Furthermore, the owner permanently deleted the historical Vercel project on 2026-10-31. Under no circumstances should Vercel be reconnected, tested, or referenced as a candidate host.

---

## 3. Netlify Free Tier Runway Analysis

### 3.1 Bandwidth Projections
- Total emitted site package size: **~257 KB** (HTML, CSS, SVGs across all 25 routes).
- Average page weight per visitor session (approx. 4 page views): **~60 KB** (due to aggressive browser caching of CSS and shared assets).
- 100 GB monthly bandwidth allowance translates to:
  $$\frac{100 \times 1,024 \times 1,024 \text{ KB}}{60 \text{ KB/session}} \approx 1,747,626 \text{ visitor sessions / month}$$
- **Conclusion:** Bandwidth exhaustion is virtually impossible during initial and growth stages under static caching.

### 3.2 Build Minutes Consumption
- Astro compilation duration: **~2.28s to 3.76s** locally; **~3.5s to 8.0s** in CI/CD container.
- Netlify average build execution time: **~35 seconds** (including container boot and dependency caching).
- 300 minutes allowance translates to:
  $$\frac{300 \times 60 \text{ seconds}}{35 \text{ seconds/build}} \approx 514 \text{ builds / month} \approx 17 \text{ deploys / day}$$
- **Current Observation:** The owner's billing snapshot confirmed 285 of 300 build credits remaining with $0.00 bill.
- **Safety Rule:** Production Auto Publishing must remain **Locked** to avoid burning build minutes on routine branch pushes.

---

## 4. Fallback Architecture: Cloudflare Pages Free

Should Netlify terms or limits ever change:
1. **Repository Compatibility:** The static output in `dist/` can be deployed directly to Cloudflare Pages with zero code modifications.
2. **Configuration:** Requires `npm run build` and publish directory `dist`.
3. **Benefits:** Unlimited bandwidth and unmetered build durations (500 deploys/month limit).
4. **Current Recommendation:** Maintain Netlify Free as primary to leverage existing private preview integration; keep Cloudflare Pages documented as zero-cost fallback.
