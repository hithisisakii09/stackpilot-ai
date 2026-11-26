import { types } from 'node:util';
import { id as validateId, choice } from '../contracts/validation.mjs';

const ENTRY_TYPES = Object.freeze(['forecast', 'actual']);
const ENTRY_KINDS = Object.freeze(['initial', 'adjustment', 'reversal']);
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function fail(message) {
  throw new Error(message);
}

function assertPlainObject(value, message = 'Invalid revenue input') {
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

function assertAllowedKeys(record, allowed, message = 'Invalid revenue input') {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) fail(message);
  }
}

function parseIsoTimestamp(value, message = 'Invalid revenue date') {
  if (typeof value !== 'string') fail(message);
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== value) fail(message);
  return ms;
}

function optionalMetric(value, max = 1_000_000_000) {
  if (value === undefined || value === null) return null;
  if (!Number.isSafeInteger(value) || value < 0 || value > max) {
    fail('Invalid revenue metric');
  }
  return value;
}

/**
 * Validates and constructs an immutable revenue ledger entry using integer minor units.
 */
export function buildRevenueLedgerEntry(input) {
  const record = assertPlainObject(input);
  assertAllowedKeys(
    record,
    new Set([
      'id',
      'programmeId',
      'entryType',
      'entryKind',
      'reversesEntryId',
      'statementId',
      'statementDigest',
      'currency',
      'amountMinor',
      'periodStart',
      'periodEnd',
      'recordedAt',
      'clicks',
      'conversions',
      'payoutMinor',
      'commissionRateBps',
      'now'
    ])
  );

  let entryId, programmeId, entryType, entryKind;
  try {
    entryId = validateId(record.id);
    programmeId = validateId(record.programmeId);
    entryType = choice(record.entryType, ENTRY_TYPES);
    entryKind = choice(record.entryKind, ENTRY_KINDS);
  } catch {
    fail('Invalid revenue input');
  }

  if (typeof record.currency !== 'string' || !CURRENCY_PATTERN.test(record.currency)) {
    fail('Invalid revenue currency');
  }

  if (!Number.isSafeInteger(record.amountMinor)) {
    fail('Invalid revenue amount');
  }
  if (entryKind === 'initial' && record.amountMinor < 0) {
    fail('Invalid revenue amount');
  }

  let reversesEntryId = null;
  if (entryKind === 'initial') {
    if (record.reversesEntryId !== undefined && record.reversesEntryId !== null) {
      fail('Invalid revenue input');
    }
  } else {
    try {
      reversesEntryId = validateId(record.reversesEntryId);
    } catch {
      fail('Invalid revenue input');
    }
  }

  const nowMs = record.now !== undefined ? parseIsoTimestamp(record.now) : Date.now();
  const periodStartMs = parseIsoTimestamp(record.periodStart);
  const periodEndMs = parseIsoTimestamp(record.periodEnd);
  const recordedAtMs = parseIsoTimestamp(record.recordedAt);
  if (periodEndMs < periodStartMs || recordedAtMs > nowMs) {
    fail('Invalid revenue date');
  }

  let statementId = null;
  let statementDigest = null;
  if (entryType === 'actual') {
    try {
      statementId = validateId(record.statementId);
    } catch {
      fail('Actual revenue requires statement');
    }
    if (typeof record.statementDigest !== 'string' || !SHA256_PATTERN.test(record.statementDigest)) {
      fail('Actual revenue requires statement');
    }
    statementDigest = record.statementDigest;
  } else if (
    (record.statementId !== undefined && record.statementId !== null) ||
    (record.statementDigest !== undefined && record.statementDigest !== null)
  ) {
    fail('Invalid revenue input');
  }

  const clicks = optionalMetric(record.clicks);
  const conversions = optionalMetric(record.conversions);
  const payoutMinor = optionalMetric(record.payoutMinor);
  const commissionRateBps = optionalMetric(record.commissionRateBps, 10000);

  return Object.freeze({
    id: entryId,
    programmeId,
    entryType,
    entryKind,
    reversesEntryId,
    statementId,
    statementDigest,
    currency: record.currency,
    amountMinor: record.amountMinor,
    periodStart: new Date(periodStartMs).toISOString(),
    periodEnd: new Date(periodEndMs).toISOString(),
    recordedAt: new Date(recordedAtMs).toISOString(),
    clicks,
    conversions,
    payoutMinor,
    commissionRateBps
  });
}

/**
 * Summarizes revenue ledger entries strictly by currency and entryType (never mixing currencies or rolling forecasts into actuals).
 */
export function summarizeRevenueByCurrency(entries) {
  if (!Array.isArray(entries) || types.isProxy(entries) || Object.getPrototypeOf(entries) !== Array.prototype) {
    fail('Invalid revenue entry list');
  }
  const actualTotals = Object.create(null);
  const forecastTotals = Object.create(null);

  for (const raw of entries) {
    const entry = buildRevenueLedgerEntry(raw);
    const bucket = entry.entryType === 'actual' ? actualTotals : forecastTotals;
    const prev = bucket[entry.currency] ?? 0;
    const next = prev + entry.amountMinor;
    if (!Number.isSafeInteger(next)) fail('Invalid revenue amount');
    bucket[entry.currency] = next;
  }

  const sortedEntries = obj =>
    Object.freeze(Object.fromEntries(Object.keys(obj).sort((a, b) => a.localeCompare(b, 'en')).map(k => [k, obj[k]])));

  return Object.freeze({
    actualTotalsByCurrency: sortedEntries(actualTotals),
    forecastTotalsByCurrency: sortedEntries(forecastTotals)
  });
}
