import {fields, id, choice, integer, dataArray} from '../contracts/validation.mjs';
import {digest} from '../orchestration/dag.mjs';
import {marketMetrics, compareKeys, validateSeriesRevisions} from './observations.mjs';
import {inspectReconciliationHistory} from './reconciliation.mjs';

const methodVersion = 'calendar-month-change-v1';

function monthIndex(value) {
  if (typeof value !== 'string' || !/^(20\d{2})-(0[1-9]|1[0-2])$/.test(value)) throw new Error('Invalid calendar month');
  return Number(value.slice(0, 4)) * 12 + Number(value.slice(5)) - 1;
}

export function prepareMarketHistorySelection(value, options = {}) {
  fields(value, ['subjectIds', 'metric', 'unit', 'region', 'fromMonth', 'throughMonth']);
  fields(options, [], ['nowMs']);
  const nowMs = options.nowMs === undefined ? Date.now() : integer(options.nowMs, Date.UTC(2000, 0, 1), 4102444800000);
  const subjectIds = dataArray(value.subjectIds, 5).map(id).sort(compareKeys);
  if (!subjectIds.length || new Set(subjectIds).size !== subjectIds.length) throw new Error('Invalid historical subjects');
  const first = monthIndex(value.fromMonth), last = monthIndex(value.throughMonth);
  if (first > last || last - first >= 36) throw new Error('Invalid historical window');
  if (typeof value.region !== 'string' || !/^[A-Z]{2,6}$/.test(value.region)) throw new Error('Invalid historical region');
  const periods = [];
  for (let index = first; index <= last; index++) {
    const start = Date.UTC(Math.floor(index / 12), index % 12, 1);
    const end = Date.UTC(Math.floor(index / 12), index % 12 + 1, 1) - 1;
    if (end > nowMs) throw new Error('Calendar month is incomplete');
    periods.push(Object.freeze({month: new Date(start).toISOString().slice(0, 7), periodStart: new Date(start).toISOString(), periodEnd: new Date(end).toISOString()}));
  }
  const selection = Object.freeze({subjectIds: Object.freeze(subjectIds), metric: choice(value.metric, marketMetrics), unit: choice(value.unit, ['index-0-100', 'percent', 'count']), region: value.region, fromMonth: value.fromMonth, throughMonth: value.throughMonth});
  return Object.freeze({selection, periods: Object.freeze(periods)});
}

function rounded(value) {
  const result = Number(value.toFixed(6));
  return result === 0 ? 0 : result;
}

function change(from, to, unit) {
  const reasons = [...new Set([...from.reasons, ...to.reasons])];
  let absoluteChange = null, relativeChangePercent = null;
  if (from.value !== null && to.value !== null) {
    absoluteChange = rounded(to.value - from.value);
    if (from.value === 0) reasons.push('zero-baseline');
    else {
      const relative = (to.value - from.value) / from.value * 100;
      if (Number.isFinite(relative)) relativeChangePercent = rounded(relative);
      else reasons.push('nonfinite-relative-change');
    }
  }
  const changeUnit = unit === 'percent' ? 'percentage-points' : unit === 'index-0-100' ? 'index-points' : 'count';
  return Object.freeze({fromMonth: from.month, throughMonth: to.month, absoluteChange, relativeChangePercent, changeUnit,
    observationIds: Object.freeze([...new Set([...from.activeObservationIds, ...to.activeObservationIds])].sort(compareKeys)), reasons: Object.freeze(reasons)});
}

