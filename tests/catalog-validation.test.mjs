import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalog } from '../src/lib/catalog-validation.mjs';
import products from '../src/data/products.json' with { type: 'json' };

const catalog = () => structuredClone(products);

test('current catalog passes validation without claiming verification', () => {
  assert.equal(validateCatalog(catalog()), 6);
  assert.ok(products.every(p => !p.verified && p.affiliateUrl === null && p.researchStatus === 'needs-review' && p.sources.length > 0));
});
test('duplicate product id is rejected', () => {
  const records = catalog();
  records.push(structuredClone(records[0]));
  assert.throws(() => validateCatalog(records), /duplicate/);
});
test('affiliate URL remains prohibited', () => {
  const records = catalog();
  records[0].affiliateUrl = 'https://example.com/ref';
  assert.throws(() => validateCatalog(records), /Affiliate/);
});
test('invalid or insecure URL is rejected', () => {
  const records = catalog();
  records[0].website = 'http://example.com';
  assert.throws(() => validateCatalog(records), /website/);
});
test('unsupported team and budget labels are rejected', () => {
  const records = catalog();
  records[0].budgetTiers = ['Cheap'];
  assert.throws(() => validateCatalog(records), /budgetTiers/);
});
test('unverified catalog cannot claim team or budget suitability', () => {
  const records = catalog();
  records[0].supportedTeams = ['2–20'];
  assert.throws(() => validateCatalog(records), /verified evidence/);
});
test('verified status cannot be set without evidence', () => {
  const records = catalog();
  records[0].verified = true;
  assert.throws(() => validateCatalog(records), /requires evidence/);
});
test('pricing cannot silently change to an invented amount', () => {
  const records = catalog();
  records[0].pricing.amount = 10;
  assert.throws(() => validateCatalog(records), /Pricing/);
});
test('malformed sources are rejected', () => {
  const records = catalog();
  records[0].sources = [{ url: 'javascript:alert(1)', claim: 'Great tool', checkedAt: '2026-10-30' }];
  assert.throws(() => validateCatalog(records), /source/);
});

test('invalid calendar dates are rejected', () => {
  const records = catalog();
  records[0].sources[0].checkedAt = '2026-02-30';
  assert.throws(() => validateCatalog(records), /source/);
});
test('future-dated source evidence is rejected', () => {
  const records = catalog();
  records[0].sources[0].checkedAt = '2099-01-01';
  assert.throws(() => validateCatalog(records), /source/);
});

test('official vendor URLs cannot hide referral query parameters', () => {
  const records = catalog();
  records[0].website = 'https://www.hubspot.com/?ref=unapproved';
  assert.throws(() => validateCatalog(records), /website/);
});
