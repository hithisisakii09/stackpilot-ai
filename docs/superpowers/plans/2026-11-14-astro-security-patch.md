# Astro security patch plan — 2026-11-14

Status: owner approved pinned Astro 7.4.7 installation with scripts disabled and local/exact-SHA CI validation. Installation and the two renderer regressions pass; full validation is in progress.

## Scope and evidence

Start from `75c74263ed77437e5514730c07f048ddbea3994b` on `fix/astro-security-2026-11-14`. Preserve all prior untracked reports. The latest Phase 3A checkpoint records successful exact-SHA CI and an unresolved Astro 7.4.4 audit finding. This task addresses that dependency finding before further platform implementation.

- [Dynamic tag injection advisory](https://github.com/withastro/astro/security/advisories/GHSA-mh32-jxcr-mh9f): patched in 7.4.5.
- [Image endpoint traversal advisory](https://github.com/withastro/astro/security/advisories/GHSA-r3h5-4585-7x3w): patched in 7.4.7. Current output is static and has no Node adapter, so the documented adapter path is absent.
- Registry metadata checked for Astro 7.4.7: MIT; Node >=22.23.4; npm >=9.6.5. Approved local runtime is Node 24.22.1/npm 10.9.9. No install lifecycle hooks appeared in its scripts metadata.

## Implementation steps

1. Obtain the separately required package installation opt-in. Before mutation, record existing untracked-file hashes and verify remote/branch state.
2. Add a narrowly scoped Node behavior regression test using Astro's actual rendering pipeline. Exercise malicious dynamic tag names and legitimate tags. Run against 7.4.4 and record an assertion failure caused by unsafe rendering. A preliminary direct renderer probe failed because its result context lacked renderer metadata; that setup error is **not** a valid RED security test. Correct the harness before claiming reproduction.
3. Install exactly `astro@7.4.7` with the existing approved npm and lifecycle scripts disabled (`--ignore-scripts --save-exact`). Expected production changes are `package.json` and `package-lock.json`; inspect every transitive change and do not run a broad audit fix. Do not introduce the unused Node adapter to manufacture an integration test.
4. Rerun the behavior test and dependency audit. Confirm GREEN from behavior evidence and that both advisory ranges are cleared. Retain valid rendering behavior.
5. Run the existing full Node/foundation/control/identity/approval/HTTPS/runner/scheduler/market suites, catalog/source validation, fresh Astro build, build smoke and release preflight, Chromium desktop/mobile and axe checks. Use owned disposable loopback databases where existing suites require them. Record exact commands, runtimes, totals, skips and exits.
6. Review the bounded diff for security, accidental feature changes, secrets and lifecycle execution. Verify prior untracked file hashes. Commit only scoped files after successful local validation.
7. Push only this development branch if installation and validation scope is approved. Use the existing non-deploying CI workflow; inspect completed exact-SHA logs, Linux symlink rejection, browser/axe evidence, warnings and artifacts. Do not infer success from initiation.
8. Write a separate security checkpoint with actual SHA and run links, results, limitations and unresolved owner gates. Stop after security remediation; do not start another platform phase.

## Risks and release gates

Patch updates can change generated output or lockfile transitive dependencies; full existing QA and diff review are mandatory. Never weaken tests to obtain GREEN. Missing tooling and malformed test harnesses are blockers, not expected feature failures. No credentials in logs, new service, spending, deployment, hosting changes, public launch, PR mutation, merge, history rewrite or protected-branch writes are authorized by this plan.

## Methodology references

Applied manually without external setup scripts, hooks or telemetry:

- gstack [plan-eng-review](https://github.com/garrytan/gstack/blob/main/plan-eng-review/SKILL.md), [review](https://github.com/garrytan/gstack/blob/main/review/SKILL.md), [qa](https://github.com/garrytan/gstack/blob/main/qa/SKILL.md), [ship](https://github.com/garrytan/gstack/blob/main/ship/SKILL.md). The requested `investigate/SKILL.md` public URL returned 404 during this preparation; systematic debugging provides the available investigation method.
- Superpowers [writing-plans](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md), [test-driven-development](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md), [systematic-debugging](https://github.com/obra/superpowers/blob/main/skills/systematic-debugging/SKILL.md), [verification-before-completion](https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md), [requesting-code-review](https://github.com/obra/superpowers/blob/main/skills/requesting-code-review/SKILL.md).
