import { types } from 'node:util';
import rawExtendedCatalog from '../data/extended-catalog.json' with { type: 'json' };
import legacyProducts from '../data/products.json' with { type: 'json' };
import { COMPARISON_PAIRS } from './comparison-pairs.mjs';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TRACKING_PARAM_PATTERN = /^(?:ref|aff|affiliate|utm_[a-z0-9_]+|partner|partner_id|via|click_id|subid|tag)$/i;

const ALLOWED_CATEGORIES = new Set(['sales', 'seo', 'hosting']);

const ALLOWED_OFFICIAL_DOMAINS = Object.freeze([
  // 7 Wave 1 official vendor domains
  'zoho.com',
  'close.com',
  'freshworks.com',
  'seranking.com',
  'moz.com',
  'wpengine.com',
  'siteground.com',
  // 7 Wave 2 official vendor domains
  'salesforce.com',
  'monday.com',
  'activecampaign.com',
  'mangools.com',
  'screamingfrog.co.uk',
  'pressable.com',
  'getflywheel.com',
  // 6 legacy official vendor domains
  'hubspot.com',
  'pipedrive.com',
  'semrush.com',
  'ahrefs.com',
  'kinsta.com',
  'cloudways.com',
]);

const LEGACY_PRODUCT_SLUGS = new Set(legacyProducts.map(p => p.id));
const LEGACY_COMPARISON_SLUGS = new Set(COMPARISON_PAIRS.map(p => p.slug));

function fail(message = 'Invalid extended catalog payload') {
  throw new Error(message);
}

