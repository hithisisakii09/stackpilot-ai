# Operational Backlog Packet-Awareness Implementation Plan

> **For agentic workers:** Apply the repository's gstack and Superpowers workflows manually when executable skills are unavailable. Steps are tracked with checkboxes.

**Goal:** Stop the advisory backlog from repeatedly scheduling P30 evidence-drafting tasks after a matching private, unapproved evidence packet has already been prepared, without treating preparation as editorial approval.

**Architecture:** Add a strict machine-readable ledger of prepared-but-unapproved editorial packets. The pure backlog builder validates packet identity, safe repository path, date and exact source-ID coverage. A matching packet suppresses only the redundant P30 drafting task; missing evidence and stale-source refresh tasks keep higher priority. Owner editorial approval remains a separate mandatory gate.

**Tech Stack:** Node.js ESM, JSON, node:test, existing GitHub Actions and read-only Astro operations report.

**Spec:** Existing plan-scoped evidence review recorded in issue #6 comment 6590708374 and private note docs/editorial-drafts/2026-11-03-plan-scoped-vendor-evidence-review.md.

## Global Constraints
- Monthly budget ₹0; delegated spend ₹0; no paid dependencies, accounts, provider settings, affiliate links or external writes.
- Work only on feature/phase-1-1-recommendation-engine; PR #1 stays draft and unmerged.
- All six claims remain candidate, approved:false, reviewer:null; unreviewedProducts remains six.
- Packet state is exactly prepared-unapproved; it is not evidence verification, source approval or permission to publish.
- Missing or invalid packet data must fail safely: keep the P30 task or reject malformed input, never silently approve.
- A stale evidence intake always yields P20 refresh even if a draft packet exists.

## Review Focus
- A packet must match the exact current evidence source IDs for one known product.
- Duplicate product packets, unknown products, extra properties, unsafe paths, future dates and status=approved must be rejected.
- A packet must never mutate product/evidence/affiliate inputs or expose source URLs in backlog tasks.
- The operations report and CLI must load the same ledger so their counts and ordering agree.
- Existing owner-only editorial, affiliate, spend and release gates remain unchanged.

## Task 1: Pin expected backlog behavior with tests and a source ledger

**Files:**
- Create src/data/editorial-packet-ledger.json
- Create docs/editorial-drafts/2026-11-03-plan-scoped-vendor-evidence-review.md
- Create docs/affiliate-eligibility/2026-11-04-primary-source-refresh.md
- Create docs/superpowers/plans/2026-11-04-operational-backlog-packet-awareness.md
- Modify tests/operating-backlog.test.mjs

**Interfaces:**
- editorialPackets records {id, productId, documentPath, preparedOn, status, sourceIds}.
- status is always prepared-unapproved.
- sourceIds must exactly match current evidenceLeads for the product.

- [x] Write tests for suppression, missing/partial packets, stale-source precedence, malformed manifests, deterministic order and non-mutation.
- [x] Verify RED on the old builder; six focused assertions failed for the expected missing packet-aware behavior, with the packet-document assertion passing.

## Task 2: Implement fail-closed packet-aware backlog

**Files:**
- Modify src/lib/operating-backlog.mjs
- Modify scripts/operating-backlog.mjs
- Modify scripts/ops-report.mjs

**Interfaces:**
- buildOperatingBacklog({products,evidenceLeads,affiliateCandidates,editorialPackets,policy,...}).
- Add metrics.preparedEvidencePackets and metrics.editorialReviewsPending.
- Suppress only draft-evidence-review when a validated matching packet exists; do not suppress collect-primary-source or refresh-primary-source.

- [x] Implement exact-schema, source-coverage, date and path validation.
- [x] Pass the same ledger into CLI and operations report.
- [ ] Verify focused tests GREEN and full npm test.

## Task 3: Review and verify exact commit

- [ ] Review all changed files for evidence laundering, path traversal, policy changes and accidental approvals.
- [ ] Verify release preflight, 25-route Chromium desktop/mobile QA and exact-head Netlify status through GitHub.
- [ ] Update PR #1, issue #5 and issue #6 with exact evidence and limits.
- [ ] Keep PR draft/unmerged and all public release/affiliate gates blocked.

## Workflow references
- gstack plan-eng-review: https://github.com/garrytan/gstack/blob/main/plan-eng-review/SKILL.md
- gstack review: https://github.com/garrytan/gstack/blob/main/review/SKILL.md
- gstack QA: https://github.com/garrytan/gstack/blob/main/qa/SKILL.md
- Superpowers writing-plans: https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md
- Superpowers TDD: https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md
- Superpowers verification-before-completion: https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md
- Superpowers requesting-code-review: https://github.com/obra/superpowers/blob/main/skills/requesting-code-review/SKILL.md
