import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openLocalPool} from '../../src/platform/persistence/connection.mjs';
import {createStore, importCandidates} from '../../src/platform/persistence/repositories.mjs';
import {openCompetitorObservationStore} from '../../src/platform/market/competitor-store.mjs';
import pg from 'pg';

const config = JSON.parse(process.env.STACKPILOT_TEST_DB ?? 'null');
if (config?.database !== 'stackpilot_market_test') throw new Error('Use disposable market harness');
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const candidates = {products: read('../../src/data/products.json'), evidenceLeads: read('../../src/data/evidence-leads.json'), claims: read('../../src/data/research-claims.json')};
const alpha = 'org-competitor-alpha', beta = 'org-competitor-beta';
const admin = await openLocalPool(config);
let store, source;
const observation = (patch = {}) => ({
  subjectId: source.product_id, vendorId: source.vendor_id, categoryId: source.category_id,
  sourceId: source.source_id, sourceUrl: source.source_url, evidenceDigest: source.source_digest,
  collectedAt: '2026-01-31T00:00:00.000Z', eventAt: '2026-01-30T00:00:00.000Z',
  periodStart: '2026-01-01T00:00:00.000Z', periodEnd: '2026-01-30T00:00:00.000Z',
  region: 'IN', featureId: 'feature-export', declaration: true, manualReference: 'synthetic-only', ...patch,
});
const batch = (key, records = [observation()]) => ({idempotencyKey: key, observations: records});
const selection = () => ({subjectIds: [source.product_id], featureIds: ['feature-export'], region: 'IN', periodStart: observation().periodStart, periodEnd: observation().periodEnd});

