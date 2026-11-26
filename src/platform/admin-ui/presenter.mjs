import { types } from 'node:util';
import { id as validateId, choice, integer, dataArray } from '../contracts/validation.mjs';

export const ADMIN_SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': "default-src 'none'; style-src 'self' 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow'
});

function fail(message = 'Invalid admin UI input') {
  throw new Error(message);
}

function assertPlainObject(value, message = 'Invalid admin UI input') {
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

function assertAllowedKeys(record, allowed, message = 'Invalid admin UI input') {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) fail(message);
  }
}

function validatePrincipal(raw) {
  const p = assertPlainObject(raw);
  assertAllowedKeys(p, new Set(['organizationId', 'userId', 'role', 'keyId']));
  try {
    return Object.freeze({
      organizationId: validateId(p.organizationId),
      userId: validateId(p.userId),
      role: choice(p.role, ['owner', 'reviewer', 'agent'])
    });
  } catch {
    fail();
  }
}

function safeDisplayText(value, max = 500) {
  if (value === null || value === undefined) return '—';
  if (typeof value !== 'string') fail();
  if (value.length > max) fail();
  return value;
}

/**
 * Escapes all HTML special characters to prevent XSS.
 */
export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Formats integer minor units with ISO currency code, or returns '—' for null/unknown.
 */
export function formatMinorCurrency(amountMinor, currency) {
  if (amountMinor === null || amountMinor === undefined) return '—';
  if (!Number.isSafeInteger(amountMinor) || typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) {
    fail('Invalid admin UI currency');
  }
  const sign = amountMinor < 0 ? '-' : '';
  const abs = Math.abs(amountMinor);
  const major = Math.floor(abs / 100);
  const minor = String(abs % 100).padStart(2, '0');
  return `${currency} ${sign}${major}.${minor}`;
}

export function presentAdminOverview(input) {
  const record = assertPlainObject(input);
  assertAllowedKeys(record, new Set([
    'principal',
    'monthlyBudgetInr',
    'delegatedSpendInr',
    'publicAffiliateUrl',
    'noindexActive',
    'healthStatus',
    'findingsCount'
  ]));
  const principal = validatePrincipal(record.principal);
  if (
    record.monthlyBudgetInr !== 0 ||
    record.delegatedSpendInr !== 0 ||
    record.publicAffiliateUrl !== null ||
    record.noindexActive !== true
  ) {
    fail();
  }
  const healthStatus = choice(record.healthStatus, ['healthy', 'degraded', 'blocked', 'unknown']);
  const findingsCount = record.findingsCount === null ? null : integer(record.findingsCount, 0, 10000);
  return Object.freeze({
    principal,
    monthlyBudgetInr: 0,
    delegatedSpendInr: 0,
    publicAffiliateUrl: null,
    noindexActive: true,
    healthStatus,
    findingsCount
  });
}

export function presentAdminApprovals(input) {
  const record = assertPlainObject(input);
  assertAllowedKeys(record, new Set(['principal', 'items']));
  const principal = validatePrincipal(record.principal);
  const items = dataArray(record.items, 200).map(raw => {
    const item = assertPlainObject(raw);
    assertAllowedKeys(item, new Set(['id', 'kind', 'status', 'title']));
    return Object.freeze({
      id: validateId(item.id),
      kind: safeDisplayText(item.kind, 64),
      status: safeDisplayText(item.status, 64),
      title: safeDisplayText(item.title, 300)
    });
  });
  return Object.freeze({
    principal,
    canMutate: principal.role === 'owner',
    items: Object.freeze(items)
  });
}

export function presentAdminClaims(input) {
  const record = assertPlainObject(input);
  assertAllowedKeys(record, new Set(['principal', 'claims']));
  const principal = validatePrincipal(record.principal);
  const claims = dataArray(record.claims, 200).map(raw => {
    const item = assertPlainObject(raw);
    assertAllowedKeys(item, new Set(['id', 'status', 'freshness', 'observedPriceMinor', 'currency']));
    const observedPriceMinor = item.observedPriceMinor === null || item.observedPriceMinor === undefined
      ? null
      : integer(item.observedPriceMinor, 0, 100_000_000);
    const currency = item.currency ?? 'USD';
    return Object.freeze({
      id: validateId(item.id),
      status: safeDisplayText(item.status, 64),
      freshness: safeDisplayText(item.freshness, 64),
      formattedPrice: formatMinorCurrency(observedPriceMinor, currency)
    });
  });
  return Object.freeze({ principal, claims: Object.freeze(claims) });
}

