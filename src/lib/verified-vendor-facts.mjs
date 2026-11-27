import { types } from 'node:util';
import rawVerifiedVendorFacts from '../data/verified-vendor-facts.json' with { type: 'json' };

const EXPECTED_SLUGS = Object.freeze([
  'hubspot-vs-pipedrive',
  'semrush-vs-ahrefs',
  'kinsta-vs-cloudways'
]);

const OFFICIAL_VENDOR_DOMAINS = Object.freeze([
  'hubspot.com',
  'pipedrive.com',
  'semrush.com',
  'ahrefs.com',
  'kinsta.com',
  'cloudways.com'
]);

const TRACKING_PARAM_NAMES = new Set(['ref', 'aff', 'affiliate', 'partner', 'via']);

function fail(message) {
  throw new Error(message);
}

function assertPlainObject(value, message = 'Invalid verified vendor facts payload') {
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

function assertAllowedKeys(record, expectedKeys, message = 'Invalid or undeclared fields') {
  const keys = Object.keys(record);
  if (keys.length !== expectedKeys.length || expectedKeys.some(k => !Object.hasOwn(record, k))) {
    fail(message);
  }
}

function assertNonEmptyString(value, message = 'Expected non-empty string') {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(message);
  }
  return value.trim();
}

function assertIsoDateNotFuture(value, today) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value + 'T00:00:00.000Z').toISOString().slice(0, 10) !== value
  ) {
    fail('Invalid checkedAt ISO date');
  }
  if (value > today) {
    fail('checkedAt date cannot be in the future');
  }
  return value;
}

function assertOfficialVendorUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0 || rawUrl.length > 2048) {
    fail('Invalid vendor sourceUrl');
  }
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    fail('Invalid vendor sourceUrl');
  }
  if (parsed.protocol !== 'https:') {
    fail('Vendor sourceUrl must use HTTPS');
  }
  if (parsed.username || parsed.password || parsed.port) {
    fail('Vendor sourceUrl must not include credentials or non-standard port');
  }
  const host = parsed.hostname.toLowerCase();
  const isOfficial = OFFICIAL_VENDOR_DOMAINS.some(
    domain => host === domain || host.endsWith('.' + domain)
  );
  if (!isOfficial) {
    fail('Vendor sourceUrl must belong to an official first-party vendor domain');
  }
  for (const key of parsed.searchParams.keys()) {
    const lower = key.toLowerCase();
    if (TRACKING_PARAM_NAMES.has(lower) || lower.startsWith('utm_')) {
      fail('Vendor sourceUrl must not contain referral or tracking query parameters');
    }
  }
  return parsed.href;
}

function validateVendorEntry(raw) {
  const entry = assertPlainObject(raw, 'Invalid vendor entry');
  assertAllowedKeys(entry, ['summary', 'sourceLabel', 'sourceUrl'], 'Invalid or undeclared vendor entry fields');
  return Object.freeze({
    summary: assertNonEmptyString(entry.summary, 'Missing vendor fact summary'),
    sourceLabel: assertNonEmptyString(entry.sourceLabel, 'Missing vendor sourceLabel'),
    sourceUrl: assertOfficialVendorUrl(entry.sourceUrl)
  });
}

function validateSnapshotRow(raw) {
  const row = assertPlainObject(raw, 'Invalid snapshot row');
  assertAllowedKeys(row, ['dimension', 'first', 'second'], 'Invalid or undeclared snapshot row fields');
  return Object.freeze({
    dimension: assertNonEmptyString(row.dimension, 'Missing snapshot dimension'),
    first: validateVendorEntry(row.first),
    second: validateVendorEntry(row.second)
  });
}

/**
 * Validates and deeply freezes owner-verified first-party vendor documentation snapshots.
 */
export function validateVerifiedVendorFacts(data, options = {}) {
  const opts = assertPlainObject(options, 'Invalid options');
  const today = opts.today !== undefined
    ? assertIsoDateNotFuture(opts.today, '9999-12-31')
    : new Date().toISOString().slice(0, 10);

  const root = assertPlainObject(data, 'Invalid verified vendor facts root');
  const rootKeys = Object.keys(root);
  if (
    rootKeys.length !== EXPECTED_SLUGS.length ||
    EXPECTED_SLUGS.some(slug => !Object.hasOwn(root, slug))
  ) {
    fail('Missing or unexpected comparison pair slug coverage');
  }

  const normalized = {};
  for (const slug of EXPECTED_SLUGS) {
    const pair = assertPlainObject(root[slug], `Invalid snapshot pair for ${slug}`);
    assertAllowedKeys(pair, ['checkedAt', 'rows'], `Invalid or undeclared fields for ${slug}`);
    const checkedAt = assertIsoDateNotFuture(pair.checkedAt, today);
    if (!Array.isArray(pair.rows) || pair.rows.length === 0) {
      fail(`Snapshot rows must be a non-empty array for ${slug}`);
    }
    const rows = Object.freeze(pair.rows.map(validateSnapshotRow));
    normalized[slug] = Object.freeze({ checkedAt, rows });
  }
  return Object.freeze(normalized);
}

let cachedValidatedFacts = null;

/**
 * Loads and returns the deeply frozen verified vendor documentation snapshot for a comparison slug.
 */
export function getVerifiedVendorFacts(slug, options = {}) {
  if (typeof slug !== 'string' || !EXPECTED_SLUGS.includes(slug)) {
    fail(`Unknown verified vendor facts slug: ${String(slug)}`);
  }
  if (Object.keys(options).length === 0) {
    if (!cachedValidatedFacts) {
      cachedValidatedFacts = validateVerifiedVendorFacts(rawVerifiedVendorFacts);
    }
    return cachedValidatedFacts[slug];
  }
  return validateVerifiedVendorFacts(rawVerifiedVendorFacts, options)[slug];
}

const PRODUCT_COMPARISON_MAP = Object.freeze({
  hubspot: { comparisonSlug: 'hubspot-vs-pipedrive', side: 'first' },
  pipedrive: { comparisonSlug: 'hubspot-vs-pipedrive', side: 'second' },
  semrush: { comparisonSlug: 'semrush-vs-ahrefs', side: 'first' },
  ahrefs: { comparisonSlug: 'semrush-vs-ahrefs', side: 'second' },
  kinsta: { comparisonSlug: 'kinsta-vs-cloudways', side: 'first' },
  cloudways: { comparisonSlug: 'kinsta-vs-cloudways', side: 'second' }
});

/**
 * Returns the validated, deeply frozen first-party vendor documentation snapshot rows for a single product.
 */
export function getVerifiedVendorFactsForProduct(productId, options = {}) {
  if (typeof productId !== 'string' || !Object.hasOwn(PRODUCT_COMPARISON_MAP, productId)) {
    fail(`Unknown product ID for verified vendor facts: ${String(productId)}`);
  }
  const mapping = PRODUCT_COMPARISON_MAP[productId];
  const pair = getVerifiedVendorFacts(mapping.comparisonSlug, options);
  return Object.freeze({
    productId,
    comparisonSlug: mapping.comparisonSlug,
    checkedAt: pair.checkedAt,
    rows: Object.freeze(pair.rows.map(row => Object.freeze({
      dimension: row.dimension,
      entry: row[mapping.side]
    })))
  });
}
