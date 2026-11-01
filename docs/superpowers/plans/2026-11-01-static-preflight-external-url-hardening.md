# Phase 2.13 — Fail-closed static external URL leak audit (private feature branch)
**Date:** 2026-11-01. **Target:** `src/lib/release-preflight.mjs` and `tests/release-preflight.test.mjs`. **Budget:** ₹0. **Release:** NO-GO.

## Why now (gstack engineering review)
At exact development SHA `521a49c7de67536b775a2e6d7aa48c7aed0c17c9`, CI reports 237/237 Node tests, 17 generated static routes, `release:preflight` PASS and local Chromium PASS. The existing static auditor only recognizes **quoted** `http(s)://` script `src` and form `action` attributes. Valid HTML can instead use protocol-relative `//host` or unquoted attributes. `<button formaction>` and `<input formaction>` can submit data off-site even if the parent form's action is local. These are static audit **coverage gaps**, not evidence of an active exploit or current third-party leakage.

## Scope and trust boundary
Do not alter existing UI, products, affiliate links, policy, Netlify visibility, `main`, or the prelaunch noindex/robots rules. Audit every built HTML route using the existing no-dependency scanner. This is defense in depth, not a replacement for authenticated remote network privacy UAT. The private build must continue to permit inline JavaScript and local relative script URLs; no new package or external service.

## TDD (Superpowers)
1. **RED:** Extend `tests/release-preflight.test.mjs` with a behavior case proving unquoted and protocol-relative external `script src` and `form action` are rejected; a separate case proving external `button/input formaction` is rejected. Confirm tests fail on old implementation for expected missing violations, not syntax or missing dependency.
2. **GREEN:** In `src/lib/release-preflight.mjs`, extract `src`/`action`/`formaction` from tag attributes supporting single, double and unquoted forms, then reject protocol-relative or scheme-prefixed destinations (including `data:` and `javascript:`). Preserve existing messages and audit result shape.
3. **Review:** Check mixed case, whitespace, local paths, false positives from `data-src`, input immutability and existing 17 routes. No dynamic JS/network evaluation.
4. **Verify:** GitHub `npm test` (includes `release:preflight`), production dependency audit, Chromium desktop/mobile+axe, safety/ops workflow, exact-SHA Netlify deploy-preview status. Local browser CI is **not** authenticated Netlify remote UAT.
5. **Handoff:** Update GitHub issue #5 and draft PR #1 evidence; keep `main` unmerged, Netlify private/locked, ₹0 and all editorial/affiliate/public launch holds.

**Skill references inspected:** https://github.com/garrytan/gstack/blob/main/review/SKILL.md , https://github.com/garrytan/gstack/blob/main/qa/SKILL.md , https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md , https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md , https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md . Referenced methodologies were read; no upstream scripts installed or executed.
