import {fields, id, text, choice, dataArray, json} from '../contracts/validation.mjs';
import {digest} from '../orchestration/dag.mjs';
import {normalizeMarketObservation, marketMetrics, compareKeys} from './observations.mjs';
import {normalizeCompetitorObservation, normalizeCompetitorComparison, compareCompetitorObservations} from './competitors.mjs';
import {analyzeMarketObservations} from './scoring.mjs';

export const reconciliationKind = 'candidate-reconciliation-v1';
export const normalizeObservation = (domain, value, nowMs) => {
  choice(domain, ['market', 'competitor']);
  return domain === 'market' ? normalizeMarketObservation(value, nowMs) : normalizeCompetitorObservation(value, nowMs);
};
const dimension = (domain, record) => domain === 'market' ? record.metric : record.featureId;

export function prepareReconciliation(value) {
  fields(value, ['domain', 'from', 'to', 'reason']);
  const domain = choice(value.domain, ['market', 'competitor']);
  const from = normalizeObservation(domain, value.from), to = normalizeObservation(domain, value.to);
  const identity = ['subjectId', 'categoryId', 'region', 'periodStart', 'periodEnd', domain === 'market' ? 'metric' : 'featureId'];
  if (domain === 'competitor') identity.push('vendorId');
  if (from.id === to.id || identity.some(key => from[key] !== to[key]) || to.collectedAt < from.collectedAt || to.eventAt < from.eventAt) throw new Error('Incompatible reconciliation');
  if (domain === 'market' && to.missing.length) throw new Error('Incomplete correction target');
  const record = {kind: reconciliationKind, domain, fromId: from.id, toId: to.id, fromDigest: digest(from), toDigest: digest(to), reason: text(value.reason, 500), reviewState: 'unreviewed'};
  return json({...record, id: 'reconciliation-' + digest(record).slice(0, 48)});
}

function validateReconciliationGraph(domain, observations, links) {
  const records = new Map(observations.map(record => [record.id, record]));
  const outgoing = new Map(), unique = new Map();
  for (const link of dataArray(links, 100)) {
    fields(link, ['kind', 'domain', 'fromId', 'toId', 'fromDigest', 'toDigest', 'reason', 'reviewState', 'id']);
    if (link.domain !== domain || !records.has(link.fromId) || !records.has(link.toId)) throw new Error('Incomplete reconciliation snapshot');
    const expected = prepareReconciliation({domain, from: records.get(link.fromId), to: records.get(link.toId), reason: link.reason});
    if (digest(expected) !== digest(link)) throw new Error('Changed reconciliation binding');
    if (outgoing.has(link.fromId) && outgoing.get(link.fromId) !== link.id) throw new Error('Competing reconciliation');
    outgoing.set(link.fromId, link.id);
    unique.set(link.id, expected);
  }
  for (const record of observations) {
    const seen = new Set();
    let current = record.id;
    while (outgoing.has(current)) {
      if (seen.has(current)) throw new Error('Cyclic reconciliation');
      seen.add(current);
      current = unique.get(outgoing.get(current)).toId;
    }
  }
  return Object.freeze([...unique.values()].sort((a, b) => compareKeys(a.id, b.id)));
}

export function normalizeReconciledSelection(value) {
  fields(value, ['domain', 'selection'], ['weights']);
  const domain = choice(value.domain, ['market', 'competitor']);
  const selection = normalizeCompetitorComparison(value.selection);
  if (domain === 'market') {
    if (selection.featureIds.join('|') !== [...marketMetrics].sort(compareKeys).join('|')) throw new Error('Select all market metrics');
    analyzeMarketObservations({observations: [], weights: value.weights, mode: 'opportunity'});
  } else if (Object.hasOwn(value, 'weights')) throw new Error('Unexpected competitor weights');
  return Object.freeze({domain, selection, ...(domain === 'market' ? {weights: json(value.weights)} : {})});
}

