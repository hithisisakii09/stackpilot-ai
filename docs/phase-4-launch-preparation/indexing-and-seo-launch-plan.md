# StackPilot AI — Phase 4 Indexing & SEO Launch Plan

**Document Date:** 2026-11-03 (Asia/Kolkata)  
**Status:** DRAFT PREPARATION / NOT ACTIVE / REQUIRES OWNER RELEASE AUTHORIZATION  
**Operating Policy:** ₹0 INR spend, fail-closed prelaunch indexing blocks currently active.

> [!WARNING]
> All search indexing is currently blocked across every route via `<meta name="robots" content="noindex, nofollow">` and `public/robots.txt` (`Disallow: /`). **Do NOT remove noindex guards** or submit to search engines until explicit owner release sign-off has been received.

---

## 1. Prelaunch Baseline (Current State)

| Component | Current Prelaunch Setting | Target Post-Launch Setting |
| --- | --- | --- |
| `public/robots.txt` | `User-agent: *`<br>`Disallow: /` | `User-agent: *`<br>`Allow: /`<br>`Sitemap: https://[DOMAIN]/sitemap-index.xml` |
| `<meta name="robots">` | `content="noindex, nofollow"` on all 25 pages | `content="index, follow"` on public editorial pages |
| Canonical URLs | Relative or absent | Absolute canonical pointing to custom production domain |
| Netlify Preview | Private preview access gated behind team auth | Public production deployment on custom domain |

---

## 2. Technical SEO Architecture (Static Astro)

### 2.1 Sitemap Generation
- Utilize `@astrojs/sitemap` or native Astro static route manifest generation to emit standard XML sitemaps.
- Ensure only canonical 200 OK routes are listed (exclude 404, internal preview identity, and non-canonical pages).
- Configure `changefreq` and `priority` based on content type:
  - Homepage / Category Hubs: `weekly`, `0.9`
  - Vendor Comparison & Profiles: `monthly`, `0.8`
  - Buyer Guides & Calculators: `monthly`, `0.7`
  - Trust & Legal Pages: `monthly`, `0.4`

### 2.2 Structured Data (Schema.org)
- **Publisher Organization:**
  ```json
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "ToolChoice Lab",
    "url": "https://[DOMAIN]",
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "contact@[DOMAIN]",
      "contactType": "editorial"
    }
  }
  ```
- **Software Profiles:** `SoftwareApplication` with `operatingSystem`, `applicationCategory`, and neutral pricing tiers.
- **Comparison Pages:** `ItemPage` or `CollectionPage` with `BreadcrumbList`.

### 2.3 Meta Tags & Social Cards
- OpenGraph (`og:title`, `og:description`, `og:type`, `og:url`, `og:image`).
- Twitter Cards (`twitter:card`, `twitter:title`, `twitter:description`).
- Clean standard `<title>` template: `{Page Title} — ToolChoice Lab`.

---

## 3. Search Engine Submission Sequence (Owner-Only)

1. **Custom Domain Verification:**
   - Add domain to Google Search Console (GSC) via DNS TXT record.
   - Add domain to Bing Webmaster Tools (can import from GSC or use DNS verification).
2. **Sitemap Submission:**
   - Submit `https://[DOMAIN]/sitemap-index.xml` in GSC and Bing.
3. **Robots.txt Cutover Verification:**
   - Use GSC Robots Testing Tool or live fetch to confirm `Allow: /` is served with HTTP 200.
4. **Initial URL Inspection:**
   - Inspect homepage and primary comparison pages using GSC "URL Inspection" tool.
   - Confirm mobile usability and correct rendering without blocking CSS/JS assets.

---

## 4. Crawl Budget & Anti-Scraping Safeguards

- Astro produces 100% static HTML with zero client-side hydration for content pages, minimizing crawl rendering overhead.
- Total asset count remains lightweight (~257 KB compressed), enabling rapid indexing by search bots.
- Optional rate limiting and bot management can be configured via Cloudflare DNS if proxy mode is enabled in the future.
