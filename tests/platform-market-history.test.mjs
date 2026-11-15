import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeMarketHistory, prepareMarketHistorySelection} from '../src/platform/market/seasonality.mjs';
import {prepareReconciliation} from '../src/platform/market/reconciliation.mjs';
import {normalizeMarketObservation} from '../src/platform/market/observations.mjs';
import {auditLocalControlPlaneExport} from '../src/lib/local-control-plane-export.mjs';

function observation(month, value, patch = {}) {
  const start = Date.parse(month + '-01T00:00:00.000Z');
  const date = new Date(start), next = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  return {seriesId: 'series-' + month, revision: 1, supersedesId: null, categoryId: 'category-one', subjectId: 'product-one', sourceId: 'source-one', sourceUrl: 'https://example.com/source', evidenceDigest: 'a'.repeat(64), collectedAt: new Date(next).toISOString(), eventAt: new Date(next - 1).toISOString(), metric: 'demand-index', value, unit: 'index-0-100', region: 'IN', periodStart: new Date(start).toISOString(), periodEnd: new Date(next - 1).toISOString(), provenance: {method: 'manual', reference: 'synthetic-only'}, missing: [], ...patch};
}
const selection = {subjectIds: ['product-one'], metric: 'demand-index', unit: 'index-0-100', region: 'IN', fromMonth: '2025-01', throughMonth: '2025-02'};
const request = (observations, patch = {}) => ({selection, observations, links: [], staleIds: [], ...patch});

test('completed monthly history yields reproducible candidate arithmetic and source coverage', () => {
  const records = [observation('2025-01', 10), observation('2025-02', 15)];
  const result = analyzeMarketHistory(request(records));
  const row = result.subjects[0];
  assert.equal(row.comparisons[0].absoluteChange, 5);
  assert.equal(row.comparisons[0].relativeChangePercent, 50);
  assert.equal(row.coverage.comparableMonths, 2);
  assert.equal(row.evidenceConfidence, 'UNKNOWN');
  assert.equal(row.seasonality.status, 'insufficient-evidence');
  assert.deepEqual(result, analyzeMarketHistory(request([...records].reverse())));
});

test('gaps, duplicate observations and contradictory declarations stay explicit', () => {
  const jan = observation('2025-01', 10), mar = observation('2025-03', 20);
  const gap = analyzeMarketHistory(request([jan, mar], {selection: {...selection, throughMonth: '2025-03'}})).subjects[0];
  assert.deepEqual(gap.coverage.missingMonths, ['2025-02']);
  assert.ok(gap.comparisons.every(row => row.absoluteChange === null));
  const duplicated = analyzeMarketHistory(request([jan, jan, observation('2025-02', 15)]));
  assert.equal(duplicated.subjects[0].periods[0].observationIds.length, 1);
  const conflicting = analyzeMarketHistory(request([jan, observation('2025-01', 20, {seriesId: 'second-source', sourceId: 'source-two'})]));
  assert.ok(conflicting.subjects[0].periods[0].reasons.includes('contradictory-values'));
});

test('zero baselines and percentage-point changes retain explicit calculation semantics', () => {
  const zero = analyzeMarketHistory(request([observation('2025-01', 0), observation('2025-02', 10)])).subjects[0].comparisons[0];
  assert.equal(zero.absoluteChange, 10);
  assert.equal(zero.relativeChangePercent, null);
  assert.ok(zero.reasons.includes('zero-baseline'));
  const points = analyzeMarketHistory(request([observation('2025-01', 10, {unit: 'percent'}), observation('2025-02', 15, {unit: 'percent'})], {selection: {...selection, unit: 'percent'}}));
  assert.equal(points.subjects[0].comparisons[0].changeUnit, 'percentage-points');
  const extreme = analyzeMarketHistory(request([observation('2025-01', Number.MIN_VALUE), observation('2025-02', 10)])).subjects[0].comparisons[0];
  assert.equal(extreme.relativeChangePercent, null);
  assert.ok(extreme.reasons.includes('nonfinite-relative-change'));
});

test('overlap, incompatible units and missing information block monthly values', () => {
  for (const patch of [{periodStart: '2025-01-15T00:00:00.000Z'}, {unit: 'percent'}, {value: null, missing: ['value']}]) {
    const result = analyzeMarketHistory(request([observation('2025-01', 10, patch)]));
    assert.equal(result.subjects[0].periods[0].value, null);
  }
});

test('source drift and correction proposals remain digest-bound UNKNOWN history', () => {
  const original = observation('2025-01', 10), correction = observation('2025-01', 20, {seriesId: 'correction-series'});
  const base = analyzeMarketHistory(request([original, observation('2025-02', 15)]));
  const stale = analyzeMarketHistory(request([original, observation('2025-02', 15)], {staleIds: [normalizeMarketObservation(original).id]}));
  assert.equal(stale.subjects[0].periods[0].value, null);
  assert.notEqual(stale.subjects[0].inputDigest, base.subjects[0].inputDigest);
  const link = prepareReconciliation({domain: 'market', from: original, to: correction, reason: 'Synthetic correction'});
  const linked = analyzeMarketHistory(request([original, correction], {links: [link]}));
  assert.ok(linked.subjects[0].periods[0].reasons.includes('unresolved-reconciliation'));
});

