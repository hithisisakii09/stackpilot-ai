import { types } from 'node:util';
import { id as validateId, choice, integer, text as validateText } from '../contracts/validation.mjs';

const ACTION_TYPES = Object.freeze(['dependency_update', 'schema_migration_proposal', 'release_gate_override']);

function fail(message = 'Invalid engineering input') {
  throw new Error(message);
}

function assertPlainObject(value, message = 'Invalid engineering input') {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    types.isProxy(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    fail(message);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) {
    if (
      typeof key !== 'string' ||
      key === '__proto__' ||
      key === 'prototype' ||
      key === 'constructor' ||
      !Object.hasOwn(descriptors[key], 'value') ||
      !descriptors[key].enumerable
    ) {
      fail(message);
    }
  }
  return value;
}

function assertAllowedKeys(record, allowed, message = 'Invalid engineering input') {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) fail(message);
  }
}

function parseIsoTimestamp(value) {
  if (typeof value !== 'string') fail('Invalid engineering date');
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== value) fail('Invalid engineering date');
  return ms;
}

function nullableInt(value) {
  if (value === undefined || value === null) return null;
  try {
    return integer(value, 0, 1_000_000);
  } catch {
    fail('Invalid engineering input');
  }
}

/**
 * Evaluates a structured CI/validation snapshot into deterministic health status and findings.
 * Preserves explicit null for uncollected metrics.
 */
export function evaluateCiHealth(input) {
  const record = assertPlainObject(input);
  assertAllowedKeys(record, new Set([
    'unitPassed',
    'unitFailed',
    'unitSkipped',
    'integrationPassed',
    'integrationFailed',
    'migrationCrlfCount',
    'auditHighCriticalCount',
    'preflightViolations',
    'builtRoutes',
    'collectedAt',
    'now'
  ]));

  const nowMs = record.now !== undefined ? parseIsoTimestamp(record.now) : Date.now();
  const collectedMs = parseIsoTimestamp(record.collectedAt);
  if (collectedMs > nowMs) fail('Invalid engineering date');

  const metrics = Object.freeze({
    unitPassed: nullableInt(record.unitPassed),
    unitFailed: nullableInt(record.unitFailed),
    unitSkipped: nullableInt(record.unitSkipped),
    integrationPassed: nullableInt(record.integrationPassed),
    integrationFailed: nullableInt(record.integrationFailed),
    migrationCrlfCount: nullableInt(record.migrationCrlfCount),
    auditHighCriticalCount: nullableInt(record.auditHighCriticalCount),
    preflightViolations: nullableInt(record.preflightViolations),
    builtRoutes: nullableInt(record.builtRoutes)
  });

  const findings = [];
  if (metrics.migrationCrlfCount !== null && metrics.migrationCrlfCount > 0) {
    findings.push(Object.freeze({ category: 'migration_drift', severity: 'blocker', detail: 'CRLF detected in SQL migrations' }));
  }
  if (metrics.auditHighCriticalCount !== null && metrics.auditHighCriticalCount > 0) {
    findings.push(Object.freeze({ category: 'security_audit', severity: 'blocker', detail: 'High or critical npm audit findings' }));
  }
  if (metrics.preflightViolations !== null && metrics.preflightViolations > 0) {
    findings.push(Object.freeze({ category: 'leakage_violation', severity: 'blocker', detail: 'Release preflight violations present' }));
  }
  if ((metrics.unitFailed !== null && metrics.unitFailed > 0) || (metrics.integrationFailed !== null && metrics.integrationFailed > 0)) {
    findings.push(Object.freeze({ category: 'test_failure', severity: 'blocker', detail: 'Failing unit or integration tests' }));
  }
  if (metrics.unitSkipped !== null && metrics.unitSkipped > 0) {
    findings.push(Object.freeze({ category: 'test_failure', severity: 'warning', detail: 'Skipped unit tests detected' }));
  }

  const hasBlocker = findings.some(f => f.severity === 'blocker');
  const hasWarning = findings.some(f => f.severity === 'warning');
  const status = hasBlocker ? 'blocked' : hasWarning ? 'degraded' : 'healthy';

  return Object.freeze({
    status,
    collectedAt: new Date(collectedMs).toISOString(),
    metrics,
    findings: Object.freeze(findings)
  });
}

