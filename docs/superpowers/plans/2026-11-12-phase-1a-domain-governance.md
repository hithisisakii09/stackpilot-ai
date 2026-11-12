# Phase 1A: domain contracts, fail-closed policy and logical registry

Authorized by the owner's confirmation to the specific Phase 1A scope. Base `13db6cacaa1f9dca3b6576050658989e20237e2a`; isolated branch `feature/phase-1a-domain-governance-2026-11-12`. Preserve all prior untracked reports. No dependency, database, authentication service, executor, workflow, hosting, PR or release change is included.

## Design review

Need: replace the prototype's unvalidated roles and permissive actor strings with reusable runtime contracts before persistence/execution. Keep current static Astro pages and existing candidate/approval validators intact. Modules are pure ESM under `src/platform`, never imported by a public page or browser script. Use built-in validators, not a new library.

Trust boundaries: JSON-shaped inputs are untrusted data; caller-provided identity/owner/approval flags never establish authority. HTTPS structure is not official-source verification. Logical agent roles and tool metadata are configuration, not handlers or permission grants. All 41 requested role names must be present, individually scoped and disabled. No pretending that registered roles execute tasks.

Interface decisions:

- `contracts/domain.mjs`: strict version-1 parsers for actor, resource, task input, artifact, candidate evidence and locked operating policy. Reject undeclared/symbol/accessor fields and non-plain objects, malformed IDs, cross-organization references, unknown actions, unsafe/future evidence, invalid/nonzero costs and unbounded JSON/limits. Return detached immutable values. Evidence stays candidate-only; full lifecycle is vocabulary, not implemented transitions.
- `contracts/actions.mjs`: immutable action/resource/scope catalog with four classification tiers (`allowed`, `human_approval`, `legal_review`, `prohibited`). Unknown actions classify prohibited. Protected tier is never an approval. No commission or pricing score in contracts.
- `permissions/evaluate.mjs`: `evaluateAction(request)` gives a deterministic DENY plus tier/reasons; malformed inputs are prohibited without echoing values. Even otherwise valid allowed-tier requests remain denied because no trusted identity/authorization adapter is provisioned. Reject impersonation, self-approval, inconsistent tenant/resource/scope and policy/cost bypass. There is no authority minting API or caller-injected verifier.
- `agents/roles.mjs`: 41 named definitions across seven groups, consolidated into research/analysis/engineering pipelines. Explicit preparation capabilities/tools, input/output contract IDs, zero cost and bounded limits. No handler implementations.
- `agents/registry.mjs`: immutable `createAgentRegistry(definitions)`, with `list/get/register/configure` returning immutable definitions or a new registry. Reject duplicate IDs, unknown tools/contracts, capability escalation and enabled roles without implemented handlers. Configuration may narrow, never enlarge a registered role's declared tool/capability/limit ceiling. Lookup metadata cannot authorize an action.

## Test-first sequence

1. Confirm baseline `npm.cmd test` green under existing Codex Node24.22.1/npm10.9.9. Read live PR #8 and Stage0.6 CI before edits.
2. Add `tests/platform-contracts.test.mjs`: schema/actor spoofing, bounded input/output, immutable detachment, candidate evidence dates/URLs, tenant alignment and policy/cost denial. Record RED for missing implementation, implement minimal GREEN.
3. Add `tests/platform-permissions.test.mjs`: every tier, unknown actions, forged role/token/auth flags, agent approval attempts, missing identities, tenant/resource/scope mismatch and all no-executor gates. Record RED then GREEN. No positive authorization assertion until a future independently provisioned identity service exists.
4. Add `tests/platform-registry.test.mjs`: exact 41 role names/groups, unique IDs, frozen metadata, per-role capabilities, duplicate registration, independent configuration, disallowed tools, attempted enabling/escalation and contract/limit errors. RED then GREEN.
5. Review attack surfaces, then run all existing Node/data/build/preflight checks. Check built assets for new platform/internal names to prove no accidental browser integration. Existing static-only runtime audit must pass unchanged.
6. Independent review per Superpowers requesting-code-review; fix findings with regression tests and rerun affected checks. Commit only scoped files. Do not create/modify pending PRs or launch a preview. Use the existing non-deploying branch manual Chromium workflow for exact-SHA Linux/desktop/mobile/axe validation, with no PR creation; no merge or deployment.
7. Produce phase report with actual commit, CI, role enablement=0, preserved buyer functionality, test counts, risks and explicitly deferred Phase1B/1C gates. Stop at Phase1A.

## Risks and acceptance

Risks: broad policy metadata mistaken for authorization, returning mutable input aliases, allowing arbitrary JSON/getters, static bundle leakage, roles claiming capabilities they cannot execute, default-deny being silently relaxed. Acceptance: no executor/identity authority exists; all decisions remain DENY; meaningful rejection tests pass; all existing functions remain intact; 41 disabled roles are validated/configurable; no new package/network/spend dependency. This does not satisfy authenticated authorization, durable registry storage, workflow execution or evidence approval.

Methodology sources read this sprint: gstack [plan-eng-review](https://github.com/garrytan/gstack/blob/main/plan-eng-review/SKILL.md), [review](https://github.com/garrytan/gstack/blob/main/review/SKILL.md), [qa](https://github.com/garrytan/gstack/blob/main/qa/SKILL.md), [ship](https://github.com/garrytan/gstack/blob/main/ship/SKILL.md); requested `investigate/SKILL.md` returned 404, so use the available [Superpowers systematic-debugging](https://github.com/obra/superpowers/blob/main/skills/systematic-debugging/SKILL.md) root-cause process. Superpowers [writing-plans](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md), [TDD](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md), [verification-before-completion](https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md), [requesting-code-review](https://github.com/obra/superpowers/blob/main/skills/requesting-code-review/SKILL.md). Manual equivalents only; no external skill installation or telemetry.
