import { createHash } from 'node:crypto';
import { types } from 'node:util';
import { id as validateId, integer, dataArray, text as validateText } from '../contracts/validation.mjs';

const FORBIDDEN_SECRET_KEY = /(?:token|secret|password|privateKey|cookie|authorization|affiliateUrl)/i;

function fail(message) {
  throw new Error(message);
}

function assertPlainObject(value, message = 'Invalid recovery snapshot') {
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

function assertAllowedKeys(record, allowed, message = 'Invalid recovery snapshot') {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) fail(message);
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort((a, b) => a.localeCompare(b, 'en'))) {
      if (FORBIDDEN_SECRET_KEY.test(key) && key !== 'publicAffiliateUrl') {
        fail('Secret field prohibited in snapshot');
      }
      out[key] = canonicalize(value[key]);
    }
    return out;
  }
  return value;
}

function parseIsoTimestamp(value, message = 'Invalid recovery snapshot') {
  if (typeof value !== 'string') fail(message);
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== value) fail(message);
  return new Date(ms).toISOString();
}

function validateCurrencyMap(raw) {
  const map = assertPlainObject(raw);
  const out = {};
  for (const currency of Object.keys(map).sort((a, b) => a.localeCompare(b, 'en'))) {
    if (!/^[A-Z]{3}$/.test(currency)) fail('Invalid recovery snapshot');
    const val = map[currency];
    if (!Number.isSafeInteger(val)) fail('Invalid recovery snapshot');
    out[currency] = val;
  }
  return Object.freeze(out);
}

/**
 * Builds a canonical SHA-256-authenticated tenant recovery snapshot enforcing zero-budget and null-affiliate invariants.
 */
export function buildCanonicalSnapshot(input) {
  const record = assertPlainObject(input);
  assertAllowedKeys(record, new Set([
    'organizationId',
    'capturedAt',
    'monthlyBudgetInr',
    'delegatedSpendInr',
    'publicAffiliateUrl',
    'partnerships',
    'forecastTotalsByCurrency',
    'actualTotalsByCurrency',
    'unknownMetricsCount',
    'now'
  ]));

  let organizationId;
  try {
    organizationId = validateId(record.organizationId);
  } catch {
    fail('Invalid recovery snapshot');
  }

  const capturedAt = parseIsoTimestamp(record.capturedAt);
  const nowIso = record.now !== undefined ? parseIsoTimestamp(record.now) : new Date().toISOString();
  if (Date.parse(capturedAt) > Date.parse(nowIso)) fail('Invalid recovery snapshot');

  if (record.monthlyBudgetInr !== 0 || record.delegatedSpendInr !== 0 || record.publicAffiliateUrl !== null) {
    fail('Invalid recovery snapshot');
  }

  const partnerships = dataArray(record.partnerships, 200).map(raw => {
    const p = assertPlainObject(raw);
    assertAllowedKeys(p, new Set(['id', 'state', 'step']));
    return Object.freeze({
      id: validateId(p.id),
      state: validateText(p.state, 64),
      step: integer(p.step, 1, 12)
    });
  });

  const forecastTotalsByCurrency = validateCurrencyMap(record.forecastTotalsByCurrency);
  const actualTotalsByCurrency = validateCurrencyMap(record.actualTotalsByCurrency);
  const unknownMetricsCount = record.unknownMetricsCount === null
    ? null
    : integer(record.unknownMetricsCount, 0, 10000);

  const payload = Object.freeze({
    schema: 'stackpilot-recovery-snapshot-v1',
    organizationId,
    capturedAt,
    monthlyBudgetInr: 0,
    delegatedSpendInr: 0,
    publicAffiliateUrl: null,
    partnerships: Object.freeze(partnerships),
    forecastTotalsByCurrency,
    actualTotalsByCurrency,
    unknownMetricsCount
  });

  const canonical = canonicalize(payload);
  const digest = createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  return Object.freeze({ payload, digest });
}

/**
 * Verifies a canonical snapshot's SHA-256 digest and invariants fail-closed.
 */
