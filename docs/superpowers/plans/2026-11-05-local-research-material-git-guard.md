# Milestone 2 — Local research materials must never enter Git

Date: 2026-11-05. Work only on existing private Draft PR #8, `feature/phase-2-product-readiness`.

## Risk and objective
`research:intake`, `research:claim-starter`, `research:gap-worklist`, and `research:snapshot-check` operate on manually sourced vendor text and local private JSON. Instructions say to keep copies **outside this repository**, yet `.gitignore` currently only excludes generated artifacts and secrets, not recognizable private research folders or temporary intake/snapshot files. A developer could accidentally commit a vendor document or research material (or force-add one in spite of ignore rules).

## Plan — test first
1. Tests for a pure private-material path inventory guard: reject known temporary snapshot/input/output file basenames and sensitive research directory segments regardless of nesting, case or extension; require valid, duplicate-free repository paths. Do not prohibit the intentionally tracked **empty candidate registers** under `src/data/`, source-code modules, or legitimate documentation.
2. Add `.gitignore` patterns for these folders/files, with tests for root and nested ignoring. A second CI guard must enumerate **actual tracked files** using read-only `git ls-files --cached -z`, so forced Git additions fail independently of ignore rules. Do not print private text or filepath detail in logs.
3. Wire into `check:data` / `npm test`, expose read-only `npm run research:material-guard`. CI must fail closed if tracking patterns are bypassed or Git itself is unavailable. No new dependencies.
4. Document an actionable first claim research pilot (HubSpot export, `comparison-hubspot-vs-pipedrive-05`) with **existing** first-party document *candidate* URL. Distinguish claims and independent predicates (CSV export of different record types vs API sync), keep all real source / date / excerpt fields blank and tell the owner how to use the existing offline commands. No fabricated source or vendor claim approval.
5. Verify exact HEAD build (Node tests, static leakage audit), ops safety, Chromium and preview status; main unchanged, no merge, spend or public launch.

## Non-goals and limits
This protects a recognizable set of filenames and directories; a maliciously renamed or obfuscated source file can escape name-only detection. `git ls-files` checks tracked paths, not arbitrary file contents or the history of older commits. Repository visibility is not a substitute for access control. Adding `gitignore` rules is defense-in-depth; all real research files should still be stored **outside** the repo. Independent vendor-source inspection and authenticated review remain user/owner work. All 36 claims stay unverified and production remains NO-GO.
