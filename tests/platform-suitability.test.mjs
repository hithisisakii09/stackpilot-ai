import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSuitability } from '../src/platform/growth/suitability.mjs';

const products = () => [
  { id:'alpha-crm', name:'Alpha CRM', category:'CRM', workflowTags:['pipeline','automation'], affiliateUrl:null, claims:[], pricingProjections:[] },
  { id:'beta-crm', name:'Beta CRM', category:'CRM', workflowTags:['pipeline'], affiliateUrl:null, claims:[], pricingProjections:[] }
];
const constraints = () => ({ category:'CRM', teamSizeBand:'2-10', budgetCeiling:1000, requiredWorkflowDimensions:['pipeline'] });

test('candidate-only inputs remain explicitly unverified and never produce a suitability score', () => {
  const result = evaluateSuitability({ constraints:constraints(), products:products() });
  assert.deepEqual(result.map(row => row.id), ['alpha-crm','beta-crm']);
  for (const row of result) {
    assert.equal(row.status, 'CANDIDATE_UNVERIFIED');
    assert.equal(row.evidenceConfidence, 'UNKNOWN');
    assert.equal(row.score, null);
    assert.ok(row.rationale.some(item => /unapproved|candidate|unknown/i.test(item)));
  }
});

test('commission and affiliate fields cannot influence suitability', () => {
  assert.throws(() => evaluateSuitability({
    constraints:constraints(),
    products:[{...products()[0], commissionPercent:99}]
  }), /commercial|commission|affiliate/i);
  assert.throws(() => evaluateSuitability({
    constraints:{...constraints(), affiliateUrl:'https://example.test/ref'},
    products:products()
  }), /commercial|commission|affiliate/i);
});

test('hostile, polluted, non-finite and unbounded inputs fail closed', () => {
  const polluted = JSON.parse('{"category":"CRM","teamSizeBand":"2-10","budgetCeiling":1000,"requiredWorkflowDimensions":["pipeline"],"__proto__":{"admin":true}}');
  for (const input of [
    { constraints:{...constraints(), budgetCeiling:Infinity}, products:products() },
    { constraints:{...constraints(), requiredWorkflowDimensions:Array(65).fill('pipeline')}, products:products() },
    { constraints:polluted, products:products() },
    { constraints:constraints(), products:new Proxy(products(), { get(){ throw new Error('trap'); } }) }
  ]) assert.throws(() => evaluateSuitability(input), /invalid|unsupported|bounded|input/i);
});

test('candidate ordering is deterministic and alphabetic without approved evidence', () => {
  const result = evaluateSuitability({ constraints:constraints(), products:products().reverse() });
  assert.deepEqual(result.map(row => row.id), ['alpha-crm','beta-crm']);
});
