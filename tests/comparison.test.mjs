import test from 'node:test';
import assert from 'node:assert/strict';
import { comparisonCategories, categoryCandidates, compareCandidates } from '../src/lib/comparison.mjs';
import products from '../src/data/products.json' with { type: 'json' };

test('candidate categories are stable and alphabetical', () => {
  assert.deepEqual(comparisonCategories(products), ['CRM', 'Hosting', 'SEO']);
});
test('candidate selections always stay in the same category', () => {
  assert.deepEqual(categoryCandidates(products, 'CRM').map(p => p.id), ['hubspot', 'pipedrive']);
  assert.throws(() => categoryCandidates(products, 'Gambling'), /Unknown/);
});
test('comparison is transparent about missing evidence', () => {
  const result = compareCandidates(products, 'CRM', 'hubspot', 'pipedrive');
  assert.equal(result.category, 'CRM');
  assert.deepEqual(result.products.map(p => p.name), ['HubSpot', 'Pipedrive']);
  assert.ok(result.products.every(p => p.teamFit === 'Unverified'));
  assert.ok(result.products.every(p => p.budgetFit === 'Unverified'));
  assert.ok(result.products.every(p => p.pricing.startsWith('Unverified')));
  assert.ok(result.products.every(p => p.editorialStatus === 'Editorial review pending'));
});
test('comparison source counts never imply editorial verification', () => {
  const result = compareCandidates(products, 'SEO', 'ahrefs', 'semrush');
  assert.ok(result.products.every(p => p.identifiedSources >= 1));
  assert.equal(result.rows.find(r => r.key === 'identifiedSources').label,
    'Vendor sources identified (not verified)');
});
test('comparison keeps affiliate status out of suitability', () => {
  const result = compareCandidates(products, 'Hosting', 'cloudways', 'kinsta');
  assert.ok(result.products.every(p => p.affiliateStatus === 'No affiliate links active'));
  assert.ok(result.rows.every(r => !['affiliateUrl', 'score', 'commission'].includes(r.key)));
});
test('duplicate selections are invalid', () => {
  assert.throws(() => compareCandidates(products, 'CRM', 'hubspot', 'hubspot'), /different/);
});
test('cross-category selections are invalid', () => {
  assert.throws(() => compareCandidates(products, 'CRM', 'hubspot', 'ahrefs'), /same category/);
});
test('fabricated ids cannot be compared', () => {
  assert.throws(() => compareCandidates(products, 'CRM', 'fake', 'pipedrive'), /same category/);
});
test('unverified compatibility cannot leak from unapproved data', () => {
  const fake = [{ ...products[0], supportedTeams: ['Solo'], budgetTiers: ['Premium'], verified: false }, products[3]];
  const result = compareCandidates(fake, 'CRM', 'hubspot', 'pipedrive');
  assert.equal(result.products[0].teamFit, 'Unverified');
  assert.equal(result.products[0].budgetFit, 'Unverified');
});
test('comparison does not alter original catalog', () => {
  const copy = structuredClone(products);
  compareCandidates(products, 'CRM', 'hubspot', 'pipedrive');
  assert.deepEqual(products, copy);
});

test('ambiguous duplicate catalog IDs are rejected before comparison', () => {
  const ambiguous=[products[0],{...products[0],name:'Impersonated Vendor'},...products.slice(1)];
  assert.throws(() => compareCandidates(ambiguous,'CRM','hubspot','pipedrive'),/Duplicate product id/);
  assert.throws(() => categoryCandidates(ambiguous,'CRM'),/Duplicate product id/);
});

test('rejects unsafe product IDs before constructing research profile links', () => {
  for (const id of ['../admin', 'hubspot?ref=affiliate', 'hubspot/other', '', 'HUBSPOT']) {
    const unsafe=[{...products[0],id},...products.slice(1)];
    assert.throws(() => comparisonCategories(unsafe), /Invalid product id/);
    assert.throws(() => categoryCandidates(unsafe,'CRM'), /Invalid product id/);
  }
});
