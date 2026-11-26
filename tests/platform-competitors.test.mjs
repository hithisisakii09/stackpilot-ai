import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareCompetitorImport, compareCompetitorObservations} from '../src/platform/market/competitors.mjs';
import {auditLocalControlPlaneExport} from '../src/lib/local-control-plane-export.mjs';

const record = (patch = {}) => ({
  subjectId: 'product-one', vendorId: 'vendor-one', categoryId: 'category-one',
  sourceId: 'source-one', sourceUrl: 'https://example.com/source', evidenceDigest: 'a'.repeat(64),
  collectedAt: '2026-01-31T00:00:00.000Z', eventAt: '2026-01-30T00:00:00.000Z',
  periodStart: '2026-01-01T00:00:00.000Z', periodEnd: '2026-01-30T00:00:00.000Z',
  region: 'IN', featureId: 'feature-export', declaration: true, manualReference: 'synthetic-only', ...patch,
});
const batch = observations => ({idempotencyKey: 'competitor-import', observations});
const request = observations => ({observations, subjectIds: ['product-two', 'product-one'], featureIds: ['feature-export'], region: 'IN', periodStart: record().periodStart, periodEnd: record().periodEnd});

test('competitor dry run is immutable, content addressed and independent of input order', () => {
  const input = record();
  const prepared = prepareCompetitorImport(batch([input]));
  input.declaration = false;
  assert.equal(prepared.observations[0].declaration, true);
  assert.equal(prepared.observations[0].reviewState, 'unreviewed');
  assert.ok(Object.isFrozen(prepared.observations[0]));
  assert.equal(prepared.sourceDigest, prepareCompetitorImport(batch([record()])).sourceDigest);
  assert.equal(prepared.dryRun, true);
});

test('competitor contracts reject unsafe dates, URLs, references, authority and hostile objects', () => {
  for (const patch of [{sourceUrl: 'http://example.com/'}, {sourceUrl: 'https://example.com/?secret=x'}, {sourceUrl: 'https://a:b@example.com/'}, {eventAt: '2999-01-01T00:00:00.000Z'}, {periodEnd: '2026-02-01T00:00:00.000Z'}, {evidenceDigest: null}, {manualReference: ''}, {declaration: 'yes'}, {approved: true}, {commission: 1}, {vendorId: '../vendor'}]) {
    assert.throws(() => prepareCompetitorImport(batch([record(patch)])));
  }
  let reads = 0;
  const hostile = Object.defineProperty(record(), 'declaration', {enumerable: true, get() { reads++; return true; }});
  assert.throws(() => prepareCompetitorImport(batch([hostile])));
  assert.equal(reads, 0);
});

test('comparison preserves missing subjects, nulls and conflicts with UNKNOWN confidence', () => {
  const input = [record(), record({sourceId: 'source-two', declaration: false})];
  const result = compareCompetitorObservations(request(input));
  assert.equal(result.rows.length, 2);
  assert.deepEqual(result.rows.map(row => row.declaration), [null, null]);
  assert.ok(result.rows[0].reasons.includes('conflicting-declarations'));
  assert.ok(result.rows[1].reasons.includes('missing-observation'));
  assert.equal(result.rows[0].evidenceConfidence, 'UNKNOWN');
  const unknown = compareCompetitorObservations(request([record({declaration: null})]));
  assert.ok(unknown.rows[0].reasons.includes('unknown-declaration'));
});

test('comparison order and digest bind context and all contributing immutable observations', () => {
  const observations = [record(), record({subjectId: 'product-two', declaration: false})];
  const result = compareCompetitorObservations(request(observations));
  assert.deepEqual(result, compareCompetitorObservations(request([...observations].reverse())));
  assert.deepEqual(result.rows.map(row => row.declaration), [true, false]);
  assert.notEqual(result.inputDigest, compareCompetitorObservations({...request(observations), subjectIds: ['product-one']}).inputDigest);
  assert.throws(() => compareCompetitorObservations(request([record({region: 'US'})])));
});

test('competitor private helpers and envelopes cannot enter generic static assets', () => {
  for (const marker of ['prepareCompetitorImport', 'openCompetitorObservationStore', 'manual-competitor-observation-v1', 'normalizeCompetitorComparison']) {
    assert.equal(auditLocalControlPlaneExport([{path: 'assets/generic.js', content: marker}]).violations.length, 1);
  }
  assert.equal(auditLocalControlPlaneExport([{path: 'data/competitors.json', content: '{}'}]).violations.length, 1);
});

test('comparison rejects reassigned subject identity and incompatible categories', () => {
  assert.throws(() => compareCompetitorObservations(request([record(), record({subjectId: 'product-two', categoryId: 'category-two'})])));
  assert.throws(() => compareCompetitorObservations(request([record(), record({vendorId: 'vendor-two'})])));
});

test('comparison supports its full one hundred observation bound and rejects overflow', () => {
  const observations = Array.from({length: 100}, (_, index) => record({sourceId: 'source-' + index}));
  assert.equal(compareCompetitorObservations(request(observations)).rows[0].observationIds.length, 100);
  assert.throws(() => compareCompetitorObservations(request([...observations, record({sourceId: 'source-overflow'})])));
});