test('revision history prevents period reassignment and incomplete ancestors becoming comparisons', () => {
  const original = normalizeMarketObservation(observation('2025-01', 10));
  const revised = observation('2025-02', 15, {seriesId: original.seriesId, revision: 2, supersedesId: original.id});
  const result = analyzeMarketHistory(request([original, revised]));
  assert.ok(result.subjects[0].periods[0].reasons.includes('revision-period-changed'));
  const missing = analyzeMarketHistory(request([revised]));
  assert.ok(missing.subjects[0].periods[1].reasons.includes('incomplete-revision-history'));
});

test('twenty-four comparable months establish history coverage with method review pending', () => {
  const records = Array.from({length: 24}, (_, index) => observation(new Date(Date.UTC(2024, index, 1)).toISOString().slice(0, 7), 10 + index));
  const result = analyzeMarketHistory(request(records, {selection: {...selection, fromMonth: '2024-01', throughMonth: '2025-12'}})).subjects[0];
  assert.equal(result.seasonality.coverageStatus, 'sufficient-history');
  assert.equal(result.seasonality.status, 'review-required');
  assert.equal(result.seasonality.completeCycles, 2);
  assert.equal(result.yearOverYear[0].absoluteChange, 12);
});

test('selection bounds, future months and hostile input fail before analysis', () => {
  for (const patch of [{fromMonth: '2025-13'}, {throughMonth: '2024-12'}, {throughMonth: '2099-12'}, {metric: 'profit'}, {approved: true}, {subjectIds: ['product-one', 'product-one']}]) assert.throws(() => prepareMarketHistorySelection({...selection, ...patch}));
  assert.throws(() => prepareMarketHistorySelection({...selection, throughMonth: '2026-11'}, {nowMs: Date.parse('2026-11-15T00:00:00.000Z')}));
  let reads = 0;
  const hostile = Object.defineProperty({...selection}, 'fromMonth', {enumerable: true, get() { reads++; return '2025-01'; }});
  assert.throws(() => prepareMarketHistorySelection(hostile));
  assert.equal(reads, 0);
  const hundred = Array.from({length: 100}, (_, index) => observation('2025-01', 10, {seriesId: 'bounded-series-' + index}));
  assert.equal(analyzeMarketHistory(request(hundred)).history.length, 100);
  assert.throws(() => analyzeMarketHistory(request([...hundred, observation('2025-01', 10, {seriesId: 'overflow-series'})])));
});

test('historical helpers and result markers remain excluded from static output', () => {
  for (const marker of ['analyzeMarketHistory', 'prepareMarketHistorySelection', 'calendar-month-change-v1']) assert.equal(auditLocalControlPlaneExport([{path: 'assets/file.js', content: marker}]).violations.length, 1);
});

test('foreign revision ancestors and category reassignment cannot support historical arithmetic', () => {
  const unrelated = normalizeMarketObservation(observation('2025-01', 10));
  const rogue = observation('2025-02', 15, {seriesId: 'unrelated-revision', revision: 2, supersedesId: unrelated.id});
  const revised = analyzeMarketHistory(request([unrelated, rogue]));
  assert.ok(revised.subjects[0].periods[1].reasons.includes('incomplete-revision-history'));
  const reclassified = analyzeMarketHistory(request([observation('2025-01', 10), observation('2025-02', 15, {categoryId: 'category-two'})]));
  assert.ok(reclassified.subjects[0].periods.every(period => period.value === null));
});

test('readiness uses a complete twenty-four-month run while preserving surrounding gaps', () => {
  const records = Array.from({length: 24}, (_, index) => observation(new Date(Date.UTC(2024, index, 1)).toISOString().slice(0, 7), 10 + index));
  const leading = analyzeMarketHistory(request(records, {selection: {...selection, fromMonth: '2023-12', throughMonth: '2025-12'}})).subjects[0];
  assert.equal(leading.seasonality.coverageStatus, 'sufficient-history');
  assert.deepEqual(leading.coverage.missingMonths, ['2023-12']);
  const trailing = analyzeMarketHistory(request(records, {selection: {...selection, fromMonth: '2024-01', throughMonth: '2026-01'}})).subjects[0];
  assert.equal(trailing.seasonality.coverageStatus, 'sufficient-history');
  const interrupted = analyzeMarketHistory(request(records.filter(record => record.periodStart.slice(0, 7) !== '2024-12'), {selection: {...selection, fromMonth: '2024-01', throughMonth: '2025-12'}})).subjects[0];
  assert.equal(interrupted.seasonality.coverageStatus, 'insufficient-history');
});

test('comparison provenance identifies the active revision while retaining original history', () => {
  const original = normalizeMarketObservation(observation('2025-01', 10));
  const revision = observation('2025-01', 12, {revision: 2, supersedesId: original.id});
  const result = analyzeMarketHistory(request([original, revision, observation('2025-02', 15)])).subjects[0];
  assert.equal(result.periods[0].observationIds.length, 2);
  assert.equal(result.periods[0].activeObservationIds.length, 1);
  assert.equal(result.comparisons[0].absoluteChange, 3);
  assert.equal(result.comparisons[0].observationIds.includes(original.id), false);
});
