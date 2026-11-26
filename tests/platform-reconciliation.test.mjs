import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareReconciliation, analyzeReconciledEvidence} from '../src/platform/market/reconciliation.mjs';
import {auditLocalControlPlaneExport} from '../src/lib/local-control-plane-export.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {verifyReconciliationMigration} from '../src/platform/persistence/migrate.mjs';

const competitor = (patch = {}) => ({subjectId: 'product-one', vendorId: 'vendor-one', categoryId: 'category-one', sourceId: 'source-one', sourceUrl: 'https://example.com/source', evidenceDigest: 'a'.repeat(64), collectedAt: '2026-01-31T00:00:00.000Z', eventAt: '2026-01-30T00:00:00.000Z', periodStart: '2026-01-01T00:00:00.000Z', periodEnd: '2026-01-30T00:00:00.000Z', region: 'IN', featureId: 'feature-export', declaration: true, manualReference: 'synthetic-only', ...patch});
const selection = {subjectIds: ['product-one'], featureIds: ['feature-export'], region: 'IN', periodStart: competitor().periodStart, periodEnd: competitor().periodEnd};
const original = competitor(), correction = competitor({declaration: false, collectedAt: '2026-02-01T00:00:00.000Z'});
const link = () => prepareReconciliation({domain: 'competitor', from: original, to: correction, reason: 'Synthetic correction proposal'});
const input = (patch = {}) => ({domain: 'competitor', observations: [original, correction], links: [link()], staleIds: [], selection, ...patch});
const metrics = ['demand-index', 'competition-index', 'feasibility-index'];
const market = (metric, value, patch = {}) => ({seriesId: 'series-' + metric, revision: 1, supersedesId: null, categoryId: 'category-one', subjectId: 'product-one', sourceId: 'source-one', sourceUrl: original.sourceUrl, collectedAt: original.collectedAt, eventAt: original.eventAt, metric, value, unit: 'index-0-100', region: 'IN', periodStart: original.periodStart, periodEnd: original.periodEnd, evidenceDigest: original.evidenceDigest, provenance: {method: 'manual', reference: 'synthetic-only'}, missing: [], ...patch});

test('reconciliation binds immutable originals, corrections, digests and unreviewed state', () => {
  const result = link();
  assert.notEqual(result.fromId, result.toId);
  assert.notEqual(result.fromDigest, result.toDigest);
  assert.equal(result.reviewState, 'unreviewed');
  assert.ok(Object.isFrozen(result));
  assert.deepEqual(result, link());
  for (const patch of [{approved: true}, {deciderUserId: 'owner-one'}]) assert.throws(() => prepareReconciliation({domain: 'competitor', from: original, to: correction, reason: 'Reason', ...patch}));
  for (const patch of [{subjectId: 'other-product'}, {region: 'US'}, {featureId: 'feature-other'}, {categoryId: 'category-two'}]) assert.throws(() => prepareReconciliation({domain: 'competitor', from: original, to: competitor(patch), reason: 'Reason'}));
});

test('proposed supersession preserves conflict, contributor history and UNKNOWN confidence', () => {
  const result = analyzeReconciledEvidence(input());
  assert.equal(result.analysis.rows[0].declaration, null);
  assert.equal(result.analysis.rows[0].evidenceConfidence, 'UNKNOWN');
  assert.ok(result.history.find(row => row.id === link().fromId).reasons.includes('candidate-superseded'));
  assert.ok(result.analysis.rows[0].reasons.includes('unresolved-reconciliation'));
  assert.equal(result.history.length, 2);
  assert.deepEqual(result, analyzeReconciledEvidence(input({observations: [correction, original]})));
});

test('stale bindings yield UNKNOWN even when declarations agree, with digest-bound reasons', () => {
  const without = analyzeReconciledEvidence(input({observations: [original], links: []}));
  const withStale = analyzeReconciledEvidence(input({observations: [original], links: [], staleIds: [link().fromId]}));
  assert.equal(without.analysis.rows[0].declaration, true);
  assert.equal(withStale.analysis.rows[0].declaration, null);
  assert.ok(withStale.analysis.rows[0].reasons.includes('stale-source-binding'));
  assert.notEqual(without.inputDigest, withStale.inputDigest);
  assert.notEqual(without.analysis.inputDigest, withStale.analysis.inputDigest);
});