export function analyzeReconciledEvidence(value) {
  fields(value, ['domain', 'selection', 'observations', 'links', 'staleIds'], ['weights']);
  const captured = normalizeReconciledSelection({domain: value.domain, selection: value.selection, ...(Object.hasOwn(value, 'weights') ? {weights: value.weights} : {})});
  const {domain, selection} = captured;
  const records = dataArray(value.observations, 100).map(record => normalizeObservation(domain, record));
  const byId = new Map();
  for (const record of records) {
    if (!selection.subjectIds.includes(record.subjectId) || !selection.featureIds.includes(dimension(domain, record)) || record.region !== selection.region || record.periodStart !== selection.periodStart || record.periodEnd !== selection.periodEnd) throw new Error('Incompatible reconciliation selection');
    if (byId.has(record.id) && digest(byId.get(record.id)) !== digest(record)) throw new Error('Conflicting observation identity');
    byId.set(record.id, record);
  }
  const observations = [...byId.values()].sort((a, b) => compareKeys(a.id, b.id));
  const links = validateReconciliationGraph(domain, observations, value.links);
  const stale = new Set(dataArray(value.staleIds, 100).map(id));
  if ([...stale].some(recordId => !byId.has(recordId))) throw new Error('Unknown stale observation');
  const history = Object.freeze(observations.map(record => {
    const reasons = [];
    if (stale.has(record.id)) reasons.push('stale-source-binding');
    if (links.some(link => link.fromId === record.id)) reasons.push('candidate-superseded', 'unresolved-reconciliation');
    if (links.some(link => link.toId === record.id)) reasons.push('candidate-correction', 'unresolved-reconciliation');
    return Object.freeze({id: record.id, subjectId: record.subjectId, dimension: dimension(domain, record), sourceId: record.sourceId,
      observationDigest: digest(record), reasons: Object.freeze(reasons), linkIds: Object.freeze(links.filter(link => link.fromId === record.id || link.toId === record.id).map(link => link.id))});
  }));
  const blockingReasons = (subjectId, featureId) => [...new Set(history.filter(row => row.subjectId === subjectId && (featureId === undefined || row.dimension === featureId)).flatMap(row => row.reasons).filter(reason => ['stale-source-binding', 'unresolved-reconciliation'].includes(reason)))];
  let analysis;
  if (domain === 'competitor') {
    const compared = compareCompetitorObservations({...selection, observations});
    analysis = Object.freeze({...compared, rows: Object.freeze(compared.rows.map(row => {
      const reasons = blockingReasons(row.subjectId, row.featureId);
      return reasons.length ? Object.freeze({...row, declaration: null, status: 'UNKNOWN', reasons: Object.freeze([...new Set([...row.reasons, ...reasons])])}) : row;
    }))});
  } else {
    const compared = analyzeMarketObservations({observations, weights: captured.weights, mode: 'opportunity'});
    analysis = Object.freeze({...compared, opportunities: Object.freeze(compared.opportunities.map(row => {
      const reasons = blockingReasons(row.subjectId);
      const reconciled = reasons.length ? {...row, score: null, status: 'UNKNOWN', reasons: Object.freeze([...new Set([...row.reasons, ...reasons])])} : row;
      const contributing = history.filter(record => record.subjectId === row.subjectId);
      const recordIds = new Set(contributing.map(record => record.id));
      const relatedLinks = links.filter(link => recordIds.has(link.fromId) || recordIds.has(link.toId));
      return Object.freeze({...reconciled, inputDigest: digest({baseDigest: row.inputDigest, history: contributing.map(record => digest(record)), links: relatedLinks.map(link => digest(link)), score: reconciled.score, status: reconciled.status, reasons: reconciled.reasons})});
    }).sort((left, right) => left.score === null && right.score !== null ? 1 : right.score === null && left.score !== null ? -1 : (right.score ?? 0) - (left.score ?? 0) || compareKeys(left.key, right.key)))});
  }
  const reasons = [...new Set(history.flatMap(row => row.reasons))];
  const missingSubjects = Object.freeze(selection.subjectIds.filter(subject => !observations.some(record => record.subjectId === subject)));
  if (missingSubjects.length) reasons.push('missing-observation');
  const inputDigest = digest({domain, selection, analysisDigest: analysis.inputDigest, history: history.map(row => digest(row)), links: links.map(link => digest(link))});
  return Object.freeze({domain, inputDigest, analysis: Object.freeze({...analysis, inputDigest}), history, links, missingSubjects, reasons: Object.freeze(reasons), evidenceConfidence: 'UNKNOWN', reviewState: 'unreviewed'});
}
