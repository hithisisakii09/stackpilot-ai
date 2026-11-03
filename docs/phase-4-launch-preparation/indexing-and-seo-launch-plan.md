# StackPilot AI — Phase 4 Indexing & SEO Launch Plan

**Document date:** 2026-11-03 (Asia/Kolkata)  
**Status:** Draft preparation only; indexing is not active  
**Operating policy:** ₹0 INR spend; no public release or indexing change without explicit owner authorization

> [!WARNING]
> Keep the prelaunch indexing guards in place. Do not remove `noindex`, change `robots.txt`, publish a public production site, or submit URLs to search engines until the owner separately authorizes the release. A sitemap or SEO plan is not launch approval.

---

## 1. Prelaunch baseline

| Component | Current prelaunch setting | Target after owner-approved launch |
| --- | --- | --- |
| `public/robots.txt` | `User-agent: *` and `Disallow: /` | Permit crawling of intended public pages and include the verified sitemap URL |
| `<meta name="robots">` | Reported as `noindex, nofollow` across all 25 generated pages; verify against the exact release SHA | Remove `noindex` only from pages approved for indexing |
| Canonical URLs | Relative or absent in the current baseline | Absolute canonical URLs on the owner-approved production domain |
| Netlify Deploy Preview | Private preview; current-SHA authenticated and anonymous-access checks remain owner-verification tasks | Keep preview access separate from public production |
| Sitemap | No production-domain sitemap submission is authorized | Publish only canonical, public, HTTP 200 URLs after the domain and release are approved |

**Important crawler distinction:** `robots.txt: Disallow: /` prevents crawlers from fetching pages, so a crawler may not see an HTML `noindex` directive on those pages. A robots.txt rule is not authentication and does not guarantee that a URL will never appear in search results. Keep the preview protected by provider access controls. If a future public site must remain temporarily noindex, crawlers must be allowed to fetch the page to read its `noindex` directive; do not combine a crawl block with an expectation that the meta directive will be read.

## 2. Technical SEO architecture

### 2.1 Sitemap generation

After the owner approves a production domain:

- Use `@astrojs/sitemap` or a verified native Astro static route manifest to generate a sitemap.
- Use absolute production URLs only; never publish preview hostnames, placeholders, 404s, redirects, internal routes, or duplicate/non-canonical URLs.
- Include only pages that are intended to be public and indexable.
- Use `lastmod` only when it reflects a real, significant content update and can be maintained accurately.
- Do not assign artificial freshness dates or imply that sitemap metadata improves rankings. Google explicitly ignores `<priority>` and `<changefreq>`; sitemap submission is a discovery hint, not an indexing guarantee.

No sitemap is to be submitted while the prelaunch guard is active.

### 2.2 Structured data (Schema.org)

Structured data is a future implementation checklist, not permission to publish provisional identity information.

- **Publisher Organization:** emit only after the publisher name, production domain, and editorial contact address are owner-confirmed and any required brand/legal review is complete. `ToolChoice Lab` remains a working brand until cleared. Do not emit placeholder email addresses or placeholder domains.
- **Software profiles:** use `SoftwareApplication` only where the page content supports the properties. Product names, operating systems, categories, plan information, and prices must be sourced and dated. Do not invent ratings, reviews, availability, or pricing.
- **Comparison pages:** `CollectionPage` or `ItemPage` and `BreadcrumbList` may be used where they accurately describe the visible page. Structured data must match user-visible content and does not guarantee a rich result.

Example shape only; do not publish with placeholders:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "[OWNER-APPROVED PUBLISHER NAME]",
  "url": "https://[OWNER-APPROVED DOMAIN]",
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "[VERIFIED EDITORIAL CONTACT]",
    "contactType": "editorial"
  }
}
```

### 2.3 Page metadata and social cards

Once a production identity and domain are approved:

- Use accurate page-specific `<title>` and meta descriptions.
- Add Open Graph fields (`og:title`, `og:description`, `og:type`, `og:url`, `og:image`) and Twitter/X card metadata.
- Use local, licensed, optimized social-card assets. Do not add third-party tracking pixels or remote assets without a separate privacy/security review.
- Ensure `og:url`, canonical URL, sitemap URL, and internal links all agree on the approved canonical domain.

## 3. Search-engine submission sequence — owner-only

This sequence must not be run by an agent or automated workflow without explicit owner approval.

1. **Identity and domain:** complete brand clearance and owner decision on the publisher identity; obtain and verify a domain only if separately approved and funded. The current ₹0 budget does not include domain registration or renewal.
2. **Production access:** confirm the production site is intentionally public, private preview access remains separate, and the owner has approved the exact release SHA.
3. **Indexing cutover:** review every route, remove `noindex` only from approved public editorial pages, and update `robots.txt` to allow crawling of those pages.
4. **Canonical and sitemap verification:** fetch the live files and confirm absolute canonical URLs, HTTP 200 responses, no preview URLs, no duplicates, and correct `lastmod` values.
5. **Search Console:** owner verifies the domain in Google Search Console and Bing Webmaster Tools using the provider's current verification process.
6. **Sitemap submission:** submit the verified production sitemap only after the above checks and explicit release authorization.
7. **URL inspection:** inspect the homepage and selected core pages; record crawl, rendering, canonical, and indexing observations without promising ranking or indexing dates.

## 4. Crawl, privacy, and anti-abuse safeguards

- The current CI artifact was reported as 25 routes, 40 files, and 257,462 bytes. This is a build-artifact measurement, not a measured compressed transfer size or a guarantee of crawl speed.
- Static rendering can reduce reliance on client-side rendering, but indexing and ranking depend on many factors outside the application.
- Do not add analytics, tag managers, third-party pixels, or user profiling as part of SEO preparation. Any telemetry requires a separate privacy review and owner approval.
- Optional CDN proxying, rate limits, or bot controls are not part of this phase's authorized changes. Evaluate provider terms, plan limits, and privacy effects before any future configuration.
- Maintain a documented route inventory and review content quality, claim evidence, disclosures, and canonical consistency before requesting indexing.

## 5. Release gates

Indexing remains **NO-GO** until all of the following are recorded:

- Owner-approved publisher identity and domain.
- Owner approval of the exact public release SHA and public visibility.
- Human editorial review of all claims intended for publication.
- Legal/privacy review of the public pages and disclosures.
- Authenticated preview and anonymous-access verification on the exact candidate SHA.
- Confirmed robots, noindex, canonical, sitemap, and structured-data behavior.
- Separate explicit owner authorization to change indexing controls and submit to search engines.

## 6. Sources

- [Google Search Central — Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google Search Console — Sitemap report and troubleshooting](https://support.google.com/webmasters/answer/7451001)

---

**Decision:** Keep the prelaunch indexing guard active. Prepare technical SEO offline only. Do not publish a sitemap, remove noindex, change robots.txt, verify a domain, or submit URLs until the owner explicitly authorizes those actions.
