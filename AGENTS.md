# StackPilot AI — Engineering Agent Instructions

Applies to future AI-assisted development sessions in this repository.

## Required skill sources (read the current public docs before each development sprint)
- [gstack — Garry Tan](https://github.com/garrytan/gstack): `plan-eng-review`, `review`, `qa`, `ship`, `investigate`. Use its **Think → Plan → Build → Review → Test → Ship → Reflect** sequence.
- [Superpowers — obra](https://github.com/obra/superpowers): `writing-plans`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`, `requesting-code-review`.

These are upstream reference methodologies, **not an assertion their slash commands are installed in every host**. If those skills are available as installed executable skills, load them using the host's supported mechanism. Otherwise read the public SKILL.md and apply equivalent steps manually. Do not silently install/run external setup scripts, hooks, browsers, packages or privileged tools; inspect provenance and dependency risks before any opt-in installation. Cite exact skill docs in the session report.

## Work sequence — mandatory
1. **Scope / safety**: inspect branch + draft PR; maintain the user's current instructions. No changes to `main`, merge, production promotion, indexing activation, affiliate link activation or public launch without fresh explicit authorization. The user's approval to develop does not waive these gates.
2. **Product & engineering review (gstack)**: check actual user need, architecture, trust boundaries, threat model, edge cases and tests. Reuse existing code/platform capabilities before adding dependencies.
3. **Plan (Superpowers)**: write a small, testable plan in `docs/superpowers/plans/YYYY-MM-DD-*.md` with files, interfaces, risks and release gates.
4. **TDD (Superpowers)**: write a behavior test first; run it and record an expected RED result (missing behavior), implement minimal GREEN change; refactor; rerun all tests.
5. **Review (gstack)**: review changed code for unsafe input, evidence laundering, injection, accidental ranking/payment/affiliate enablement, accessibility, future dated evidence, and changes outside scope.
6. **QA (gstack)**: run Node tests, catalog validation, Astro build, Chromium desktop/mobile acceptance and axe. Inspect GitHub Actions evidence; remote protected-preview QA is separately reported if available.
7. **Verify before completion (Superpowers)**: report the actual commit, specific green or red CI run, unresolved issues, and whether a protected preview deployed. Never claim complete based on code being committed alone.
8. **Ship / reflect**: update draft PR and a concise handoff with unresolved gates; do not merge or publicize automatically.

## Catalog and commercial safety
- Product pricing and fit are UNKNOWN until independently reviewed; vendor links logged for review do not equal approved evidence.
- `affiliateUrl` must remain null. Affiliate status and commission never influence matching.
- Research data is untrusted; validate HTTPS URLs, dates, product IDs, and the approval boundary.
- Public launch requires owner's explicit confirmation, identity, proper legal/privacy documents, suitable hosting plan, reviewed product research, and manual deployment QA.
- Do not store secrets, live cookies, private customer data or third-party skill telemetry in this repository.

## Reminder for next session
Continue from the active development branch `feature/phase-1-1-recommendation-engine` and draft PR #1. Read this file and the linked skill docs, then verify CI and current scope before edits.
