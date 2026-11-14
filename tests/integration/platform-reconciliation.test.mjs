import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import pg from 'pg';
import {openLocalPool} from '../../src/platform/persistence/connection.mjs';
import {applyMigrations} from '../../src/platform/persistence/migrate.mjs';
import {createStore, importCandidates} from '../../src/platform/persistence/repositories.mjs';
import {openCompetitorObservationStore} from '../../src/platform/market/competitor-store.mjs';
import {openMarketObservationStore} from '../../src/platform/market/store.mjs';
import {openReconciliationStore} from '../../src/platform/market/reconciliation-store.mjs';

const config = JSON.parse(process.env.STACKPILOT_TEST_DB ?? 'null');
if (config?.database !== 'stackpilot_market_test') throw new Error('Use disposable market harness');
const admin = await openLocalPool(config);
const alpha = 'org-reconciliation-alpha', beta = 'org-reconciliation-beta';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const candidates = {products: read('../../src/data/products.json'), evidenceLeads: read('../../src/data/evidence-leads.json'), claims: read('../../src/data/research-claims.json')};
let store, competitors, market, source, competitorIds;
const context = {region: 'IN', periodStart: '2026-01-01T00:00:00.000Z', periodEnd: '2026-01-30T00:00:00.000Z'};
const common = () => ({subjectId: source.product_id, categoryId: source.category_id, sourceId: source.source_id, sourceUrl: source.source_url, evidenceDigest: source.source_digest, collectedAt: '2026-01-31T00:00:00.000Z', eventAt: '2026-01-30T00:00:00.000Z', ...context});
const competitor = (declaration, featureId = 'feature-export') => ({...common(), vendorId: source.vendor_id, featureId, declaration, manualReference: 'synthetic-only'});
const marketRecord = (metric, value, seriesId = 'reconcile-' + metric) => ({...common(), seriesId, revision: 1, supersedesId: null, metric, value, unit: 'index-0-100', provenance: {method: 'manual', reference: 'synthetic-only'}, missing: []});
const select = () => ({domain: 'competitor', selection: {subjectIds: [source.product_id], featureIds: ['feature-export'], ...context}});
const proposal = (key, patch = {}) => ({idempotencyKey: key, domain: 'competitor', fromId: competitorIds[0], toId: competitorIds[1], reason: 'Synthetic correction', ...patch});

