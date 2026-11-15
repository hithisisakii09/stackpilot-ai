import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import pg from 'pg';
import {openLocalPool} from '../../src/platform/persistence/connection.mjs';
import {createStore, importCandidates} from '../../src/platform/persistence/repositories.mjs';
import {openMarketObservationStore} from '../../src/platform/market/store.mjs';
import {openReconciliationStore} from '../../src/platform/market/reconciliation-store.mjs';

const config = JSON.parse(process.env.STACKPILOT_TEST_DB ?? 'null');
if (config?.database !== 'stackpilot_market_test') throw new Error('Use disposable market harness');
const admin = await openLocalPool(config);
const alpha = 'org-history-alpha', beta = 'org-history-beta', cycles = 'org-history-cycles', overflow = 'org-history-overflow';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const candidates = {products: read('../../src/data/products.json'), evidenceLeads: read('../../src/data/evidence-leads.json'), claims: read('../../src/data/research-claims.json')};
let market, store, source, initialIds;
function observation(month, value, patch = {}) {
  const start = Date.parse(month + '-01T00:00:00.000Z'), date = new Date(start);
  const next = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  return {seriesId: 'history-' + month, revision: 1, supersedesId: null, categoryId: source.category_id, subjectId: source.product_id, sourceId: source.source_id, sourceUrl: source.source_url, evidenceDigest: source.source_digest, collectedAt: new Date(next).toISOString(), eventAt: new Date(next - 1).toISOString(), metric: 'demand-index', value, unit: 'index-0-100', region: 'IN', periodStart: new Date(start).toISOString(), periodEnd: new Date(next - 1).toISOString(), provenance: {method: 'manual', reference: 'synthetic-history-only'}, missing: [], ...patch};
}
const selection = () => ({subjectIds: [source.product_id], metric: 'demand-index', unit: 'index-0-100', region: 'IN', fromMonth: '2025-01', throughMonth: '2025-02'});

