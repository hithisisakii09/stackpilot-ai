import test from 'node:test';
import assert from 'node:assert/strict';
import { recommend } from '../src/lib/recommend.mjs';

const hubspot = { id: 'hubspot', name: 'HubSpot', bestFor: ['sales'], verified: false, affiliateUrl: null };
const verified = { id: 'other', name: 'Other', bestFor: ['sales'], verified: true, supportedTeams: ['2–20'], budgetTiers: ['Moderate'], affiliateUrl: null };
const input = { goal: 'sales', team: '2–20', budget: 'Moderate' };

test('category matching selects only requested priority', () => {
  assert.deepEqual(recommend([hubspot, { name: 'SEO', bestFor: ['seo'] }], input).map(x => x.product.id), ['hubspot']);
});
test('unknown team and price do not earn positive suitability points', () => {
  const [result] = recommend([hubspot], input);
  assert.equal(result.score, 60);
  assert.match(result.cautions.join(' '), /pricing/);
  assert.match(result.cautions.join(' '), /Team-size/);
});
test('evidence-backed fit ranks ahead of unknown suitability', () => {
  const results = recommend([hubspot, verified], input);
  assert.equal(results[0].product.id, 'other');
  assert.equal(results[0].score, 100);
});
test('incompatible evidence is penalized and disclosed', () => {
  const [result] = recommend([{ ...verified, supportedTeams: ['Solo'], budgetTiers: ['Premium'] }], input);
  assert.equal(result.score, 0);
  assert.equal(result.cautions.length, 2);
});
test('affiliate status is not a ranking factor', () => {
  const withAffiliate = { ...hubspot, affiliateUrl: 'https://example.com/affiliate' };
  assert.equal(recommend([withAffiliate], input)[0].score, recommend([hubspot], input)[0].score);
});
test('invalid inputs are rejected', () => {
  assert.throws(() => recommend([hubspot], { ...input, goal: 'invalid' }), /Invalid/);
  assert.throws(() => recommend([hubspot], { ...input, budget: 'unknown' }), /Invalid/);
});
test('no match produces an empty result list', () => {
  assert.deepEqual(recommend([hubspot], { ...input, goal: 'hosting' }), []);
});
