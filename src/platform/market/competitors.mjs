import {fields, id, text, integer, dataArray, json} from '../contracts/validation.mjs';
import {digest} from '../orchestration/dag.mjs';
import {compareKeys} from './observations.mjs';

export const competitorRecordKind = 'manual-competitor-observation-v1';
const required = ['subjectId', 'vendorId', 'categoryId', 'sourceId', 'sourceUrl', 'evidenceDigest',
  'collectedAt', 'eventAt', 'periodStart', 'periodEnd', 'region', 'featureId', 'declaration', 'manualReference'];

function timestamp(value, nowMs) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) throw new Error('Invalid competitor timestamp');
  const time = Date.parse(value);
  if (!Number.isFinite(time) || time < Date.UTC(2000, 0, 1) || time > nowMs || new Date(time).toISOString() !== value) throw new Error('Invalid competitor timestamp');
  return value;
}

function region(value) {
  if (typeof value !== 'string' || !/^[A-Z]{2,6}$/.test(value)) throw new Error('Invalid competitor region');
  return value;
}

export function normalizeCompetitorObservation(value, nowMs = Date.now()) {
  integer(nowMs, Date.UTC(2000, 0, 1), 4102444800000);
  fields(value, required, ['id', 'kind', 'status', 'reviewState']);
  for (const [key, expected] of Object.entries({kind: competitorRecordKind, status: 'candidate', reviewState: 'unreviewed'})) {
    if (value[key] !== undefined && value[key] !== expected) throw new Error('Invalid competitor authority');
  }
  const result = {};
  for (const key of ['subjectId', 'vendorId', 'categoryId', 'sourceId', 'featureId']) result[key] = id(value[key]);
  if (typeof value.sourceUrl !== 'string' || value.sourceUrl.length > 2048 || /[\s\\\x00-\x1f\x7f]/.test(value.sourceUrl)) throw new Error('Invalid competitor URL');
  let url;
  try { url = new URL(value.sourceUrl); } catch { throw new Error('Invalid competitor URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search || url.port || url.href !== value.sourceUrl || !url.hostname.includes('.')) throw new Error('Invalid competitor URL');
  result.sourceUrl = value.sourceUrl;
  if (typeof value.evidenceDigest !== 'string' || !/^[a-f0-9]{64}$/.test(value.evidenceDigest)) throw new Error('Invalid competitor digest');
  result.evidenceDigest = value.evidenceDigest;
  for (const key of ['collectedAt', 'eventAt', 'periodStart', 'periodEnd']) result[key] = timestamp(value[key], nowMs);
  if (result.periodStart > result.periodEnd || result.periodEnd > result.eventAt || result.eventAt > result.collectedAt) throw new Error('Invalid competitor chronology');
  result.region = region(value.region);
  if (value.declaration !== null && typeof value.declaration !== 'boolean') throw new Error('Invalid competitor declaration');
  result.declaration = value.declaration;
  result.manualReference = text(value.manualReference, 128);
  result.kind = competitorRecordKind;
  result.status = 'candidate';
  result.reviewState = 'unreviewed';
  result.id = 'competitor-' + digest(result).slice(0, 48);
  if (value.id !== undefined && value.id !== result.id) throw new Error('Invalid competitor identity');
  return json(result);
}

export function prepareCompetitorImport(value, options = {}) {
  fields(value, ['idempotencyKey', 'observations']);
  fields(options, [], ['nowMs']);
  const nowMs = options.nowMs === undefined ? Date.now() : integer(options.nowMs, Date.UTC(2000, 0, 1), 4102444800000);
  const observations = dataArray(value.observations, 10).map(record => normalizeCompetitorObservation(record, nowMs));
  if (!observations.length || new Set(observations.map(record => record.id)).size !== observations.length) throw new Error('Invalid competitor batch');
  observations.sort((a, b) => compareKeys(a.id, b.id));
  return Object.freeze({idempotencyKey: id(value.idempotencyKey), observations: Object.freeze(observations), sourceDigest: digest(observations), dryRun: true});
}

function identifiers(value, maximum) {
  const result = dataArray(value, maximum).map(id).sort(compareKeys);
  if (!result.length || new Set(result).size !== result.length) throw new Error('Invalid comparison selection');
  return Object.freeze(result);
}

export function normalizeCompetitorComparison(value) {
  fields(value, ['subjectIds', 'featureIds', 'region', 'periodStart', 'periodEnd']);
  const result = {
    subjectIds: identifiers(value.subjectIds, 5), featureIds: identifiers(value.featureIds, 10),
    region: region(value.region), periodStart: timestamp(value.periodStart, Date.now()), periodEnd: timestamp(value.periodEnd, Date.now()),
  };
  if (result.periodStart > result.periodEnd) throw new Error('Invalid comparison period');
  return Object.freeze(result);
}

export function compareCompetitorObservations(value) {
  fields(value, ['observations', 'subjectIds', 'featureIds', 'region', 'periodStart', 'periodEnd']);
  const selection = normalizeCompetitorComparison(Object.fromEntries(['subjectIds', 'featureIds', 'region', 'periodStart', 'periodEnd'].map(key => [key, value[key]])));
  const records = dataArray(value.observations, 100).map(record => normalizeCompetitorObservation(record));
  const selected = records.filter(record => selection.subjectIds.includes(record.subjectId) && selection.featureIds.includes(record.featureId));
  if (selected.some(record => record.region !== selection.region || record.periodStart !== selection.periodStart || record.periodEnd !== selection.periodEnd)) throw new Error('Incompatible competitor context');
  if (new Set(selected.map(record => record.categoryId)).size > 1) throw new Error('Incompatible competitor categories');
  for (const subjectId of selection.subjectIds) {
    if (new Set(selected.filter(record => record.subjectId === subjectId).map(record => record.vendorId)).size > 1) throw new Error('Inconsistent competitor vendor');
  }
  const observations = [...new Map(selected.map(record => [record.id, record])).values()].sort((a, b) => compareKeys(a.id, b.id));
  const rows = [];
  for (const subjectId of selection.subjectIds) {
    for (const featureId of selection.featureIds) {
      const contributing = observations.filter(record => record.subjectId === subjectId && record.featureId === featureId);
      const declarations = new Set(contributing.map(record => record.declaration));
      const reasons = [];
      if (!contributing.length) reasons.push('missing-observation');
      if (declarations.has(null)) reasons.push('unknown-declaration');
      if (declarations.has(true) && declarations.has(false)) reasons.push('conflicting-declarations');
      rows.push(Object.freeze({subjectId, featureId, declaration: reasons.length ? null : contributing[0].declaration,
        status: reasons.length ? 'UNKNOWN' : 'candidate-declaration', evidenceConfidence: 'UNKNOWN', reviewState: 'unreviewed',
        observationIds: Object.freeze(contributing.map(record => record.id)), reasons: Object.freeze(reasons)}));
    }
  }
  return Object.freeze({...selection, inputDigest: digest({selection, observationDigests: observations.map(record => digest(record))}), rows: Object.freeze(rows)});
}