test('historical market analysis through a coherent restricted database snapshot', async t => {
  try {
    await t.test('existing migration seven supports isolated historical fixture organizations', async () => {
      const app = await openLocalPool({...config, user: 'stackpilot_app'});
      try {
        for (const organizationId of [alpha, beta, cycles, overflow]) {
          const context = {organizationId, actorId: 'fixture-owner', requestId: 'fixture-request'};
          await createStore(app).transaction(context, repositories => repositories.identity.createOrganization({name: organizationId}));
          await importCandidates(app, context, candidates);
        }
      } finally { await app.end(); }
      source = (await admin.query('SELECT p.id AS product_id,p.category_id,e.id AS source_id,e.source_url,e.source_digest FROM products p JOIN evidence_sources e ON e.organization_id=p.organization_id AND e.product_id=p.id WHERE p.organization_id=$1 ORDER BY p.id,e.id LIMIT 1', [alpha])).rows[0];
      market = await openMarketObservationStore(config);
      store = await openReconciliationStore(config);
      initialIds = (await market.scope(alpha).apply({idempotencyKey: 'initial-history', observations: [observation('2025-01', 10), observation('2025-02', 15)]}, {apply: true})).observationIds;
    });
    await t.test('repeated historical reads reproduce arithmetic and leave all domain tables unchanged', async () => {
      const counts = async () => (await admin.query('SELECT (SELECT count(*) FROM market_observations) AS observations,(SELECT count(*) FROM reconciliation_links) AS links,(SELECT count(*) FROM idempotency_keys) AS keys,(SELECT count(*) FROM audit_events) AS audit,(SELECT count(*) FROM outbox_events) AS outbox')).rows[0];
      const before = await counts(), result = await store.scope(alpha).historical(selection());
      assert.equal(result.subjects[0].comparisons[0].absoluteChange, 5);
      assert.equal(result.subjects[0].comparisons[0].relativeChangePercent, 50);
      assert.deepEqual(result, await store.scope(alpha).historical(selection()));
      assert.deepEqual(await counts(), before);
    });
    await t.test('tenant isolation and missing or invalid selections remain explicit', async () => {
      const empty = await store.scope(beta).historical(selection());
      assert.equal(empty.history.length, 0);
      assert.ok(empty.subjects[0].periods.every(period => period.value === null));
      await assert.rejects(store.scope(alpha).historical({...selection(), subjectIds: ['foreign-product']}));
      await assert.rejects(store.scope(alpha).historical({...selection(), approved: true}));
    });
    await t.test('caller mutation after invocation cannot replace the selected history', async () => {
      const input = selection(), pending = store.scope(alpha).historical(input);
      input.subjectIds[0] = 'foreign-product'; input.fromMonth = '2024-01';
      const result = await pending;
      assert.equal(result.selection.fromMonth, '2025-01');
      assert.equal(result.subjects[0].coverage.expectedMonths, 2);
    });
    await t.test('a concurrent source correction preserves one read snapshot and invalidates the next', async context => {
      const originalQuery = pg.Client.prototype.query;
      let changed = false;
      const mocked = context.mock.method(pg.Client.prototype, 'query', function(...args) {
        const queryText = typeof args[0] === 'string' ? args[0] : args[0]?.text;
        const result = originalQuery.apply(this, args);
        if (!changed && queryText?.includes('selected_links AS') && result?.then) {
          changed = true;
          return result.then(async rows => { await admin.query("UPDATE evidence_sources SET source_digest=repeat('f',64) WHERE organization_id=$1 AND id=$2", [alpha, source.source_id]); return rows; });
        }
        return result;
      });
      try {
        const before = await store.scope(alpha).historical(selection());
        assert.equal(changed, true);
        assert.equal(before.subjects[0].comparisons[0].absoluteChange, 5);
        const after = await store.scope(alpha).historical(selection());
        assert.equal(after.subjects[0].comparisons[0].absoluteChange, null);
        assert.ok(after.subjects[0].periods[0].reasons.includes('stale-source-binding'));
        assert.notEqual(before.inputDigest, after.inputDigest);
      } finally {
        mocked.mock.restore();
        await admin.query('UPDATE evidence_sources SET source_digest=$1 WHERE organization_id=$2 AND id=$3', [source.source_digest, alpha, source.source_id]);
      }
    });
    await t.test('candidate correction proposals remain unresolved in historical calculations', async () => {
      const corrected = (await market.scope(alpha).apply({idempotencyKey: 'corrected-history', observations: [observation('2025-01', 20, {seriesId: 'corrected-january'})]}, {apply: true})).observationIds[0];
      const original = (await admin.query("SELECT id FROM market_observations WHERE organization_id=$1 AND observation->>'seriesId'='history-2025-01'", [alpha])).rows[0].id;
      await store.scope(alpha).propose({idempotencyKey: 'history-correction', domain: 'market', fromId: original, toId: corrected, reason: 'Synthetic history correction'}, {apply: true});
      const result = await store.scope(alpha).historical(selection());
      assert.equal(result.subjects[0].periods[0].value, null);
      assert.ok(result.subjects[0].periods[0].reasons.includes('unresolved-reconciliation'));
      assert.equal(result.links.length, 1);
    });
    await t.test('a revision beyond the displayed window cannot revive the previous period value', async () => {
      const original = (await admin.query("SELECT id FROM market_observations WHERE organization_id=$1 AND observation->>'seriesId'='history-2025-02'", [alpha])).rows[0].id;
      await market.scope(alpha).apply({idempotencyKey: 'period-reassignment', observations: [observation('2025-03', 30, {seriesId: 'history-2025-02', revision: 2, supersedesId: original})]}, {apply: true});
      const result = await store.scope(alpha).historical(selection());
      assert.equal(result.subjects[0].periods[1].value, null);
      assert.ok(result.subjects[0].periods[1].reasons.includes('revision-period-changed'));
      assert.ok(result.history.some(row => row.id !== initialIds[0] && row.id !== initialIds[1]));
    });
    await t.test('two full synthetic calendar cycles expose coverage and prior-year arithmetic', async () => {
      const records = Array.from({length: 24}, (_, index) => observation(new Date(Date.UTC(2024, index, 1)).toISOString().slice(0, 7), 10 + index));
      for (let offset = 0; offset < records.length; offset += 10) await market.scope(cycles).apply({idempotencyKey: 'cycle-import-' + offset, observations: records.slice(offset, offset + 10)}, {apply: true});
      const result = await store.scope(cycles).historical({...selection(), fromMonth: '2024-01', throughMonth: '2025-12'});
      assert.equal(result.subjects[0].seasonality.coverageStatus, 'sufficient-history');
      assert.equal(result.subjects[0].seasonality.status, 'review-required');
      assert.equal(result.subjects[0].yearOverYear[0].absoluteChange, 12);
      const withGap = await store.scope(cycles).historical({...selection(), fromMonth: '2023-12', throughMonth: '2025-12'});
      assert.equal(withGap.subjects[0].seasonality.coverageStatus, 'sufficient-history');
      assert.deepEqual(withGap.subjects[0].coverage.missingMonths, ['2023-12']);
    });
    await t.test('oversized context is rejected instead of silently truncating contributing evidence', async () => {
      for (let offset = 0; offset < 101; offset += 10) {
        const records = Array.from({length: Math.min(10, 101 - offset)}, (_, index) => observation('2025-01', 10, {seriesId: 'overflow-' + (offset + index)}));
        await market.scope(overflow).apply({idempotencyKey: 'overflow-import-' + offset, observations: records}, {apply: true});
      }
      await assert.rejects(store.scope(overflow).historical(selection()));
    });
  } finally {
    if (store) await store.close();
    if (market) await market.close();
    await admin.end();
  }
});
