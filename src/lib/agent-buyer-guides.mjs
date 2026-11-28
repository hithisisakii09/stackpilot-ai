import { types } from 'node:util';
import rawGuidesData from '../data/agent-buyer-guides.json' with { type: 'json' };
import rawVerifiedFacts from '../data/verified-vendor-facts.json' with { type: 'json' };
import rawExtendedCatalog from '../data/extended-catalog.json' with { type: 'json' };
import { validateVerifiedVendorFacts } from './verified-vendor-facts.mjs';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_STATIC_GUIDE_SLUGS = new Set([
  'saas-total-cost-of-ownership',
  'crm-migration-checklist',
  'hosting-migration-checklist'
]);
const ALLOWED_COMPARISON_SLUGS = new Set([
  'hubspot-vs-pipedrive',
  'semrush-vs-ahrefs',
  'kinsta-vs-cloudways',
  ...(Array.isArray(rawExtendedCatalog?.comparisons) ? rawExtendedCatalog.comparisons.map(c => c.slug) : [])
]);
const SECRET_PATTERNS = [
  /(?:sk-[A-Za-z0-9_-]{12,}|ghp_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,})/i,
  /\bBearer\s+[A-Za-z0-9._-]{10,}/i,
  /-----BEGIN\s+(?:[A-Z0-9]+\s+)?PRIVATE KEY-----/i
];

function fail(message = 'Invalid agent buyer guides payload') {
  throw new Error(message);
}

function assertPlainObject(value, message = 'Invalid agent buyer guides payload') {
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

function assertSafePlainText(value, minLen = 1, maxLen = 4000, label = 'text') {
  if (typeof value !== 'string') fail(`Invalid ${label}: expected string`);
  const trimmed = value.trim();
  if (trimmed.length < minLen || trimmed.length > maxLen) {
    fail(`Invalid ${label}: length out of bounds`);
  }
  if (/[<>]/.test(trimmed)) {
    fail(`Unsafe HTML characters not permitted in ${label}`);
  }
  if (SECRET_PATTERNS.some(p => p.test(trimmed))) {
    fail(`Secret-like material not permitted in ${label}`);
  }
  return trimmed;
}

function assertIsoDateNotFuture(value, today) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value + 'T00:00:00.000Z').toISOString().slice(0, 10) !== value
  ) {
    fail('Invalid publishedAt ISO date');
  }
  if (value > today) {
    fail('publishedAt date cannot be in the future');
  }
  return value;
}

function collectAllowedSourceUrls(verifiedVendorFacts) {
  const validated = validateVerifiedVendorFacts(verifiedVendorFacts, { today: '9999-12-31' });
  const allowed = new Set();
  for (const pair of Object.values(validated)) {
    for (const row of pair.rows) {
      allowed.add(row.first.sourceUrl);
      allowed.add(row.second.sourceUrl);
    }
  }
  for (const comp of (rawExtendedCatalog?.comparisons ?? [])) {
    for (const row of (comp.rows ?? [])) {
      if (row?.first?.sourceUrl) allowed.add(row.first.sourceUrl);
      if (row?.second?.sourceUrl) allowed.add(row.second.sourceUrl);
    }
  }
  for (const prod of (rawExtendedCatalog?.products ?? [])) {
    for (const url of (prod.officialUrls ?? [])) {
      if (typeof url === 'string') allowed.add(url);
    }
  }
  return allowed;
}

/**
 * Validates and deeply freezes autonomous SEO buyer guides, ensuring every citation matches verified-vendor-facts.json.
 */
