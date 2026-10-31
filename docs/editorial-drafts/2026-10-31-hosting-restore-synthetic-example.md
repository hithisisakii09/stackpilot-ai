# Hosting migration: a synthetic backup-and-restore NO-GO exercise
**StackPilot AI | private editorial draft | 2026-10-31**
**NOT a live migration, benchmark, provider comparison, or tested restore.**

## The buyer's decision
A website can load successfully on a new host while still being unready for cutover. Missing email records, stale database backups, mismatched TLS settings, missing scheduled jobs, or an untested rollback can cause substantial operational harm. This original *fictional* exercise helps a buyer distinguish a page-load demonstration from credible migration readiness.

## Hypothetical scenario (all numbers and outcomes invented)
A small business proposes to move a WordPress website. The business requires:
- **RPO:** at most 15 minutes of data loss.
- **RTO:** service restored within 60 minutes.
- **Email:** current MX/SPF/DKIM records stay correct and outbound transactional email is tested.
- **Rollback:** a named, available operator must be able to revert the change within the agreed window.
- **Data retention:** backup copies and post-migration cancellation handling require owner approval.

This is an illustrative set of requirements, not an assertion that any host meets them.

### Fictional rehearsal evidence
| Gate | Fictional observation | Required condition | Decision |
| --- | --- | --- | --- |
| DNS and email | MX recorded; DKIM entry omitted from migration inventory | All required records accounted for | **FAIL** |
| Backups | Latest restorable snapshot is 35 minutes old | RPO ≤15 minutes | **FAIL** |
| Restoration | Fictional backup restore step completes in 42 minutes; detection, validation and traffic recovery are not timed | End-to-end service RTO ≤60 minutes | **NOT TESTED** — 42-minute restore step alone cannot establish RTO |
| TLS and application | Homepage TLS works, but scheduled order jobs untested | Critical dependencies verified | **NOT TESTED** |
| Rollback | No named person authorized to initiate rollback | Named owner and executable return plan | **FAIL** |
| Billing and retention | Old-host data deletion terms not reviewed | Approved written plan | **NOT TESTED** |

**Decision: NO-GO.** A 42-minute restore-step observation is not a measured end-to-end recovery, and multiple critical gates failed or were not tested.

### RPO versus RTO
- **RPO** asks how much recent data could be lost if restoring a chosen recovery point. A backup captured 35 minutes before the fictional failure exceeds the 15-minute RPO. Actual application consistency also matters.
- **RTO** asks how long the service must take to resume usable operation after the defined disruption point. It includes detection, decision-making, restoration, validation and restoration of user traffic. A fictional 42-minute backup-restore step alone **does not prove** that the end-to-end 60-minute RTO was met; the correct decision is **NOT TESTED** until the full outage timeline is measured. Neither a restoration step nor provider marketing is proof of a host's guaranteed SLA.
- A plan promise or backup-frequency setting is not the same as a measured, permissioned successful restore.

## Safe buyer rehearsal procedure
1. Identify real decision makers, prerequisites, asset owners and change window, but never publish credentials.
2. Inventory the DNS zone: A/AAAA/CNAME, MX, SPF, DKIM, DMARC, TTLs and dependent services.
3. Document last-known-good data, application files, secrets-management location, extension versions and database export format.
4. Use **only an authorized staging system** to attempt a restoration. If unavailable within the budget, write **NOT TESTED**, not PASS.
5. Check user journeys, role permissions, background jobs, messages, backups, monitoring and external callbacks.
6. Compare actual observed RPO and RTO with pre-approved thresholds and record evidence.
7. List rollback triggers and assign the final go/no-go authority to a real person.
8. Validate retention and billing obligations; no provider signup or purchase is required for this editorial exercise.

## Non-commercial worksheet template
For each gate, capture: `gate,expected_condition,observed_condition,evidence_reference,responsible_owner,decision,retest_date`.

Example: `backup_rpo,15_min_or_less,fictional_35_min_snapshot,SYNTHETIC_PROOF_001,TEST_OWNER,FAIL,not_scheduled`.

These values are synthetic. Use CSV formula-injection precautions if importing arbitrary external evidence into spreadsheet software.

## Context questions for hosting vendors (not endorsements)
- What exact product family and plan covers the buyer's stack and region?
- How are backup retention, restoration, snapshots and offsite storage billed?
- What happens to data after cancellation?
- Are usage charges tied to visits, bandwidth, backup storage, or another dimension?
- What support paths and responsibility boundaries apply during failed migration?

**Kinsta primary documentation leads:** https://kinsta.com/docs/billing/wordpress-hosting-plans/overages/ and https://kinsta.com/docs/billing/wordpress-hosting-plans/wordpress-choosing-the-right-plan/

**Cloudways primary documentation lead:** https://support.cloudways.com/en/articles/5119648-charges-for-off-site-backups

A first-party URL is a source lead only. No real hosting restore has been executed or claim editorially approved.

## Existing private site resources
- `/guides/hosting-migration-checklist/` — broader checklist and five cutover gates.
- `/guides/saas-total-cost-of-ownership/` — user-controlled cost framework.
- `/tools/software-cost-calculator/` — hypothetical quotes, not live vendor prices.

## Approval and publication gate
- [ ] Human reviewer verifies technical claims and original text
- [ ] References, plan conditions, region, retention and privacy reviewed
- [ ] All real observations distinguish tested vs fictional vs unknown
- [ ] Any live test has authorized system access and documented evidence
- [ ] Publisher identity, disclosures, privacy policy and owner publication approval recorded

**Hard holds:** private Markdown only; development PR remains draft/unmerged; Netlify private/locked; ₹0 cash/delegated budget; no public indexing, affiliate action, trial, paid service, provider contract or production cutover.
