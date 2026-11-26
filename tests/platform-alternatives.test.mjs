import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendAlternatives } from '../src/platform/growth/alternatives.mjs';

const products = () => [
  { id:'alpha-crm', name:'Alpha CRM', category:'CRM', workflowTags:['pipeline','automation'], affiliateUrl:null, claims:[], pricingProjections:[] },
  { id:'beta-crm', name:'Beta CRM', category:'CRM', workflowTags:['pipeline'], affiliateUrl:null, claims:[], pricingProjections:[] },
  { id:'gamma-seo', name:'Gamma SEO', category:'SEO', workflowTags:['keyword'], affiliateUrl:null, claims:[], pricingProjections:[] }
];

test('alternatives are same-category candidates with explicit evidence gaps', () => {
  const result = recommendAlternatives({ productSlug:'alpha-crm', products:products() });
  assert.equal(result.target.id, 'alpha-crm');
  assert.deepEqual(result.alternatives.map(item => item.id), ['beta-crm']);
  assert.equal(result.alternatives[0].evidenceConfidence, 'UNKNOWN');
  assert.equal(result.alternatives[0].tradeoffs.status, 'CANDIDATE_UNVERIFIED');
});

test('unknown slug and commercial influence fail closed', () => {
  assert.throws(() => recommendAlternatives({ productSlug:'missing', products:products() }), /unknown|product/i);
  assert.throws(() => recommendAlternatives({ productSlug:'alpha-crm', products:[{...products()[0], affiliateUrl:'https://example.test/ref'}] }), /commercial|affiliate/i);
});

test('unverified ties use alphabetic IDs and trade-offs are symmetric', () => {
  const forward = recommendAlternatives({ productSlug:'alpha-crm', products:products() }).alternatives[0];
  const reverse = recommendAlternatives({ productSlug:'beta-crm', products:products() }).alternatives[0];
  assert.deepEqual(forward.tradeoffs.shared, reverse.tradeoffs.shared);
  assert.deepEqual(forward.tradeoffs.onlyTarget, reverse.tradeoffs.onlyAlternative);
  assert.deepEqual(forward.tradeoffs.onlyAlternative, reverse.tradeoffs.onlyTarget);
  const tied = recommendAlternatives({ productSlug:'gamma-seo', products:[
    { id:'gamma-seo', name:'Gamma SEO', category:'SEO', workflowTags:['keyword'], affiliateUrl:null, claims:[], pricingProjections:[] },
    { id:'zeta-seo', name:'Zeta SEO', category:'SEO', workflowTags:['keyword'], affiliateUrl:null, claims:[], pricingProjections:[] },
    { id:'delta-seo', name:'Delta SEO', category:'SEO', workflowTags:['keyword'], affiliateUrl:null, claims:[], pricingProjections:[] }
  ] });
  assert.deepEqual(tied.alternatives.map(item => item.id), ['delta-seo','zeta-seo']);
});
