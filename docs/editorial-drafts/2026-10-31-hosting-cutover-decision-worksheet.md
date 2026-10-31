# Kinsta vs Cloudways — hosting cutover and cost decision worksheet
**StackPilot AI | PRIVATE EDITORIAL DRAFT | 2026-10-31**
**Not a verified review, tested benchmark, price quote, product endorsement, or public article.**

## Decision to make
A host comparison is not meaningful until the reader specifies a workload and the *exact* product being compared. Kinsta's WordPress hosting and Cloudways' Flexible/Autonomous offerings have different configuration and billing concepts. This worksheet is a repeatable buying and migration checklist, not a winner ranking.

### 1. Specify a comparable workload before collecting quotations
- Application type and WordPress/plugin requirements (do not assume every host supports the same stack).
- Expected typical and peak visits, bandwidth, origin requests, storage, geographic region and CDN use.
- Number of sites/environments, staging, database and email/DNS dependencies.
- Recovery point objective (RPO), recovery time objective (RTO), backups and retention.
- Permissions, administrative access, escalation and any contractual/compliance constraints.
- Currency, taxes, renewal term, billing minimums, overages and cancellation/egress cost.

### 2. Provider-source questions (candidate statements only)
| Topic | Kinsta source lead | Cloudways source lead | Verification needed |
| --- | --- | --- | --- |
| Usage measurement | WordPress plans may use visits or server bandwidth depending on plan. | Verify Flexible versus Autonomous and the precise applicable allowance. | Exact product/edition, metric definitions, usage dashboards, written overage policy |
| Overage risk | Kinsta's WordPress hosting documentation discusses charges for exceeding some allocations. | Do not substitute Flexible cloud resource billing for Autonomous terms. | Specific threshold, notices, taxes, rate and effect on service |
| Off-site backups | Confirm backup inclusion and retention against the chosen plan. | Vendor documents separately billed off-site storage for Flexible, with different terms for Autonomous. | Storage units, retention, restore and download fees, chosen product family |
| Restore and rollback | No independent test performed. | No independent test performed. | Permissioned staged restore and measured recovery, or label Not tested |
| Support and geographic fit | Unknown without plan and region. | Unknown without plan and region. | SLA/support terms, region and escalation |

A first-party source documents what a vendor says; it is not proof of an observed outcome.

### 3. Controlled migration rehearsal (no production DNS change)
1. Create a source inventory including registrar, DNS zone, MX/SPF/DKIM/DMARC, certificates, secrets, API callbacks, scheduled jobs and rollback contacts.
2. Obtain a verified, restorable backup and separate configuration export. Never upload credentials, customer records or payment details to StackPilot.
3. Restore to a permitted staging environment **only** if an authorized environment is already available within the ₹0 policy; otherwise mark Not tested.
4. Test application paths, session/cookie behavior, jobs, inbound email, payments/callbacks if applicable, access controls, and logs.
5. Record intended cutover window, TTL changes, DNS rollback steps and authorized decision-maker. Do not change real DNS as part of editorial research.
6. Measure actual restoration/recovery only if a test happened; never invent downtime or RPO/RTO compliance.

### 4. Hosting cutover GO/NO-GO matrix
| Gate | Evidence required | Decision |
| --- | --- | --- |
| DNS and email inventory | Saved records including MX, SPF, DKIM, DMARC, ownership and rollback target | Not assessed |
| Backup and restoration | Documented successful authorized restore, with measured recovery | Not assessed |
| Application/TLS/dependencies | Staging, redirects, auth, certificates and integrations work | Not assessed |
| Rollback authority | Named accountable human, trigger, tested route back | Not assessed |
| Retention and total billing | Approved data retention, overlapping charges and cancellation obligations | Not assessed |

**Default NO-GO:** Any critical gate marked Not assessed or Fail blocks a real migration. A passing sample does not authorize DNS or production changes.

### 5. Total ownership cost — never fill fictional vendor amounts
| Component | Kinsta quote | Cloudways quote |
| --- | --- | --- |
| Monthly base for the exact product | Unknown | Unknown |
| Included usage and likely overages | Unknown | Unknown |
| Backup add-ons and retention | Unknown | Unknown |
| One-time engineering/migration labor | Unknown | Unknown |
| Extra environments, CDN/email, support | Unknown | Unknown |
| Currency, taxes, renewal, egress | Unknown | Unknown |

Use StackPilot's locally computed subscription calculator with **user-entered quotes** only; no invented provider pricing.

### Official vendor documentation leads
- Kinsta plan selection: https://kinsta.com/docs/billing/wordpress-hosting-plans/wordpress-choosing-the-right-plan/
- Kinsta WordPress plan overages: https://kinsta.com/docs/billing/wordpress-hosting-plans/overages/
- Cloudways off-site backup charge distinctions: https://support.cloudways.com/en/articles/5119648-charges-for-off-site-backups

### Human editorial approval gate — unchecked
- [ ] URL, date, exact edition, product family and region reconfirmed
- [ ] Charges/units, quote and policy verified with current primary terms
- [ ] No unperformed hands-on restore or benchmark represented as completed
- [ ] Any provider comparisons scoped to equivalent workloads
- [ ] Disclosures, contact, operator attribution and approval reviewed
- [ ] Owner separately authorizes any publication

**Safety:** This remains a PRIVATE markdown source document only. Netlify stays private/locked, PR draft and unmerged, all claims candidate/unapproved, affiliate links inactive, no indexing and ₹0 spend.
