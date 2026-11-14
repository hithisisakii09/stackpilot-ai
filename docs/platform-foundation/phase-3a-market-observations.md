# Manual candidate market observations

## Interfaces and execution scope

`prepareMarketImport({idempotencyKey,observations},{nowMs?})` performs connection-free structural validation and returns detached frozen candidate records plus a stable source digest. It validates at most ten observations per batch and sorts by series/revision. A dry run cannot check stored references or ancestor history.

`openMarketObservationStore(config)` requires the explicitly selected `stackpilot_market_test` database, `STACKPILOT_MARKET_TEST=1`, matching harness configuration and loopback cluster marker. Transactions use the existing restricted app role, forced RLS and guarded transaction helper. This is a disposable developer scope. Real-owner provisioning and authenticated operational use remain separate owner actions.

`store.scope(organizationId)` offers:

- `apply(batch,{apply:true})` revalidates the captured immutable request against the database clock, scoped product/category/source references and revision ancestry. Identical idempotency keys return the existing result, while changed input conflicts. Identical records under another key retain their existing immutable rows.
- `history(seriesId,{limit?,afterRevision?})` returns ascending revision snapshots, at most fifty per page. Historical declarations retain their original source bindings. Analysis separately revalidates current bindings.
- `analyze({subjectIds,weights,mode})` accepts at most ten subjects and one hundred latest series observations. The method captures request parameters before awaiting and reads observations plus source/product/opportunity bindings in a single statement snapshot. Oversized analysis fails explicitly. `snapshotAt` identifies the statement time.

`analyzeMarketObservations({observations,weights,mode},{nowMs?})` is also available as a bounded pure function. Its callers supply candidate data. It validates included revision histories and returns internal provisional analysis.

## Observation contract

Every record includes seriesId, revision 1–999, supersedesId, categoryId, subjectId, sourceId, sourceUrl, collectedAt, eventAt, metric, value, unit, region, periodStart/periodEnd, evidenceDigest, manual provenance and missing information.

Category and subject identify an existing scoped product. A provided sourceId must identify that product's scoped source, with matching canonical URL and any provided digest. These checks bind records to declared evidence; independent source authenticity remains unreviewed.

URLs follow the existing evidence contract: canonical HTTPS, no credentials, fragment, query or nondefault port. Timestamps use exact UTC `YYYY-MM-DDTHH:mm:ss.sssZ`, from 2000 through the validated reference clock. Period start <= period end <= event <= collection <= current clock. Region is a 2–6 uppercase-letter code supplied by the caller. No region is inferred.

Supported metrics are demand-index, competition-index and feasibility-index. Units are index-0-100, percent or count. Index/percent values range from 0 to 100. Counts are integers from 0 to 1000000000. Unknown value/unit/region/period, sourceId, evidenceDigest or provenance reference use explicit nulls and an exact corresponding missing list. Source URL and collection/event times remain required. Provenance method is manual with a bounded reference string or explicit null.

All records remain candidate/unreviewed. Caller-supplied approval, affiliate or commission fields are rejected. Revision identity is derived from series/revision. Revisions require their exact predecessor and preserve category, subject, source, metric and region. Corrections append rows and preserve history. A series initially lacking a source reference retains that identity; attaching a different source requires a separate series and later evidence reconciliation remains future work.

## Persistence and consistency

Existing market_opportunities and market_observations store internal subject bindings and versioned JSON observation envelopes. Migration 6 adds a candidate-envelope constraint and a partial unique tenant/series/revision index. Legacy rows remain intact. No columns or application grants are added. Migrations 1–5 remain unchanged.

Per-tenant advisory locking serializes imports and local analysis invocations. Intake checks authoritative scoped product/source references under the existing read/insert privileges. Observation rows, import idempotency result, audit and outbox commit or roll back together. App privileges provide INSERT/SELECT without history UPDATE/DELETE. Analysis revalidates authoritative bindings and current latest observations within one statement, so its output represents a coherent declared snapshot. A later privileged source correction can invalidate an earlier candidate declaration and is detected at analysis time.

## Provisional opportunity scoring

Group observations by category, subject and region. Select the latest revision of each series. All three metrics must be present, have complete provenance/value metadata, use index-0-100 units and share one period. Distinct current values for the same metric are contradictory. Missing information, contradictions or incompatible units/periods yield UNKNOWN with a null score and explicit reasons. Values are never filled with zero.

Normalize demand and feasibility as their supplied 0–100 value. Normalize competition as `100 - competition`. Each required weight must be finite and between 0.000001 and 1000000. Divide weights by their sum and calculate the weighted score, rounded to two decimals. Formula version is market-opportunity-v1. This is a documented preparation rubric, with no empirical market-quality claim.

Numeric scores remain provisional and unreviewed. Evidence confidence is always UNKNOWN for this slice because independent review has not occurred. Coverage reports actual required/present metric and observation counts separately. Explanations include normalized factors, weights, contributing observation IDs, review requirements and canonical digests binding observation content, mode, normalized weights and formula version. Numeric scores sort descending, UNKNOWN last, with code-point keys for reproducible ties.

Historical/seasonal modes return explicit insufficient-evidence results requiring comparable history and a reviewed method. This sprint supplies no seasonal forecast or inferred market statistics. No network fetch, LLM, public projection, dashboard, new worker handler or business-role activation is introduced.

## Verification and release gates

Run pure/intake/scoring tests and real PostgreSQL import/revision/snapshot tests in two organizations, followed by the preserved full test/build/preflight and exact-SHA Linux Chromium/axe workflow. Fresh-dist guards reject known market source paths, helper names and private record/formula markers. These are targeted checks with bounded coverage.

Budget remains INR 0. Owner provisioning, authenticated browser acceptance and release authorization remain owner actions. Stop after Phase 3A checkpoint delivery.