export function presentAdminPartnerships(input) {
  const record = assertPlainObject(input);
  assertAllowedKeys(record, new Set(['principal', 'drafts', 'partnerships']));
  const principal = validatePrincipal(record.principal);
  const drafts = dataArray(record.drafts, 200).map(raw => {
    const d = assertPlainObject(raw);
    assertAllowedKeys(d, new Set(['id', 'title', 'status', 'citedCount']));
    return Object.freeze({
      id: validateId(d.id),
      title: safeDisplayText(d.title, 200),
      status: safeDisplayText(d.status, 64),
      citedCount: integer(d.citedCount, 0, 200)
    });
  });
  const partnerships = dataArray(record.partnerships, 200).map(raw => {
    const p = assertPlainObject(raw);
    assertAllowedKeys(p, new Set(['id', 'vendorId', 'state', 'step', 'publicAffiliateUrl']));
    if (p.publicAffiliateUrl !== null) fail();
    return Object.freeze({
      id: validateId(p.id),
      vendorId: validateId(p.vendorId),
      state: safeDisplayText(p.state, 64),
      step: integer(p.step, 1, 12),
      publicAffiliateUrl: null
    });
  });
  return Object.freeze({
    principal,
    drafts: Object.freeze(drafts),
    partnerships: Object.freeze(partnerships)
  });
}

export function presentAdminRevenue(input) {
  const record = assertPlainObject(input);
  assertAllowedKeys(record, new Set(['principal', 'forecastTotalsByCurrency', 'actualTotalsByCurrency']));
  const principal = validatePrincipal(record.principal);
  const formatBucket = rawBucket => {
    const bucket = assertPlainObject(rawBucket);
    return Object.freeze(
      Object.keys(bucket)
        .sort((a, b) => a.localeCompare(b, 'en'))
        .map(currency => Object.freeze({ currency, formatted: formatMinorCurrency(bucket[currency], currency) }))
    );
  };
  return Object.freeze({
    principal,
    forecasts: formatBucket(record.forecastTotalsByCurrency),
    actuals: formatBucket(record.actualTotalsByCurrency)
  });
}

export function presentAdminAiEngineering(input) {
  const record = assertPlainObject(input);
  assertAllowedKeys(record, new Set(['principal', 'routing', 'triage']));
  const principal = validatePrincipal(record.principal);
  const routing = dataArray(record.routing, 200).map(raw => {
    const r = assertPlainObject(raw);
    assertAllowedKeys(r, new Set(['id', 'taskClass', 'selectedModelId', 'tier', 'estimatedCostMinor', 'allowed']));
    if (r.estimatedCostMinor !== 0) fail();
    if (r.tier !== null && !['free', 'local'].includes(r.tier)) fail();
    return Object.freeze({
      id: validateId(r.id),
      taskClass: safeDisplayText(r.taskClass, 64),
      selectedModelId: r.selectedModelId === null ? '—' : safeDisplayText(r.selectedModelId, 64),
      tier: r.tier === null ? '—' : r.tier,
      estimatedCostMinor: 0,
      allowed: Boolean(r.allowed)
    });
  });
  const triage = dataArray(record.triage, 200).map(raw => {
    const t = assertPlainObject(raw);
    assertAllowedKeys(t, new Set(['id', 'candidateStatus', 'classifications']));
    return Object.freeze({
      id: validateId(t.id),
      candidateStatus: safeDisplayText(t.candidateStatus, 64),
      classifications: Object.freeze(dataArray(t.classifications, 32).map(c => safeDisplayText(c, 64)))
    });
  });
  return Object.freeze({
    principal,
    routing: Object.freeze(routing),
    triage: Object.freeze(triage)
  });
}
