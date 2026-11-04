# StackPilot AI — Mobile Manual Testing and Accessibility Runbook

**Document Date:** 2026-11-03 (Asia/Kolkata)  
**Status:** MANUAL QA TEST SPECIFICATION / OWNER UAT COMPANION  
**Branch:** `feature/phase-1-1-recommendation-engine` | **PR:** [#1](https://github.com/hithisisakii09/stackpilot-ai/pull/1) (draft)  
**Automated Baseline:** 25/25 routes pass automated axe-core scans in Chromium (WCAG 2.1 A/AA).

---

## 1. Scope & Manual QA Objective

Automated accessibility tools (axe-core) detect approximately 30%–50% of WCAG defects. Automated sweeps confirm single `<h1>` structure, color contrast ratios, semantic landmarks, and absence of horizontal overflow.

This runbook defines the **physical mobile device and manual accessibility verification protocol** required for human release signoff.

---

## 2. Target Viewport Matrix

| Viewport Profile | Resolution | Form Factor | Critical Test Scope |
|---|---|---|---|
| **Compact Mobile** | 320 × 568 px | iPhone SE (1st gen) / Small Android | Verify navigation wraps, header does not clip brand, form controls do not overflow. |
| **Standard Android** | 360 × 800 px | Samsung Galaxy A / Pixel compact | Verify card grids collapse to 1 column, button touch targets $\ge 44 \times 44\text{px}$. |
| **Standard iOS** | 390 × 844 px | iPhone 12 / 13 / 14 / 15 | Verify advisor dropdowns, modal-free calculators, and horizontal table scrolling in `/compare/`. |
| **Tablet Portrait** | 768 × 1024 px | iPad / Android Tablet | Verify 2-column or 1-column layout transition, touch targets, and readability. |
| **Standard Laptop** | 1280 × 800 px | MacBook Air / 13" Ultrabook | Verify maximum content container width (1080px) and margin centering. |
| **Desktop High-Res** | 1440 × 900 px | Desktop monitor | Verify 3-column card layouts, header alignment, and focus rings. |

---

## 3. Manual Inspection Protocols

### 3.1 Horizontal Overflow & Touch Boundary Checks
1. Load every route on a mobile browser or mobile emulation.
2. Attempt horizontal pan across the document.
3. **Pass Criteria:** The page body must not pan horizontally (`scrollWidth === innerWidth`).
4. **Table Exception:** In `/compare/`, the side-by-side data table is contained within a dedicated scroll container (`.table-container { overflow-x: auto; }`). The outer document body must remain fixed.

### 3.2 Touch Target Sizing & Spacing
1. Verify that all clickable buttons, links, dropdowns, and checkboxes have a minimum active hit area of **$44 \times 44\text{px}$** (WCAG 2.5.5 / 2.5.8).
2. Verify spacing between adjacent navigation links in `<header>` and `<nav>` to prevent accidental mis-taps.

### 3.3 Keyboard Navigation & Focus Visible
1. Connect a physical keyboard or use desktop tab navigation.
2. Tab through the entire page from top to bottom.
3. **Pass Criteria:**
   - Focus indicator must be distinctly visible (`outline: 2px solid #7ce8c6` or browser focus ring).
   - Tab order must follow natural logical document flow.
   - Interactive elements must be activatable via `Enter` or `Space`.
   - Skip links or direct anchor jumps (e.g. `href="#advisor"`) must immediately move focus to the target section.

### 3.4 Screen Reader Speech & Labeling (VoiceOver / TalkBack)
1. Enable iOS VoiceOver or Android TalkBack.
2. Navigate by touch and swipe through:
   - Form `<select>` controls: verify associated `<label>` is read clearly.
   - Calculator numeric input fields: verify placeholder, label, and units (e.g. `USD`, `INR`) are announced.
   - Dynamic recommendation results: verify `<div id="result" role="status" aria-live="polite">` announces category match updates when the button is tapped without requiring a page reload.

---

## 4. Route-by-Route Manual Acceptance Checklist

- [ ] `/` (Homepage): Test priority selector, team size, and budget dropdowns. Tap "Show category matches". Verify results announce politely.
- [ ] `/compare/`: Verify horizontal scrolling of candidate table on 390px screen. Verify no full-page horizontal overflow.
- [ ] `/tools/software-cost-calculator/`: Enter test numbers into monthly cost, user count, and discount inputs. Verify calculations update live. Tap CSV export; verify download triggers without popup blocker.
- [ ] `/tools/crm-seat-audit/`: Enter seat counts and role allocations. Verify vacancy cost recalculates.
- [ ] `/tools/crm-migration-readiness/`: Toggle checklist items. Verify migration score recalculates.
- [ ] `/tools/hosting-cutover-gates/`: Toggle DNS, SSL, and backup checks. Verify overall gate status updates.
- [ ] `/tools/backup-restore-drill/`: Enter RTO/RPO targets and database sizes.
- [ ] `/tools/hosting-hidden-costs/`: Enter estimated bandwidth and overage amounts.
- [ ] `/tools/requirements-checklist/`: Complete questionnaire; verify CSV download.
- [ ] `/preview-build/`: Verify commit SHA is legible on mobile screen without truncation.

---

## 5. Human Signoff Gate
This runbook must be executed by the authorized owner or human QA tester using physical hardware before Phase 4 commercial release approval is granted.

