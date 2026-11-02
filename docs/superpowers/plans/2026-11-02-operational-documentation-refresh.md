# Refresh StackPilot operational documentation

> **For agentic workers:** Apply the documentation changes in this plan on the existing feature branch only. Keep PR #1 draft and unmerged.

**Goal:** Remove stale deployment/autonomy statements and align the README, operational handoff, and owner UAT packet with the latest dated owner and CI evidence.

**Architecture:** Documentation-only change. The README is the concise project entry point; the operational handoff carries dated SHA/CI/provider evidence; the UAT packet carries owner-observed steps and limits. No application code, provider settings, or account state changes.

**Tech Stack:** Markdown and GitHub repository contents.

**Spec:** `AGENTS.md`, `docs/current-operational-state.md`, `docs/publisher-readiness/2026-11-01-private-preview-uat-release-decision.md`, and release blocker [issue #5](https://github.com/hithisisakii09/stackpilot-ai/issues/5).

## Global Constraints

- Monthly budget and delegated spend remain **₹0**.
- Keep branch `feature/phase-1-1-recommendation-engine`; do not change `main), merge, publish publicly, enable indexing, or activate affiliates.
- Do not change Netlify visibility, Auto Publishing, analytics, billing, or other provider settings.
- Do not recreate or deploy to the owner-deleted Vercel project.
- Preserve all six vendor claims as unapproved; do not invent legal, publisher, traffic, or revenue approvals.

## Review Focus

- Distinguish private Deploy Preview from public launch and older private production.
- Label provider screenshots and CI results as dated, point-in-time evidence.
- Distinguish browser-local application behavior from Netlify Web Analytics and provider logs.
- Do not carry a build-identity PASS from an old SHA onto a new documentation commit.
- Keep owner-only UAT and release gates explicit.

---

### Task 1: Refresh the README

**Files:** Modify `README.md`.

- [x] Correct the current Netlify private-preview description.
- [x] Clarify that the scheduled ChatGPT tasks run outside the website and cannot approve/publish/spend.
- [x] Document hosting-layer Web Analytics and the pending privacy review.
- [x] Keep noindex/authentication and private/public distinctions explicit.

### Task 2: Refresh the dated operational handoff

**Files:** Modify `docs/current-operational-state.md`.

- [x] Record the last verified application-code SHA and exact build, browser, operations and Netlify status references.
- [x] Record limits of the two-path anonymous canary and owner-observed build metadata.
- [x] Update generated page/link counts and current owner billing snapshot.
- [x] State that this documentation commit invalidates the previous SHA-specific owner screenshot for the new head.

### Task 3: Refresh the owner UAT packet

**Files:** Modify `docs/publisher-readiness/2026-11-01-private-preview-uat-release-decision.md`.

- [x] Record the 2026-11-02 owner-observed build identity match for SHA `ff88...`.
- [x] Make the next action a fresh identity check for the new documentation commit, followed by authenticated route UAT.
- [x] Keep anonymous-access, live-header, analytics, editorial and publication gates separate.

### Verification

- [x] Read `AGENTS.md`, the current operational handoff, the operating policy and the relevant gstack/Superpowers public skill references.
- [x] Rechecked PR #1 HEAD, exact-SHA GitHub Actions runs and Netlify commit status before editing.
- [ ] After the documentation commit, verify the new PR SHA, matching CI runs and Netlify status. Owner must recheck the new preview identity SHA before current-SHA UAT.

**No application behavior or dependencies changed.**