/**
 * Compares baseline and candidate CI snapshots to classify regressions and produce advisory plans.
 */
export function triageRegression(input) {
  const record = assertPlainObject(input);
  assertAllowedKeys(record, new Set(['baseline', 'candidate']));
  const baseline = evaluateCiHealth(record.baseline);
  const candidate = evaluateCiHealth(record.candidate);

  const delta = (a, b) => (a === null || b === null ? null : b - a);
  const deltas = Object.freeze({
    unitFailedDelta: delta(baseline.metrics.unitFailed, candidate.metrics.unitFailed),
    integrationFailedDelta: delta(baseline.metrics.integrationFailed, candidate.metrics.integrationFailed),
    migrationCrlfDelta: delta(baseline.metrics.migrationCrlfCount, candidate.metrics.migrationCrlfCount),
    auditHighCriticalDelta: delta(baseline.metrics.auditHighCriticalCount, candidate.metrics.auditHighCriticalCount),
    preflightViolationsDelta: delta(baseline.metrics.preflightViolations, candidate.metrics.preflightViolations)
  });

  const classes = new Set();
  if (deltas.migrationCrlfDelta !== null && deltas.migrationCrlfDelta > 0) classes.add('migration_drift');
  if (deltas.auditHighCriticalDelta !== null && deltas.auditHighCriticalDelta > 0) classes.add('security_audit');
  if (deltas.preflightViolationsDelta !== null && deltas.preflightViolationsDelta > 0) classes.add('leakage_violation');
  if ((deltas.unitFailedDelta !== null && deltas.unitFailedDelta > 0) || (deltas.integrationFailedDelta !== null && deltas.integrationFailedDelta > 0)) {
    classes.add('test_failure');
  }

  const classifications = Object.freeze([...classes].sort((a, b) => a.localeCompare(b, 'en')));
  const remediationPlan = Object.freeze(
    classifications.map(c => Object.freeze({ category: c, action: 'Review and fix ' + c + ' in feature branch before merge' }))
  );

  return Object.freeze({
    advisoryOnly: true,
    autoApplyPermitted: false,
    baselineStatus: baseline.status,
    candidateStatus: candidate.status,
    classifications,
    deltas,
    remediationPlan
  });
}

/**
 * Validates an owner-gated high-impact engineering action proposal.
 */
export function validateEngineeringProposal(input) {
  const record = assertPlainObject(input);
  assertAllowedKeys(record, new Set(['id', 'actionType', 'summary', 'actorRole', 'actorId', 'requesterId', 'proposedAt', 'now']));

  let proposalId, actionType, summary, actorRole, actorId, requesterId;
  try {
    proposalId = validateId(record.id);
    actionType = choice(record.actionType, ACTION_TYPES);
    summary = validateText(record.summary, 1000);
    actorRole = choice(record.actorRole, ['owner', 'reviewer', 'agent']);
    actorId = validateId(record.actorId);
    requesterId = validateId(record.requesterId);
  } catch {
    fail('Invalid engineering input');
  }

  const nowMs = record.now !== undefined ? parseIsoTimestamp(record.now) : Date.now();
  const proposedMs = parseIsoTimestamp(record.proposedAt);
  if (proposedMs > nowMs) fail('Invalid engineering date');

  if (actorRole !== 'owner') fail('Owner approval required');
  if (actorId === requesterId) fail('Independent owner approval required');

  return Object.freeze({
    id: proposalId,
    actionType,
    summary,
    actorRole,
    actorId,
    requesterId,
    approved: true,
    proposedAt: new Date(proposedMs).toISOString()
  });
}