export function analyzeMarketHistory(value) {
  fields(value, ['selection', 'observations', 'links', 'staleIds']);
  const {selection, periods} = prepareMarketHistorySelection(value.selection);
  const inspected = inspectReconciliationHistory({domain: 'market', observations: value.observations, links: value.links, staleIds: value.staleIds});
  const {observations, history, links} = inspected;
  if (observations.some(record => !selection.subjectIds.includes(record.subjectId) || record.metric !== selection.metric || record.region !== selection.region)) throw new Error('Incompatible historical context');
  validateSeriesRevisions(observations);
  const byId = new Map(observations.map(record => [record.id, record]));
  const latest = new Map(), series = new Map();
  for (const record of observations) {
    if (!latest.has(record.seriesId) || latest.get(record.seriesId).revision < record.revision) latest.set(record.seriesId, record);
    if (!series.has(record.seriesId)) series.set(record.seriesId, []);
    series.get(record.seriesId).push(record);
  }
  const historyById = new Map(history.map(record => [record.id, record]));
  const subjects = selection.subjectIds.map(subjectId => {
    const records = observations.filter(record => record.subjectId === subjectId);
    const categories = new Set(records.map(record => record.categoryId));
    const cells = periods.map(period => {
      const overlapping = records.filter(record => record.periodStart !== null && record.periodEnd !== null && record.periodStart <= period.periodEnd && record.periodEnd >= period.periodStart);
      const active = overlapping.filter(record => latest.get(record.seriesId).id === record.id);
      const reasons = [];
      if (categories.size > 1) reasons.push('incompatible-category');
      if (!active.length) reasons.push('missing-observation');
      for (const record of overlapping) {
        reasons.push(...historyById.get(record.id).reasons.filter(reason => ['stale-source-binding', 'unresolved-reconciliation'].includes(reason)));
        if (record.periodStart !== period.periodStart || record.periodEnd !== period.periodEnd) reasons.push('incompatible-period');
        if (record.unit !== selection.unit) reasons.push('incompatible-units');
        if (record.missing.length) reasons.push('missing-information');
        if (record.supersedesId !== null) {
          const ancestor = byId.get(record.supersedesId);
          if (!ancestor || ancestor.seriesId !== record.seriesId || ancestor.revision !== record.revision - 1) reasons.push('incomplete-revision-history');
        }
        if (new Set(series.get(record.seriesId).map(item => JSON.stringify([item.periodStart, item.periodEnd]))).size > 1) reasons.push('revision-period-changed');
      }
      const values = new Set(active.map(record => record.value));
      if (values.size > 1) reasons.push('contradictory-values');
      const uniqueReasons = Object.freeze([...new Set(reasons)].sort(compareKeys));
      return Object.freeze({...period, value: uniqueReasons.length || values.has(null) ? null : active[0].value,
        activeObservationIds: Object.freeze(active.map(record => record.id).sort(compareKeys)),
        observationIds: Object.freeze(overlapping.map(record => record.id).sort(compareKeys)), reasons: uniqueReasons});
    });
    const comparisons = Object.freeze(cells.slice(1).map((cell, index) => change(cells[index], cell, selection.unit)));
    const yearOverYear = Object.freeze(cells.slice(12).map((cell, index) => change(cells[index], cell, selection.unit)));
    const comparableMonths = cells.filter(cell => cell.value !== null).length;
    let longestRun = 0, currentRun = 0;
    for (const cell of cells) {
      currentRun = cell.value === null ? 0 : currentRun + 1;
      longestRun = Math.max(longestRun, currentRun);
    }
    const sufficient = longestRun >= 24;
    const seasonality = Object.freeze({status: sufficient ? 'review-required' : 'insufficient-evidence', coverageStatus: sufficient ? 'sufficient-history' : 'insufficient-history', requiredMonths: 24, completeCycles: Math.floor(longestRun / 12), reasons: Object.freeze(sufficient ? ['method-review-required'] : ['twenty-four-consecutive-comparable-months-required'])});
    const coverage = Object.freeze({expectedMonths: cells.length, monthsWithObservations: cells.filter(cell => cell.observationIds.length).length, comparableMonths, missingMonths: Object.freeze(cells.filter(cell => cell.observationIds.length === 0).map(cell => cell.month))});
    const subjectHistory = history.filter(record => record.subjectId === subjectId);
    const subjectIds = new Set(subjectHistory.map(record => record.id));
    const subjectLinks = links.filter(link => subjectIds.has(link.fromId) || subjectIds.has(link.toId));
    const inputDigest = digest({methodVersion, selection: {...selection, subjectIds: [subjectId]}, history: subjectHistory.map(record => digest(record)), links: subjectLinks.map(link => digest(link))});
    return Object.freeze({subjectId, inputDigest, periods: Object.freeze(cells), comparisons, yearOverYear, coverage, seasonality,
      evidenceConfidence: 'UNKNOWN', reviewState: 'unreviewed'});
  });
  return Object.freeze({methodVersion, selection, inputDigest: digest({methodVersion, selection, subjects: subjects.map(subject => subject.inputDigest)}), subjects: Object.freeze(subjects), history, links});
}
