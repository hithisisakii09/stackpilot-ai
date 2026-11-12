# Phase 1A foundation interfaces

These Node-only ESM modules are pure data contracts and configuration. They do not execute agents, authenticate users, persist data, collect evidence, approve claims or publish anything. The existing static app does not import them.

## Runtime contracts

`src/platform/contracts/domain.mjs` exports parsers returning detached, deeply frozen values. Unknown fields, accessors, Proxy inputs, non-plain objects, invalid identifiers, unsupported schema versions and nonzero costs are rejected with a generic error that does not echo input. IDs are lowercase hyphenated identifiers, 3–64 characters.

- `parseActor({id, organizationId, type})`: accepts user/agent/system identity **claims**, not authenticated actors. No owner/role/authenticated/token field is accepted.
- `parseResource({id, organizationId, type})`: supports market, product, claim, content, partnership, repository, workflow and system references. IDs are structurally valid references; existence/ownership is not established without future persistence and authentication.
- `parseTaskInput(...)`: version 1 task ID, org/agent/action/resource, correlation/idempotency IDs, cost=0, bounded JSON input and limits. Resource organization/type must match the task/action. Limits: concurrency 1–2, tasks 1–20, attempts 1–3, timeout 1–300,000ms, output cap 1–65,536 bytes. These are configuration caps, not an implemented scheduler.
- `parseArtifact(...)`: version 1 ID, org/task reference, type and bounded payload. Types: research-note, analysis, draft, test-report, code-proposal. The parser does not prove an artifact's factual truth or task completion. A future executor must bind it to the actual task/organization and enforce the task's output cap.
- JSON data is limited to 5 nested levels, 500 nodes, 100 entries per array/object, 4,096 characters per string and 16,384 serialized UTF-8 bytes. Reject cycles/shared object aliases, executable values, prototype keys, markup/control characters and sparse/custom arrays. This deliberately narrow text-data format is not an arbitrary code/HTML transport.
- `parseCandidateEvidence(value, {now})`: version 1 candidate record with ID, org/product reference, canonical credential-free HTTPS source URL, collection timestamp and plain statement. Timestamps must be valid millisecond UTC ISO strings; collection cannot exceed the reference clock. `now` is optional caller configuration for deterministic analysis, not authenticated time/provenance. URL structure is not official-domain verification or a safe network-fetch policy. No fetching occurs. Candidate evidence cannot contain approval/reviewer flags or be promoted.
- `parseLockedPolicy(...)`: accepts only the current INR 0 Netlify-candidate/no-launch/no-affiliate/no-paid-services policy. No readiness flags become execution authority.

Full claim lifecycle vocabulary is exported as `CLAIM_STATES`, including reverification-required; lifecycle transitions and authenticated decisions are **not** implemented in Phase 1A. Existing six-product candidate-only JSON validators remain unchanged.

## Permission classification and denial

`ACTION_POLICIES` maps 25 action IDs to immutable tier/resource/scope metadata. `classifyAction` returns allowed, human_approval, legal_review or prohibited; unknown values are prohibited. “Allowed” describes an action class, never the current request's authorization.

`evaluateAction({schemaVersion:1, organizationId, actor, action, resource, scope, costINR:0, policy})` always returns `decision: DENY`, `permittedImmediately: false`, `identityAuthenticated: false` and publication/monetization/spending false. Invalid requests are prohibited. Structurally valid requests retain classification while reporting mismatched tenant/resource/scope, prohibited actions, agent approval attempts and the missing identity service. Approval-queue flags are advisory; no request is persisted or sent anywhere.

No caller-supplied verifier, signature, approval or role can change this. A later explicitly scoped identity/authorization service must establish real identity/resource ownership and independent approval; no such authority adapter is exported here. No existing editorial DENY or publishing gate is replaced.

## Logical agent registry

`createAgentRegistry()` loads 41 unique requested role definitions across executive, market, product, customer, growth, revenue and engineering groups. They share research/analysis/engineering preparation pipelines. Each definition includes schema version, configuration version, responsibility, capabilities/tools, input/output contract IDs, zero cost, limits, `enabled:false` and `status:disabled-no-handler`. Role names such as Product Verification do not imply a source was independently verified.

```js
import {createAgentRegistry} from '../../src/platform/agents/registry.mjs';
const registry = createAgentRegistry();
const narrower = registry.configure('market-research-agent', {tools: []});
// registry remains unchanged; narrower has a new version for that role.
```

Methods: `list()` (frozen array), `get(id)` (definition or null), `register(definition)` (new registry; unique ID), `configure(id, patch)` (new registry; only tools/capabilities/limits/enabled fields accepted). Configuration can narrow existing scopes/limits and increments the role version; it cannot broaden them. Registration accepts only known preparation actions/tools and contract IDs, and is capped at 100 definitions. Tools require matching declared capabilities. No handler, owner identity or execution API is accepted. Every definition remains disabled; enabling any role fails until real handlers are implemented in a later authorized phase.

The registry is in-memory immutable configuration, not durable storage, lifecycle execution, inter-agent communication or RBAC. Authentication, database work, orchestration and hosted admin remain outside this phase.