function assertPlainObject(value, message = 'Invalid extended catalog payload') {
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

function assertSafeText(value, minLen, maxLen, label) {
  if (typeof value !== 'string') fail(`Invalid ${label}: expected string`);
  const trimmed = value.trim();
  if (trimmed.length < minLen || trimmed.length > maxLen) {
    fail(`Invalid ${label}: length out of bounds`);
  }
  if (/[<>]/.test(trimmed)) {
    fail(`Unsafe HTML characters not permitted in ${label}`);
  }
  return trimmed;
}

function assertIsoDateNotFuture(value, today) {
  if (
    typeof value !== 'string' ||
    !ISO_DATE_PATTERN.test(value) ||
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

function isAllowedOfficialDomain(hostname) {
  const lower = hostname.toLowerCase();
  return ALLOWED_OFFICIAL_DOMAINS.some(
    domain => lower === domain || lower.endsWith('.' + domain),
  );
}

function assertOfficialHttpsUrl(rawUrl, label) {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0 || rawUrl.length > 2048) {
    fail(`Invalid ${label}: expected HTTPS URL`);
  }
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    fail(`Invalid ${label}: malformed URL`);
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    fail(`Invalid ${label}: must be clean HTTPS URL`);
  }
  if (!isAllowedOfficialDomain(parsed.hostname)) {
    fail(`URL domain not in official vendor allowlist for ${label}: ${parsed.hostname}`);
  }
  for (const key of parsed.searchParams.keys()) {
    if (TRACKING_PARAM_PATTERN.test(key)) {
      fail(`Tracking or affiliate query parameters not permitted in ${label}: ${key}`);
    }
  }
  return rawUrl;
}

function validateDocEntry(rawEntry, label) {
  const entry = assertPlainObject(rawEntry, `Invalid ${label}`);
  assertAllowedKeys(entry, ['summary', 'sourceLabel', 'sourceUrl'], `Invalid fields in ${label}`);
  return Object.freeze({
    summary: assertSafeText(entry.summary, 10, 600, `${label}.summary`),
    sourceLabel: assertSafeText(entry.sourceLabel, 3, 140, `${label}.sourceLabel`),
    sourceUrl: assertOfficialHttpsUrl(entry.sourceUrl, `${label}.sourceUrl`),
  });
}

/**
 * Validates and deeply freezes extended-catalog.json.
 * Fail-closed against non-null affiliateUrl, non-HTTPS URLs, non-allowlisted domains,
 * tracking query parameters, legacy slug collisions, and Proxy/prototype payloads.
 */
export function validateExtendedCatalog(data, options = {}) {
  const opts = assertPlainObject(options, 'Invalid options');
  const today = opts.today !== undefined
    ? assertIsoDateNotFuture(opts.today, '9999-12-31')
    : new Date().toISOString().slice(0, 10);

  const root = assertPlainObject(data, 'Invalid extended catalog root');
  assertAllowedKeys(
    root,
    ['schemaVersion', 'checkedAt', 'products', 'comparisons'],
    'Invalid root fields in extended-catalog.json',
  );
  if (root.schemaVersion !== 1) fail('Invalid schemaVersion');
  const checkedAt = assertIsoDateNotFuture(root.checkedAt, today);
  if (!Array.isArray(root.products) || root.products.length === 0) {
    fail('products must be a non-empty array');
  }
  if (!Array.isArray(root.comparisons) || root.comparisons.length === 0) {
    fail('comparisons must be a non-empty array');
  }

  const seenProductIds = new Set();
  const normalizedProducts = [];

  for (const rawProd of root.products) {
    const prod = assertPlainObject(rawProd, 'Invalid extended product entry');
    assertAllowedKeys(
      prod,
      ['id', 'name', 'category', 'description', 'website', 'affiliateUrl', 'officialUrls', 'verifiedDocs', 'checklist', 'relatedComparisons'],
      'Invalid or undeclared fields in extended product',
    );

    if (typeof prod.id !== 'string' || !SLUG_PATTERN.test(prod.id) || prod.id.length > 60) {
      fail(`Invalid product id: ${String(prod.id)}`);
    }
    if (LEGACY_PRODUCT_SLUGS.has(prod.id)) {
      fail(`Extended product slug collides with legacy products.json: ${prod.id}`);
    }
    if (seenProductIds.has(prod.id)) {
      fail(`Duplicate extended product id: ${prod.id}`);
    }
    seenProductIds.add(prod.id);

    if (prod.affiliateUrl !== null) {
      fail(`affiliateUrl must be strictly null for ${prod.id}`);
    }
    if (!ALLOWED_CATEGORIES.has(prod.category)) {
      fail(`Invalid category for ${prod.id}: ${String(prod.category)}`);
    }

    const name = assertSafeText(prod.name, 2, 80, `${prod.id}.name`);
    const description = assertSafeText(prod.description, 15, 500, `${prod.id}.description`);
    const website = assertOfficialHttpsUrl(prod.website, `${prod.id}.website`);

    if (!Array.isArray(prod.officialUrls) || prod.officialUrls.length === 0) {
      fail(`officialUrls must be non-empty array for ${prod.id}`);
    }
    const officialUrls = Object.freeze(
      prod.officialUrls.map((u, idx) => assertOfficialHttpsUrl(u, `${prod.id}.officialUrls[${idx}]`)),
    );

    if (!Array.isArray(prod.verifiedDocs) || prod.verifiedDocs.length < 2) {
      fail(`verifiedDocs must have >= 2 rows for ${prod.id}`);
    }
    const verifiedDocs = Object.freeze(prod.verifiedDocs.map((row, idx) => {
      const r = assertPlainObject(row, `Invalid verifiedDocs[${idx}]`);
      assertAllowedKeys(r, ['dimension', 'summary', 'sourceLabel', 'sourceUrl'], `Invalid verifiedDocs fields`);
      return Object.freeze({
        dimension: assertSafeText(r.dimension, 3, 120, `${prod.id}.verifiedDocs[${idx}].dimension`),
        summary: assertSafeText(r.summary, 10, 600, `${prod.id}.verifiedDocs[${idx}].summary`),
        sourceLabel: assertSafeText(r.sourceLabel, 3, 140, `${prod.id}.verifiedDocs[${idx}].sourceLabel`),
        sourceUrl: assertOfficialHttpsUrl(r.sourceUrl, `${prod.id}.verifiedDocs[${idx}].sourceUrl`),
      });
    }));

    if (!Array.isArray(prod.checklist) || prod.checklist.length < 2) {
      fail(`checklist must have >= 2 items for ${prod.id}`);
    }
    const checklist = Object.freeze(
      prod.checklist.map((item, idx) => assertSafeText(item, 8, 300, `${prod.id}.checklist[${idx}]`)),
    );

    if (!Array.isArray(prod.relatedComparisons)) {
      fail(`relatedComparisons must be an array for ${prod.id}`);
    }
    const relatedComparisons = Object.freeze(prod.relatedComparisons.map((rc, idx) => {
      const obj = assertPlainObject(rc, `Invalid relatedComparisons[${idx}]`);
      assertAllowedKeys(obj, ['slug', 'title'], 'Invalid relatedComparisons fields');
      if (typeof obj.slug !== 'string' || !SLUG_PATTERN.test(obj.slug)) {
        fail(`Invalid relatedComparison slug: ${String(obj.slug)}`);
      }
      return Object.freeze({
        slug: obj.slug,
        title: assertSafeText(obj.title, 3, 120, `${prod.id}.relatedComparisons[${idx}].title`),
      });
    }));

    normalizedProducts.push(Object.freeze({
      id: prod.id,
      name,
      category: prod.category,
      description,
      website,
      affiliateUrl: null,
      officialUrls,
      verifiedDocs,
      checklist,
      relatedComparisons,
    }));
  }

  const seenComparisonSlugs = new Set();
  const normalizedComparisons = [];

  for (const rawComp of root.comparisons) {
    const comp = assertPlainObject(rawComp, 'Invalid extended comparison entry');
    assertAllowedKeys(
      comp,
      ['slug', 'title', 'metaDescription', 'category', 'first', 'second', 'rows', 'questions'],
      'Invalid or undeclared fields in extended comparison',
    );

    if (typeof comp.slug !== 'string' || !SLUG_PATTERN.test(comp.slug) || comp.slug.length > 80) {
      fail(`Invalid comparison slug: ${String(comp.slug)}`);
    }
    if (LEGACY_COMPARISON_SLUGS.has(comp.slug)) {
      fail(`Extended comparison slug collides with legacy COMPARISON_PAIRS: ${comp.slug}`);
    }
    if (seenComparisonSlugs.has(comp.slug)) {
      fail(`Duplicate extended comparison slug: ${comp.slug}`);
    }
    seenComparisonSlugs.add(comp.slug);

    if (!ALLOWED_CATEGORIES.has(comp.category)) {
      fail(`Invalid category for ${comp.slug}: ${String(comp.category)}`);
    }

    const title = assertSafeText(comp.title, 5, 140, `${comp.slug}.title`);
    const metaDescription = assertSafeText(comp.metaDescription, 40, 200, `${comp.slug}.metaDescription`);

    const validateSide = (rawSide, sideLabel) => {
      const s = assertPlainObject(rawSide, `Invalid ${sideLabel}`);
      assertAllowedKeys(s, ['id', 'name', 'description', 'website'], `Invalid fields in ${sideLabel}`);
      if (typeof s.id !== 'string' || !SLUG_PATTERN.test(s.id)) fail(`Invalid id in ${sideLabel}`);
      return Object.freeze({
        id: s.id,
        name: assertSafeText(s.name, 2, 80, `${sideLabel}.name`),
        description: assertSafeText(s.description, 10, 500, `${sideLabel}.description`),
        website: assertOfficialHttpsUrl(s.website, `${sideLabel}.website`),
      });
    };

    const first = validateSide(comp.first, `${comp.slug}.first`);
    const second = validateSide(comp.second, `${comp.slug}.second`);

    if (!Array.isArray(comp.rows) || comp.rows.length < 3) {
      fail(`${comp.slug}.rows must contain at least 3 documentation rows`);
    }
    const rows = Object.freeze(comp.rows.map((row, idx) => {
      const r = assertPlainObject(row, `Invalid row[${idx}]`);
      assertAllowedKeys(r, ['dimension', 'first', 'second'], 'Invalid comparison row fields');
      return Object.freeze({
        dimension: assertSafeText(r.dimension, 3, 120, `${comp.slug}.rows[${idx}].dimension`),
        first: validateDocEntry(r.first, `${comp.slug}.rows[${idx}].first`),
        second: validateDocEntry(r.second, `${comp.slug}.rows[${idx}].second`),
      });
    }));

    if (!Array.isArray(comp.questions) || comp.questions.length < 4) {
      fail(`${comp.slug}.questions must contain at least 4 verification questions`);
    }
    const questions = Object.freeze(comp.questions.map((q, idx) => {
      const qObj = assertPlainObject(q, `Invalid question[${idx}]`);
      assertAllowedKeys(qObj, ['dimension', 'buyerContext', 'firstValue', 'secondValue'], 'Invalid question fields');
      return Object.freeze({
        dimension: assertSafeText(qObj.dimension, 3, 120, `${comp.slug}.questions[${idx}].dimension`),
        buyerContext: assertSafeText(qObj.buyerContext, 10, 300, `${comp.slug}.questions[${idx}].buyerContext`),
        firstValue: assertSafeText(qObj.firstValue, 10, 300, `${comp.slug}.questions[${idx}].firstValue`),
        secondValue: assertSafeText(qObj.secondValue, 10, 300, `${comp.slug}.questions[${idx}].secondValue`),
      });
    }));

    normalizedComparisons.push(Object.freeze({
      slug: comp.slug,
      title,
      metaDescription,
      category: comp.category,
      first,
      second,
      rows,
      questions,
    }));
  }

  return Object.freeze({
    schemaVersion: 1,
    checkedAt,
    products: Object.freeze(normalizedProducts),
    comparisons: Object.freeze(normalizedComparisons),
  });
}

let cachedCatalog = null;
function getValidatedCatalog(options = {}) {
  if (!cachedCatalog || Object.keys(options).length > 0) {
    const validated = validateExtendedCatalog(rawExtendedCatalog, options);
    if (Object.keys(options).length === 0) cachedCatalog = validated;
    return validated;
  }
  return cachedCatalog;
}

export function getExtendedProducts(options = {}) {
  return getValidatedCatalog(options).products;
}

export function getExtendedProduct(slug, options = {}) {
  return getValidatedCatalog(options).products.find(p => p.id === slug) ?? null;
}

export function getExtendedComparisons(options = {}) {
  return getValidatedCatalog(options).comparisons;
}

export function getExtendedComparison(slug, options = {}) {
  return getValidatedCatalog(options).comparisons.find(c => c.slug === slug) ?? null;
}