export function verifyCanonicalSnapshot(snapshot) {
  const record = assertPlainObject(snapshot, 'Invalid recovery snapshot');
  assertAllowedKeys(record, new Set(['payload', 'digest']));
  if (typeof record.digest !== 'string' || !/^[a-f0-9]{64}$/.test(record.digest)) {
    fail('Snapshot digest mismatch');
  }
  const payload = assertPlainObject(record.payload, 'Invalid recovery snapshot');
  assertAllowedKeys(payload, new Set([
    'schema',
    'organizationId',
    'capturedAt',
    'monthlyBudgetInr',
    'delegatedSpendInr',
    'publicAffiliateUrl',
    'partnerships',
    'forecastTotalsByCurrency',
    'actualTotalsByCurrency',
    'unknownMetricsCount'
  ]));
  if (payload.schema !== 'stackpilot-recovery-snapshot-v1') fail('Invalid recovery snapshot');
  const { schema: _ignored, ...rebuiltInput } = payload;
  const recomputed = buildCanonicalSnapshot({ ...rebuiltInput, now: payload.capturedAt });
  if (recomputed.digest !== record.digest) {
    fail('Snapshot digest mismatch');
  }
  return Object.freeze({ status: 'pass', digestVerified: true, organizationId: payload.organizationId });
}

/**
 * Verifies LF-only line endings and SHA-256 checksums across ordered SQL migrations.
 */
export function verifyMigrationIntegrity(entries) {
  const list = dataArray(entries, 50);
  if (list.length === 0) fail('Invalid migration inventory');
  for (let i = 0; i < list.length; i++) {
    const entry = assertPlainObject(list[i], 'Invalid migration entry');
    assertAllowedKeys(entry, new Set(['version', 'file', 'bytes', 'expectedSha256']));
    if (entry.version !== i + 1 || typeof entry.file !== 'string' || !Buffer.isBuffer(entry.bytes)) {
      fail('Invalid migration order');
    }
    if (entry.bytes.includes(0x0d)) {
      fail('CRLF detected in migration ' + entry.file);
    }
    const actualSha = createHash('sha256').update(entry.bytes).digest('hex');
    if (actualSha !== entry.expectedSha256) {
      fail('Migration checksum mismatch for ' + entry.file);
    }
  }
  return Object.freeze({ status: 'pass', verifiedCount: list.length });
}

/**
 * Evaluates fail-closed security drill outcomes across auth, RBAC, RLS, CSRF, and zero-cost AI routing.
 */
export function evaluateSecurityDrillMatrix(input) {
  const record = assertPlainObject(input, 'Security drill failed');
  assertAllowedKeys(record, new Set([
    'revokedSessionStatus',
    'nonOwnerMutationStatus',
    'crossTenantSpoofStatus',
    'csrfMismatchStatus',
    'paidAiRouterError',
    'secretPayloadError'
  ]), 'Security drill failed');

  if (
    record.revokedSessionStatus !== 401 ||
    record.nonOwnerMutationStatus !== 403 ||
    record.crossTenantSpoofStatus !== 403 ||
    record.csrfMismatchStatus !== 403 ||
    record.paidAiRouterError !== 'budget_violation' ||
    record.secretPayloadError !== 'secret_detected'
  ) {
    fail('Security drill failed');
  }
  return Object.freeze({ status: 'pass' });
}

/**
 * Emits a deterministic recovery drill report preserving explicit null for unexecuted checks.
 */
export function buildRecoveryDrillReport(input) {
  const record = assertPlainObject(input, 'Invalid recovery report');
  assertAllowedKeys(record, new Set(['executedAt', 'drills']), 'Invalid recovery report');
  const executedAt = parseIsoTimestamp(record.executedAt, 'Invalid recovery report');
  const drills = dataArray(record.drills, 50).map(raw => {
    const d = assertPlainObject(raw, 'Invalid recovery report');
    assertAllowedKeys(d, new Set(['id', 'status', 'detail']), 'Invalid recovery report');
    const id = validateId(d.id);
    if (d.status !== null && !['pass', 'fail'].includes(d.status)) fail('Invalid recovery report');
    const detail = validateText(d.detail, 500);
    return Object.freeze({ id, status: d.status, detail });
  });

  const hasFail = drills.some(d => d.status === 'fail');
  return Object.freeze({
    schema: 'stackpilot-recovery-drill-report-v1',
    executedAt,
    overallStatus: hasFail ? 'fail' : 'pass',
    drills: Object.freeze(drills)
  });
}