export function validateAgentBuyerGuides(data, verifiedVendorFacts = rawVerifiedFacts, options = {}) {
  const opts = assertPlainObject(options, 'Invalid options');
  const today = opts.today !== undefined
    ? assertIsoDateNotFuture(opts.today, '9999-12-31')
    : new Date().toISOString().slice(0, 10);

  const root = assertPlainObject(data, 'Invalid agent buyer guides root');
  assertAllowedKeys(root, ['schemaVersion', 'guides'], 'Invalid root fields in agent-buyer-guides');
  if (root.schemaVersion !== 1 || !Array.isArray(root.guides)) {
    fail('Invalid schemaVersion or guides array');
  }

  const allowedUrls = collectAllowedSourceUrls(verifiedVendorFacts);
  const seenSlugs = new Set();
  const normalizedGuides = [];

  for (const rawGuide of root.guides) {
    const guide = assertPlainObject(rawGuide, 'Invalid guide entry');
    assertAllowedKeys(guide, [
      'slug',
      'title',
      'metaDescription',
      'publishedAt',
      'summary',
      'relatedComparisonSlugs',
      'sections',
      'checklist',
      'citations'
    ], 'Invalid or undeclared guide fields');

    if (
      typeof guide.slug !== 'string' ||
      guide.slug.length > 80 ||
      !SLUG_PATTERN.test(guide.slug)
    ) {
      fail('Invalid guide slug format');
    }
    if (RESERVED_STATIC_GUIDE_SLUGS.has(guide.slug)) {
      fail(`Guide slug collides with reserved static guide route: ${guide.slug}`);
    }
    if (seenSlugs.has(guide.slug)) {
      fail(`Duplicate guide slug: ${guide.slug}`);
    }
    seenSlugs.add(guide.slug);

    const title = assertSafePlainText(guide.title, 5, 160, 'title');
    const metaDescription = assertSafePlainText(guide.metaDescription, 50, 160, 'metaDescription');
    const publishedAt = assertIsoDateNotFuture(guide.publishedAt, today);
    const summary = assertSafePlainText(guide.summary, 20, 600, 'summary');

    if (!Array.isArray(guide.relatedComparisonSlugs) || guide.relatedComparisonSlugs.length === 0) {
      fail('relatedComparisonSlugs must be a non-empty array');
    }
    const relatedComparisonSlugs = Object.freeze(guide.relatedComparisonSlugs.map(slug => {
      if (typeof slug !== 'string' || !ALLOWED_COMPARISON_SLUGS.has(slug)) {
        fail(`Unknown relatedComparisonSlug: ${String(slug)}`);
      }
      return slug;
    }));

    if (!Array.isArray(guide.sections) || guide.sections.length < 2 || guide.sections.length > 6) {
      fail('sections must contain between 2 and 6 items');
    }
    const sections = Object.freeze(guide.sections.map(rawSection => {
      const sec = assertPlainObject(rawSection, 'Invalid guide section');
      assertAllowedKeys(sec, ['heading', 'body'], 'Invalid guide section fields');
      return Object.freeze({
        heading: assertSafePlainText(sec.heading, 3, 140, 'section.heading'),
        body: assertSafePlainText(sec.body, 20, 2000, 'section.body')
      });
    }));

    if (!Array.isArray(guide.checklist) || guide.checklist.length < 3 || guide.checklist.length > 6) {
      fail('checklist must contain between 3 and 6 items');
    }
    const checklist = Object.freeze(
      guide.checklist.map(item => assertSafePlainText(item, 8, 300, 'checklist item'))
    );

    if (!Array.isArray(guide.citations) || guide.citations.length < 1) {
      fail('citations must contain at least 1 verified source');
    }
    const citations = Object.freeze(guide.citations.map(rawCitation => {
      const cit = assertPlainObject(rawCitation, 'Invalid citation');
      assertAllowedKeys(cit, ['label', 'url'], 'Invalid citation fields');
      const label = assertSafePlainText(cit.label, 3, 120, 'citation.label');
      if (typeof cit.url !== 'string' || !allowedUrls.has(cit.url)) {
        fail(`Citation URL is not in verified-vendor-facts.json: ${String(cit.url)}`);
      }
      return Object.freeze({ label, url: cit.url });
    }));

    normalizedGuides.push(Object.freeze({
      slug: guide.slug,
      title,
      metaDescription,
      publishedAt,
      summary,
      relatedComparisonSlugs,
      sections,
      checklist,
      citations
    }));
  }

  return Object.freeze({
    schemaVersion: 1,
    guides: Object.freeze(normalizedGuides)
  });
}

export function getAgentBuyerGuides(options = {}) {
  return validateAgentBuyerGuides(rawGuidesData, rawVerifiedFacts, options).guides;
}

export function getAgentBuyerGuide(slug, options = {}) {
  const guides = getAgentBuyerGuides(options);
  return guides.find(g => g.slug === slug) ?? null;
}