test('candidate reconciliation on real restricted PostgreSQL', async t => {
  try {
    await t.test('migration seven upgrades and initializes existing candidate fixtures', async () => {
      assert.deepEqual(await applyMigrations(admin, {targetVersion: 7}), {version: 7, applied: true});
      assert.deepEqual(await applyMigrations(admin, {targetVersion: 7}), {version: 7, applied: false});
      const app = await openLocalPool({...config, user: 'stackpilot_app'});
      try {
        for (const organizationId of [alpha, beta]) {
          const scope = {organizationId, actorId: 'fixture-owner', requestId: 'fixture-request'};
          await createStore(app).transaction(scope, repositories => repositories.identity.createOrganization({name: organizationId}));
          await importCandidates(app, scope, candidates);
        }
      } finally { await app.end(); }
      source = (await admin.query('SELECT p.id AS product_id,p.vendor_id,p.category_id,e.id AS source_id,e.source_url,e.source_digest FROM products p JOIN evidence_sources e ON e.organization_id=p.organization_id AND e.product_id=p.id WHERE p.organization_id=$1 ORDER BY p.id,e.id LIMIT 1', [alpha])).rows[0];
      store = await openReconciliationStore(config);
      competitors = await openCompetitorObservationStore(config);
      market = await openMarketObservationStore(config);
      competitorIds = [];
      for (const [index, declaration] of [true, false, null].entries()) {
        competitorIds.push((await competitors.scope(alpha).apply({idempotencyKey: 'reconcile-competitor-' + index, observations: [competitor(declaration)]}, {apply: true})).observationIds[0]);
      }
      const observations = [marketRecord('demand-index', 80), marketRecord('competition-index', 20), marketRecord('feasibility-index', 60), marketRecord('demand-index', 30, 'corrected-demand-series')];
      await market.scope(alpha).apply({idempotencyKey: 'reconcile-market-fixture', observations}, {apply: true});
    });
    await t.test('fresh migration and failed upgrade retain canonical atomic history and narrow grants', async () => {
      const fresh = await openLocalPool({...config, database: 'stackpilot_reconciliation_fresh'});
      const failure = await openLocalPool({...config, database: 'stackpilot_reconciliation_failure'});
      try {
        assert.deepEqual(await applyMigrations(fresh, {targetVersion: 7}), {version: 7, applied: true});
        assert.equal((await fresh.query('SELECT count(*) FROM _platform_migrations')).rows[0].count, '7');
        const security = (await fresh.query("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid='reconciliation_links'::regclass")).rows[0];
        assert.deepEqual(security, {relrowsecurity: true, relforcerowsecurity: true});
        await applyMigrations(failure, {targetVersion: 6});
        await failure.query('CREATE TABLE reconciliation_links(id text)');
        await assert.rejects(applyMigrations(failure, {targetVersion: 7}));
        assert.equal((await failure.query('SELECT max(version) FROM _platform_migrations')).rows[0].max, 6);
        assert.equal((await failure.query("SELECT to_regclass('reconciliation_links_market_target') AS name")).rows[0].name, null);
      } finally { await fresh.end(); await failure.end(); }
    });
    await t.test('concurrent proposals are idempotent and preserve all contradictory observations', async () => {
      const scoped = store.scope(alpha), request = proposal('first-proposal');
      await assert.rejects(scoped.propose(request));
      const results = await Promise.all([scoped.propose(request, {apply: true}), scoped.propose(request, {apply: true})]);
      assert.equal(results.filter(result => result.applied).length, 1);
      const result = await scoped.analyze(select());
      assert.equal(result.history.length, 3);
      assert.equal(result.links.length, 1);
      assert.equal(result.analysis.rows[0].declaration, null);
      assert.ok(result.analysis.rows[0].reasons.includes('unresolved-reconciliation'));
      await assert.rejects(scoped.propose(proposal('first-proposal', {reason: 'Changed reason'}), {apply: true}));
    });
    await t.test('cross-tenant, forged authority, competing successor and cycle proposals fail', async () => {
      await assert.rejects(store.scope(beta).propose(proposal('foreign-tenant'), {apply: true}));
      await assert.rejects(store.scope(alpha).propose(proposal('forged-owner', {approved: true}), {apply: true}));
      await assert.rejects(store.scope(alpha).propose(proposal('competing-link', {toId: competitorIds[2]}), {apply: true}));
      await assert.rejects(store.scope(alpha).propose(proposal('cycle-link', {fromId: competitorIds[1], toId: competitorIds[0]}), {apply: true}));
      const foreign = await store.scope(beta).analyze(select());
      assert.equal(foreign.links.length, 0);
      assert.deepEqual(foreign.missingSubjects, [source.product_id]);
    });
    await t.test('market correction binds current records while preserving all source history', async () => {
      const original = (await admin.query("SELECT id FROM market_observations WHERE organization_id=$1 AND observation->>'seriesId'='reconcile-demand-index'", [alpha])).rows[0].id;
      const correction = (await admin.query("SELECT id FROM market_observations WHERE organization_id=$1 AND observation->>'seriesId'='corrected-demand-series'", [alpha])).rows[0].id;
      await store.scope(alpha).propose({idempotencyKey: 'market-proposal', domain: 'market', fromId: original, toId: correction, reason: 'Synthetic market correction'}, {apply: true});
      const result = await store.scope(alpha).analyze({domain: 'market', selection: {...select().selection, featureIds: ['demand-index', 'competition-index', 'feasibility-index']}, weights: {'demand-index': 1, 'competition-index': 1, 'feasibility-index': 1}});
      assert.equal(result.history.length, 4);
      assert.equal(result.links.length, 1);
      assert.equal(result.analysis.opportunities[0].score, null);
      assert.ok(result.analysis.opportunities[0].reasons.includes('unresolved-reconciliation'));
    });
    await t.test('captured requests and one-statement source snapshots survive concurrent changes', async contextTest => {
      const records = await competitors.scope(alpha).apply({idempotencyKey: 'mutation-records', observations: [competitor(true, 'feature-mutation'), competitor(false, 'feature-mutation')]}, {apply: true});
      const request = proposal('captured-link', {fromId: records.observationIds[0], toId: records.observationIds[1]});
      const pending = store.scope(alpha).propose(request, {apply: true});
      request.reason = 'Mutated reason';
      assert.equal((await pending).record.reason, 'Synthetic correction');
      const originalQuery = pg.Client.prototype.query;
      let changed = false;
      const mocked = contextTest.mock.method(pg.Client.prototype, 'query', function(...args) {
        const queryText = typeof args[0] === 'string' ? args[0] : args[0]?.text;
        const result = originalQuery.apply(this, args);
        if (!changed && queryText?.includes('selected_links AS') && result?.then) {
          changed = true;
          return result.then(async rows => { await admin.query("UPDATE evidence_sources SET source_digest=repeat('f',64) WHERE organization_id=$1 AND id=$2", [alpha, source.source_id]); return rows; });
        }
        return result;
      });
      try {
        const before = await store.scope(alpha).analyze(select());
        assert.equal(changed, true);
        assert.ok(before.history.every(row => !row.reasons.includes('stale-source-binding')));
        const after = await store.scope(alpha).analyze(select());
        assert.ok(after.history.every(row => row.reasons.includes('stale-source-binding')));
        assert.notEqual(before.inputDigest, after.inputDigest);
        await assert.rejects(store.scope(alpha).propose(proposal('stale-target'), {apply: true}));
      } finally {
        mocked.mock.restore();
        await admin.query('UPDATE evidence_sources SET source_digest=$1 WHERE organization_id=$2 AND id=$3', [source.source_digest, alpha, source.source_id]);
      }
    });
    await t.test('actual outbox failure rolls proposal, key and audit back atomically', async () => {
      const records = await competitors.scope(alpha).apply({idempotencyKey: 'rollback-records', observations: [competitor(true, 'feature-rollback'), competitor(false, 'feature-rollback')]}, {apply: true});
      const counts = async () => (await admin.query('SELECT (SELECT count(*) FROM reconciliation_links) AS links,(SELECT count(*) FROM idempotency_keys) AS keys,(SELECT count(*) FROM audit_events) AS audit,(SELECT count(*) FROM outbox_events) AS outbox')).rows[0];
      const before = await counts();
      await admin.query("CREATE FUNCTION fixture_reconciliation_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='candidate-reconciliation-proposed' THEN RAISE EXCEPTION 'fixture'; END IF; RETURN NEW; END $$; CREATE TRIGGER fixture_reconciliation_failure BEFORE INSERT ON outbox_events FOR EACH ROW EXECUTE FUNCTION fixture_reconciliation_failure()");
      const request = proposal('rollback-link', {fromId: records.observationIds[0], toId: records.observationIds[1]});
      try { await assert.rejects(store.scope(alpha).propose(request, {apply: true})); assert.deepEqual(await counts(), before); }
      finally { await admin.query('DROP TRIGGER fixture_reconciliation_failure ON outbox_events; DROP FUNCTION fixture_reconciliation_failure()'); }
      assert.equal((await store.scope(alpha).propose(request, {apply: true})).applied, true);
    });
    await t.test('restricted role cannot rewrite links or cross tenant foreign keys', async () => {
      const app = await openLocalPool({...config, user: 'stackpilot_app'});
      try {
        await assert.rejects(app.query('UPDATE reconciliation_links SET record=record'));
        await assert.rejects(app.query('DELETE FROM reconciliation_links'));
        assert.equal((await app.query('SELECT count(*) FROM reconciliation_links')).rows[0].count, '0');
        const linked = (await store.scope(alpha).analyze(select())).links[0];
        const client = await app.connect();
        try {
          await client.query('BEGIN');
          await client.query("SELECT set_config('stackpilot.organization_id',$1,true)", [beta]);
          await assert.rejects(client.query('INSERT INTO reconciliation_links(organization_id,id,domain,competitor_from_id,competitor_to_id,record) VALUES ($1,$2,\'competitor\',$3,$4,$5::jsonb)', [beta, linked.id, linked.fromId, linked.toId, JSON.stringify(linked)]), {code: '23503'});
        } finally { await client.query('ROLLBACK'); client.release(); }
      } finally { await app.end(); }
    });
  } finally {
    if (store) await store.close();
    if (competitors) await competitors.close();
    if (market) await market.close();
    await admin.end();
  }
});