test('manual competitor observations through restricted PostgreSQL', async t => {
  try {
    await t.test('existing migration six supports scoped candidate fixtures and explicit store entry', async () => {
      const app = await openLocalPool({...config, user: 'stackpilot_app'});
      try {
        for (const organizationId of [alpha, beta]) {
          const context = {organizationId, actorId: 'fixture-owner', requestId: 'fixture-request'};
          await createStore(app).transaction(context, repositories => repositories.identity.createOrganization({name: organizationId}));
          await importCandidates(app, context, candidates);
        }
      } finally { await app.end(); }
      source = (await admin.query('SELECT p.id AS product_id,p.vendor_id,p.category_id,e.id AS source_id,e.source_url,e.source_digest FROM products p JOIN evidence_sources e ON e.organization_id=p.organization_id AND e.product_id=p.id WHERE p.organization_id=$1 ORDER BY p.id,e.id LIMIT 1', [alpha])).rows[0];
      store = await openCompetitorObservationStore(config);
    });
    await t.test('explicit apply, concurrent duplicate intake and changed-key conflicts preserve one observation', async () => {
      const scoped = store.scope(alpha), input = batch('competitor-initial');
      await assert.rejects(scoped.apply(input));
      const results = await Promise.all([scoped.apply(input, {apply: true}), scoped.apply(input, {apply: true})]);
      assert.equal(results.filter(result => result.count === 1).length, 1);
      assert.equal((await scoped.compare(selection())).rows[0].declaration, true);
      await assert.rejects(scoped.apply(batch('competitor-initial', [observation({declaration: false})]), {apply: true}));
    });
    await t.test('tenant and authoritative product/vendor/source bindings reject substitutions', async () => {
      for (const patch of [{vendorId: 'foreign-vendor'}, {categoryId: 'foreign-category'}, {subjectId: 'foreign-subject'}, {sourceId: 'foreign-source'}, {sourceUrl: 'https://example.com/altered'}, {evidenceDigest: 'f'.repeat(64)}]) {
        await assert.rejects(store.scope(alpha).apply(batch('invalid-' + Object.keys(patch)[0].toLowerCase(), [observation(patch)]), {apply: true}));
      }
      assert.equal((await store.scope(beta).compare(selection())).rows[0].declaration, null);
      await admin.query("INSERT INTO evidence_sources(organization_id,id,product_id,source_url,collected_at,source_digest) VALUES ($1,'competitor-beta-source',$2,'https://example.com/beta',CURRENT_TIMESTAMP,repeat('b',64))", [beta, source.product_id]);
      await assert.rejects(store.scope(alpha).apply(batch('real-cross-tenant', [observation({sourceId: 'competitor-beta-source', sourceUrl: 'https://example.com/beta', evidenceDigest: 'b'.repeat(64)})]), {apply: true}));
    });
    await t.test('captured inputs survive caller mutation and contradictory records remain UNKNOWN', async () => {
      const record = observation({featureId: 'feature-mutation'});
      const pending = store.scope(alpha).apply(batch('competitor-mutation', [record]), {apply: true});
      record.declaration = false;
      await pending;
      assert.equal((await store.scope(alpha).compare({...selection(), featureIds: ['feature-mutation']})).rows[0].declaration, true);
      await store.scope(alpha).apply(batch('competitor-conflict', [observation({declaration: false})]), {apply: true});
      const comparison = await store.scope(alpha).compare(selection());
      assert.equal(comparison.rows[0].declaration, null);
      assert.ok(comparison.rows[0].reasons.includes('conflicting-declarations'));
      assert.equal(comparison.rows[0].evidenceConfidence, 'UNKNOWN');
    });
    await t.test('source corrections invalidate comparison and app role cannot rewrite observations', async () => {
      await admin.query('UPDATE evidence_sources SET source_digest=repeat(\'f\',64) WHERE organization_id=$1 AND id=$2', [alpha, source.source_id]);
      try { await assert.rejects(store.scope(alpha).compare(selection())); }
      finally { await admin.query('UPDATE evidence_sources SET source_digest=$1 WHERE organization_id=$2 AND id=$3', [source.source_digest, alpha, source.source_id]); }
      const app = await openLocalPool({...config, user: 'stackpilot_app'});
      try {
        await assert.rejects(app.query('UPDATE competitors SET observation=observation'));
        await assert.rejects(app.query('DELETE FROM competitors'));
      } finally { await app.end(); }
    });
    await t.test('comparison captures selection and one statement source snapshot across concurrent corrections', async context => {
      const input = {...selection(), featureIds: ['feature-mutation']};
      const pending = store.scope(alpha).compare(input);
      input.featureIds[0] = 'feature-missing';
      assert.equal((await pending).rows[0].declaration, true);
      const originalQuery = pg.Client.prototype.query;
      let changed = false;
      const mocked = context.mock.method(pg.Client.prototype, 'query', function(...args) {
        const queryText = typeof args[0] === 'string' ? args[0] : args[0]?.text;
        const result = originalQuery.apply(this, args);
        if (!changed && queryText?.includes('WITH selected_products') && result?.then) {
          changed = true;
          return result.then(async rows => {
            await admin.query("UPDATE evidence_sources SET source_digest=repeat('f',64) WHERE organization_id=$1 AND id=$2", [alpha, source.source_id]);
            return rows;
          });
        }
        return result;
      });
      try {
        const comparison = await store.scope(alpha).compare({...selection(), featureIds: ['feature-mutation']});
        assert.equal(changed, true);
        assert.equal(comparison.rows[0].declaration, true);
        await assert.rejects(store.scope(alpha).compare(selection()));
      } finally {
        mocked.mock.restore();
        await admin.query('UPDATE evidence_sources SET source_digest=$1 WHERE organization_id=$2 AND id=$3', [source.source_digest, alpha, source.source_id]);
      }
    });
    await t.test('actual outbox failure rolls records, idempotency and audit back atomically', async () => {
      const counts = async () => (await admin.query('SELECT (SELECT count(*) FROM competitors) AS records,(SELECT count(*) FROM idempotency_keys) AS keys,(SELECT count(*) FROM audit_events) AS audits,(SELECT count(*) FROM outbox_events) AS outbox')).rows[0];
      const before = await counts();
      await admin.query("CREATE FUNCTION fixture_competitor_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='manual-competitor-imported' THEN RAISE EXCEPTION 'fixture'; END IF; RETURN NEW; END $$; CREATE TRIGGER fixture_competitor_failure BEFORE INSERT ON outbox_events FOR EACH ROW EXECUTE FUNCTION fixture_competitor_failure()");
      const input = batch('competitor-rollback', [observation({featureId: 'feature-rollback'})]);
      try {
        await assert.rejects(store.scope(alpha).apply(input, {apply: true}));
        assert.deepEqual(await counts(), before);
      } finally { await admin.query('DROP TRIGGER fixture_competitor_failure ON outbox_events; DROP FUNCTION fixture_competitor_failure()'); }
      assert.equal((await store.scope(alpha).apply(input, {apply: true})).count, 1);
    });
  } finally {
    if (store) await store.close();
    await admin.end();
  }
});