test('market reconciliation preserves original evidence and blocks stale or corrected scoring', () => {
  const observations = metrics.map(metric => market(metric, metric === 'competition-index' ? 10 : 90));
  const request = {domain: 'market', observations, links: [], staleIds: [], selection: {...selection, subjectIds: ['product-one', 'product-two'], featureIds: metrics}, weights: Object.fromEntries(metrics.map(metric => [metric, 1]))};
  const initial = analyzeReconciledEvidence(request);
  assert.equal(initial.analysis.opportunities[0].score, 90);
  assert.deepEqual(initial.missingSubjects, ['product-two']);
  const proposal = prepareReconciliation({domain: 'market', from: observations[0], to: market('demand-index', 30, {seriesId: 'corrected-demand', sourceId: 'source-two'}), reason: 'Candidate correction'});
  const corrected = analyzeReconciledEvidence({...request, observations: [...observations, market('demand-index', 30, {seriesId: 'corrected-demand', sourceId: 'source-two'})], links: [proposal]});
  assert.equal(corrected.analysis.opportunities[0].score, null);
  assert.ok(corrected.analysis.opportunities[0].reasons.includes('unresolved-reconciliation'));
  const stale = analyzeReconciledEvidence({...request, staleIds: [proposal.fromId]});
  assert.equal(stale.analysis.opportunities[0].score, null);
  assert.notEqual(stale.analysis.opportunities[0].inputDigest, initial.analysis.opportunities[0].inputDigest);
});

test('market results keep UNKNOWN scores after supported scores', () => {
  const first = metrics.map(metric => market(metric, metric === 'competition-index' ? 10 : 90));
  const second = metrics.map(metric => market(metric, metric === 'competition-index' ? 70 : 30, {subjectId: 'product-two', seriesId: 'second-' + metric}));
  const originalId = prepareReconciliation({domain: 'market', from: first[0], to: market('demand-index', 50, {seriesId: 'changed-demand'}), reason: 'Fixture'}).fromId;
  const result = analyzeReconciledEvidence({domain: 'market', observations: [...first, ...second], links: [], staleIds: [originalId], selection: {...selection, subjectIds: ['product-one', 'product-two'], featureIds: metrics}, weights: Object.fromEntries(metrics.map(metric => [metric, 1]))});
  assert.equal(result.analysis.opportunities[0].subjectId, 'product-two');
});

test('cycles, competing successors, forged digests and incomplete link snapshots fail closed', () => {
  const third = competitor({declaration: null, collectedAt: correction.collectedAt});
  const competing = prepareReconciliation({domain: 'competitor', from: original, to: third, reason: 'Alternative'});
  assert.throws(() => analyzeReconciledEvidence(input({observations: [original, correction, third], links: [link(), competing]})));
  assert.throws(() => analyzeReconciledEvidence(input({links: [{...link(), fromDigest: 'f'.repeat(64)}]})));
  assert.throws(() => analyzeReconciledEvidence(input({observations: [original]})));
  const first = competitor({collectedAt: correction.collectedAt});
  const forward = prepareReconciliation({domain: 'competitor', from: first, to: correction, reason: 'Forward'});
  const reverse = prepareReconciliation({domain: 'competitor', from: correction, to: first, reason: 'Reverse'});
  assert.throws(() => analyzeReconciledEvidence(input({observations: [first, correction], links: [forward, reverse]})));
});

test('reconciliation records and helpers stay outside public assets', () => {
  for (const marker of ['prepareReconciliation', 'analyzeReconciledEvidence', 'openReconciliationStore', 'candidate-reconciliation-v1']) assert.equal(auditLocalControlPlaneExport([{path: 'assets/file.js', content: marker}]).violations.length, 1);
  assert.equal(auditLocalControlPlaneExport([{path: 'data/reconciliation_links.json', content: '{}'}]).violations.length, 1);
});

test('migration seven pins canonical SQL and rejects altered bytes even with an altered manifest', () => {
  const bytes = readFileSync(new URL('../src/platform/persistence/migrations/0007_candidate_reconciliation.sql', import.meta.url));
  const manifest = JSON.parse(readFileSync(new URL('../src/platform/persistence/migrations/reconciliation-manifest.json', import.meta.url)));
  assert.equal(verifyReconciliationMigration(bytes, manifest), true);
  const changed = Buffer.concat([bytes, Buffer.from('-- altered')]);
  assert.throws(() => verifyReconciliationMigration(changed, {...manifest, sha256: createHash('sha256').update(changed).digest('hex')}));
});
