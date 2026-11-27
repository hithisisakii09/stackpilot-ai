import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { validateVerifiedVendorFacts, getVerifiedVendorFacts } from '../src/lib/verified-vendor-facts.mjs';

const rawFacts = JSON.parse(readFileSync(new URL('../src/data/verified-vendor-facts.json', import.meta.url), 'utf8'));

test('src/data/verified-vendor-facts.json passes validateVerifiedVendorFacts and returns frozen snapshots', () => {
  const validated = validateVerifiedVendorFacts(rawFacts, { today: '2026-11-27' });
  assert.equal(Object.isFrozen(validated), true);
  assert.deepEqual(Object.keys(validated).sort(), ['hubspot-vs-pipedrive', 'kinsta-vs-cloudways', 'semrush-vs-ahrefs']);

  for (const slug of ['hubspot-vs-pipedrive', 'semrush-vs-ahrefs', 'kinsta-vs-cloudways']) {
    const pair = getVerifiedVendorFacts(slug, { today: '2026-11-27' });
    assert.equal(Object.isFrozen(pair), true);
    assert.equal(pair.checkedAt, '2026-11-27');
    assert.ok(pair.rows.length >= 2);
    for (const row of pair.rows) {
      assert.equal(Object.isFrozen(row), true);
      assert.equal(Object.isFrozen(row.first), true);
      assert.equal(Object.isFrozen(row.second), true);
    }
  }
  assert.throws(() => getVerifiedVendorFacts('unknown-pair'), /Invalid|Unknown/i);
});

test('rejects non-HTTPS URLs, non-official domains, and referral or UTM tracking parameters', () => {
  const mutateFirstUrl = (url) => {
    const clone = structuredClone(rawFacts);
    clone['hubspot-vs-pipedrive'].rows[0].first.sourceUrl = url;
    return clone;
  };

  assert.throws(() => validateVerifiedVendorFacts(mutateFirstUrl('http://legal.hubspot.com/hubspot-product-and-services-catalog'), { today: '2026-11-27' }), /HTTPS/i);
  assert.throws(() => validateVerifiedVendorFacts(mutateFirstUrl('https://thirdparty.example/hubspot'), { today: '2026-11-27' }), /official|domain/i);
  assert.throws(() => validateVerifiedVendorFacts(mutateFirstUrl('https://not-hubspot.com/docs'), { today: '2026-11-27' }), /official|domain/i);

  for (const param of ['ref=partner', 'aff=123', 'affiliate=yes', 'utm_source=stackpilot', 'partner=abc', 'via=sp']) {
    assert.throws(
      () => validateVerifiedVendorFacts(mutateFirstUrl(`https://legal.hubspot.com/hubspot-product-and-services-catalog?${param}`), { today: '2026-11-27' }),
      /tracking|referral|query/i,
      `Expected rejection for query parameter: ${param}`
    );
  }
});

test('rejects future dates, missing slug coverage, undeclared fields, and Proxy/prototype payloads', () => {
  const futureClone = structuredClone(rawFacts);
  futureClone['hubspot-vs-pipedrive'].checkedAt = '2026-11-28';
  assert.throws(() => validateVerifiedVendorFacts(futureClone, { today: '2026-11-27' }), /date|future/i);

  const impossibleDate = structuredClone(rawFacts);
  impossibleDate['hubspot-vs-pipedrive'].checkedAt = '2026-02-30';
  assert.throws(() => validateVerifiedVendorFacts(impossibleDate, { today: '2026-11-27' }), /date/i);

  const missingSlug = structuredClone(rawFacts);
  delete missingSlug['kinsta-vs-cloudways'];
  assert.throws(() => validateVerifiedVendorFacts(missingSlug, { today: '2026-11-27' }), /slug|coverage|missing/i);

  const extraField = structuredClone(rawFacts);
  extraField['hubspot-vs-pipedrive'].rows[0].first.affiliateUrl = 'https://evil.example';
  assert.throws(() => validateVerifiedVendorFacts(extraField, { today: '2026-11-27' }), /Invalid|undeclared/i);

  let trapReads = 0;
  const proxied = new Proxy(structuredClone(rawFacts), {
    get() {
      trapReads++;
      throw new Error('Proxy trap must not execute');
    },
    ownKeys() {
      trapReads++;
      throw new Error('Proxy ownKeys must not execute');
    }
  });
  assert.throws(() => validateVerifiedVendorFacts(proxied, { today: '2026-11-27' }), /Invalid/);
  assert.equal(trapReads, 0);

  const badProto = Object.assign(Object.create({ inherited: true }), structuredClone(rawFacts));
  assert.throws(() => validateVerifiedVendorFacts(badProto, { today: '2026-11-27' }), /Invalid/);
});

test('built comparison pages render verified vendor documentation snapshot with safe external links', () => {
  if (!existsSync(new URL('../dist/compare/hubspot-vs-pipedrive/index.html', import.meta.url))) {
    return;
  }
  for (const slug of ['hubspot-vs-pipedrive', 'semrush-vs-ahrefs', 'kinsta-vs-cloudways']) {
    const html = readFileSync(new URL(`../dist/compare/${slug}/index.html`, import.meta.url), 'utf8');
    const normalizedHtml = html.replace(/&amp;/g, '&');
    const pair = getVerifiedVendorFacts(slug, { today: '2026-11-27' });
    assert.match(normalizedHtml, /First-party vendor documentation snapshot \(checked 2026-11-27\)/);
    for (const row of pair.rows) {
      assert.ok(normalizedHtml.includes(row.dimension), `${slug} missing dimension: ${row.dimension}`);
      assert.ok(html.includes(`href="${row.first.sourceUrl}"`), `${slug} missing first sourceUrl`);
      assert.ok(html.includes(`href="${row.second.sourceUrl}"`), `${slug} missing second sourceUrl`);
    }
    const snapshotSection = html.split('id="verified-docs"')[1]?.split('</section>')[0] ?? '';
    assert.match(snapshotSection, /rel="noopener noreferrer"/);
    assert.match(snapshotSection, /target="_blank"/);
  }
});
