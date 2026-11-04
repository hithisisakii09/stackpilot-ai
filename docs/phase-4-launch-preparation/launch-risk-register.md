# StackPilot AI — Phase 4 Launch Risk Register

**Document date:** 2026-11-03 (Asia/Kolkata)  
**Status:** Prelaunch risk assessment; preparation only  
**Operating policy:** ₹0 INR monthly budget, ₹0 delegated spend, fail-closed owner approvals

> Probabilities below are qualitative planning assessments, not measured statistics. Vendor terms, legal obligations, and account-specific hosting limits must be re-verified before action. This register is not legal, tax, or financial advice.

---

## 1. Risk matrix

| Risk ID | Category | Risk description | Current assessment | Impact | Mitigation |
| --- | --- | --- | --- | --- | --- |
| **RSK-01** | Commercial | Affiliate program may reject an application or may not accept a new publisher | **Unknown until each program's current official eligibility terms are reviewed** | Medium | Keep `affiliateUrl: null`. Verify each program's official publisher eligibility, traffic criteria, geography, content rules, and payout terms. Do not invent a minimum traffic threshold or apply without separate owner approval. |
| **RSK-02** | Commercial | Vendor may not have a public affiliate program | Ahrefs' official public statement dated June 12, 2023 says its public affiliate program was discontinued and that it had no plans to relaunch at that time; re-check before making a current-tense claim | Low | Cover Ahrefs editorially without implying a commission relationship. Do not use historic referral links or commission figures. |
| **RSK-03** | Regulatory / Tax | International commission receipts may create India-specific tax, GST, contractual, and foreign-remittance obligations | **Requires professional assessment; obligations depend on the actual arrangement** | High | Owner-only: before applying or accepting payouts, have a qualified Indian CA and the authorized-dealer bank review the contracting parties, service classification, place-of-supply/export criteria, income-tax treatment, GST registration/returns, FEMA, and the bank's remittance documentation. Do not assume PAN, GSTIN, LUT, FIRC/e-FIRC, or any particular entity type is universally mandatory. |
| **RSK-04** | Operational | Vendor pricing, plan limits, product features, and terms can drift after research is published | High | High | Maintain claim-level primary-source URLs, exact plan scope, currency/region, checked date, evidence excerpt, reviewer, and next review date. Use a 30-day internal re-check target for volatile pricing/limits; this is an editorial policy, not a vendor guarantee. Mark stale claims for review instead of silently reusing them. |
| **RSK-05** | Legal / Brand | Working brand or domain may conflict with an existing trademark or publisher identity | Medium; clearance not completed | High | Keep StackPilot AI / ToolChoice Lab provisional. Owner/legal reviewer performs clearance before public brand use, domain registration, partner applications, or contracts. Do not purchase a domain under the current ₹0 budget. |
| **RSK-06** | Infrastructure | Netlify usage limits or account plan changes could pause the preview or create pressure to upgrade | Medium; current account plan version and meter require owner verification | Medium | Keep paid upgrades, add-on credits, and auto-recharge disabled. Distinguish current credit-based Netlify Free (300 credits/month; hard limit) from eligible legacy plans (historically 100 GB and 300 build minutes). Current credit-based Deploy Previews and branch deploys are 0 credits; production deploys, bandwidth, and requests consume credits. Do not use the old 100 GB / 300-minute runway estimate unless the account dashboard confirms a legacy plan. |
| **RSK-07** | Regulatory / Editorial | Undisclosed material connections, misleading comparisons, or unsupported ranking claims may breach consumer-protection or advertising rules | High | High | Keep affiliate links inactive. Disclose any future material connection clearly and near the recommendation. Maintain neutral criteria and claim-level sources. Add tests proving commission values do not influence recommendation scoring; do not claim this is code-enforced until the test and code review evidence exists. Obtain jurisdiction-specific legal review before commercialization. |

## 2. Commercial and regulatory action items

### 2.1 Affiliate program eligibility

- Review each vendor's official program page and current agreement separately.
- Record application eligibility, geographic restrictions, accepted publisher types, traffic requirements (if any), content restrictions, attribution, commission, payout minimums, termination, and disclosure rules.
- Treat third-party affiliate directories and old blog posts as leads only, never as authoritative evidence.
- Do not infer that a program requires 1,000 monthly visitors or any other threshold unless the vendor's current official terms state it.
- Do not apply, accept an invitation, sign an agreement, create tracking links, or activate affiliate links without separate explicit owner approval.

### 2.2 India tax and foreign-remittance review

Before any affiliate application that could lead to a payout, the owner should obtain professional advice on the actual contract and payment flow, including:

1. Whether the publisher operates as an individual, sole proprietor, or another legal form and what registrations are appropriate.
2. Income-tax reporting and any applicable withholding or tax documentation.
3. Whether the service qualifies as an export of services under the applicable GST rules, whether any registration or LUT is required, and whether an intermediary classification changes the result.
4. FEMA and authorized-dealer-bank requirements for the specific foreign inward remittance channel.
5. Which bank advice, remittance certificate, invoice, or other evidence the bank actually issues or requires.

No specific GSTIN, LUT, FIRC/e-FIRC, company incorporation, or banking requirement is asserted by this document. The owner must rely on a qualified CA and the bank for the actual facts and current law.

### 2.3 Cold-start editorial operating mode

The proposed first public release, if separately approved, is an editorial-only release:

- No affiliate links or tracking identifiers (`affiliateUrl: null`).
- No paid placements or commission-weighted ranking.
- Publish only claims that have completed human editorial review and have current primary-source evidence.
- State the date and scope of volatile pricing/feature claims.
- Keep analytics and telemetry subject to the separate privacy and consent decision.
- Do not treat a public launch as approval to commercialize.

There is no automatic visitor-count threshold for moving to commercialization. Any later affiliate application or activation requires a separate owner decision and vendor-specific eligibility review.

## 3. Source notes

- [Ahrefs official statement on its affiliate program (June 12, 2023)](https://ahrefs.com/blog/ahrefs-affiliate-program/). The statement says the public program was discontinued and that Ahrefs had no plans to relaunch it at that time. Re-check the official source before presenting the status as current.
- [Netlify current pricing](https://www.netlify.com/pricing/).
- [Netlify credit-based plan documentation](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/).
- [Netlify explanation of credit meters](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/).

---

**Decision:** Maintain editorial-only, no-affiliate mode. Do not submit affiliate applications, activate links, accept payouts, or make legal/tax assumptions until the owner has completed the relevant professional review and separately approved the action.
