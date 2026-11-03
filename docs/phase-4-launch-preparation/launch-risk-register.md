# StackPilot AI — Phase 4 Launch Risk Register

**Document Date:** 2026-11-03 (Asia/Kolkata)  
**Status:** RISK ASSESSMENT & MITIGATION MATRIX / PRELAUNCH PLANNING  
**Operating Policy:** Proactive risk identification; fail-closed business and technical boundaries.

---

## 1. Risk Matrix Overview

| Risk ID | Category | Risk Description | Probability | Impact | Severity | Mitigation Strategy |
| --- | --- | --- | --- | --- | --- | --- |
| **RSK-01** | Commercial | **Affiliate Program Rejection due to Zero Traffic:** Major programs (Semrush, Kinsta) often require an established website with active traffic and history before approving affiliate accounts. | High | Medium | **HIGH** | Launch with `affiliateUrl: null` (editorial-only mode). Establish organic search presence and credible buyer utility before submitting affiliate applications. |
| **RSK-02** | Commercial | **Vendor Has No Affiliate Program:** Ahrefs does not offer a public affiliate program. | 100% (Certain) | Low | **LOW** | Treat as an editorial asset. Neutral coverage builds consumer trust; zero-affiliate inclusion proves non-pay-to-play editorial stance. |
| **RSK-03** | Regulatory / Tax | **India-Specific Tax & Banking KYC:** Receiving international commission payouts in India requires PAN, GSTIN (for export of services above threshold or cross-border intermediary classification), bank LUT / FIRC, and RBI FEMA compliance. | High | High | **HIGH** | Owner-only task. Do not apply for affiliate programs until formal legal entity, bank account, and GST / export remittance documentation are reviewed with a certified chartered accountant. |
| **RSK-04** | Operational | **Vendor Pricing & Feature Drift:** SaaS vendors frequently update plan limits, tier names, and monthly rates, rendering static comparison matrices outdated. | High | Medium | **HIGH** | Implement the Research Claims Ledger with mandatory 30-day review cycles. Add clear "Pricing accurate as of [Date]" footnotes and official pricing links with `rel="noopener noreferrer"`. |
| **RSK-05** | Legal / Brand | **Trademark & Publisher Identity Conflicts:** "ToolChoice" or "StackPilot" may encounter trademark objections or domain registration squatter barriers. | Medium | High | **HIGH** | Perform formal trademark clearance search before registering public domains or filing partner contracts. Keep brand identity flexible as provisional working title. |
| **RSK-06** | Infrastructure | **Accidental Netlify Free Tier Quota Exhaustion:** Excessive continuous deployment builds or unexpected traffic spikes could exceed 300 monthly build minutes or 100 GB bandwidth. | Low | Medium | **MEDIUM** | Auto Publishing remains locked; builds occur on draft PR only. Pure static architecture (~257 KB package) can serve ~1.7 million monthly visits on free tier without exceeding 100 GB. |
| **RSK-07** | Regulatory | **FTC / Consumer Protection Scrutiny:** Comparison sites face strict FTC enforcement regarding undisclosed material connections and deceptive ranking. | Medium | High | **HIGH** | Code-enforced neutrality: recommendation algorithm uses deterministic weighted scoring with zero commission inputs. Clear affiliate disclosure on every page with persistent site-wide policy. |

---

## 2. Deep Dive: Commercial & Regulatory Action Items

### 2.1 India Cross-Border Payout Compliance (RSK-03)
Before the owner connects any affiliate banking or payout mechanism:
1. **Entity Classification:** Determine whether to operate as Sole Proprietorship or Private Limited company.
2. **GST Registration:** Evaluate requirement under Section 24 of CGST Act for cross-border electronic commerce / export of OIDAR services.
3. **Foreign Inward Remittance (FIRC / FIRS):** Ensure authorized dealer (AD) bank automatically generates FIRCs for international wire transfers or PayPal/Payoneer/Stripe transfers to satisfy RBI compliance.

### 2.2 Cold-Start Editorial Phase (RSK-01 & RSK-02)
- **Phase 4 Launch is Phase 4.0 "Editorial Launch":**
  - Launch site as 100% free, impartial buyer research tool.
  - Zero affiliate links (`affiliateUrl = null`).
  - Focus exclusively on organic search ranking, site performance, and user satisfaction.
- **Phase 4.1 "Commercialization" (Future Phase):**
  - Only after achieving sustained organic visitors (> 1,000 monthly unique visitors) apply to vendor affiliate programs with live site URL and analytics proof.
