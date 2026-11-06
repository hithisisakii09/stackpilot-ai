import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { 
  explainRecommendation, 
  explainRecommendations,
  getWorkflowEvaluationDimensions 
} from '../src/lib/recommend-explainability.mjs';

const products = JSON.parse(readFileSync(new URL('../src/data/products.json', import.meta.url), 'utf8'));

test('explainRecommendation returns rich, neutral decision metadata for a product', () => {
  const hubspot = products.find(p => p.id === 'hubspot');
  assert.ok(hubspot);

  const explanation = explainRecommendation(hubspot, { goal: 'sales', team: '2–20', budget: 'Moderate' });
  assert.equal(explanation.productId, 'hubspot');
  assert.equal(explanation.productName, 'HubSpot');
  assert.equal(explanation.category, 'CRM');
  assert.equal(explanation.verificationTier, 'Tier 0: Unverified Candidate');
  assert.ok(explanation.primaryFocus.length > 0);
  assert.ok(explanation.workflowFitSummary.length > 0);
  assert.ok(explanation.suitabilityExplanation.includes('unverified') || explanation.suitabilityExplanation.includes('pending'));
  assert.ok(Array.isArray(explanation.evaluationCriteria) && explanation.evaluationCriteria.length >= 3);
  assert.equal(explanation.profileUrl, '/software/hubspot/');
  assert.equal(explanation.comparePeerUrl, '/compare/hubspot-vs-pipedrive/');
});

test('explainRecommendations processes a product list deterministically and alphabetically', () => {
  const crmProducts = products.filter(p => p.category === 'CRM');
  const results = explainRecommendations(crmProducts, { goal: 'sales', team: 'Solo', budget: 'Minimal' });

  assert.equal(results.length, 2);
  // Strictly alphabetical: HubSpot, then Pipedrive
  assert.equal(results[0].productName, 'HubSpot');
  assert.equal(results[1].productName, 'Pipedrive');
  assert.equal(results[1].comparePeerUrl, '/compare/hubspot-vs-pipedrive/');
});

test('getWorkflowEvaluationDimensions returns neutral dimensions per category', () => {
  for (const cat of ['CRM', 'SEO', 'Hosting']) {
    const dimensions = getWorkflowEvaluationDimensions(cat);
    assert.ok(Array.isArray(dimensions) && dimensions.length >= 3);
    for (const d of dimensions) {
      assert.ok(d.key && d.label && d.buyerRelevance);
    }
  }
});

test('rejects invalid inputs fail-closed', () => {
  assert.throws(() => explainRecommendation(null, { goal: 'sales', team: 'Solo', budget: 'Minimal' }), /invalid/i);
  assert.throws(() => explainRecommendation(products[0], null), /invalid/i);
  assert.throws(() => explainRecommendation(products[0], { goal: 'invalid' }), /invalid/i);
  assert.throws(() => getWorkflowEvaluationDimensions('UnknownCategory'), /unknown/i);
});


test('all six explanation peer links resolve to declared static comparison pages',()=>{
 const optionsByCategory={
  CRM:{goal:'sales',team:'Solo',budget:'Minimal'},
  SEO:{goal:'seo',team:'Solo',budget:'Minimal'},
  Hosting:{goal:'hosting',team:'Solo',budget:'Minimal'}
 };
 const expectations={
  hubspot:'/compare/hubspot-vs-pipedrive/',
  pipedrive:'/compare/hubspot-vs-pipedrive/',
  semrush:'/compare/semrush-vs-ahrefs/',
  ahrefs:'/compare/semrush-vs-ahrefs/',
  kinsta:'/compare/kinsta-vs-cloudways/',
  cloudways:'/compare/kinsta-vs-cloudways/'
 };
 for(const product of products){
  const result=explainRecommendation(product,optionsByCategory[product.category]);
  assert.equal(result.comparePeerUrl,expectations[product.id],product.id);
  assert.match(result.verificationTier,/Unverified|Unreviewed/);
  assert.match(result.suitabilityExplanation,/unverified/i);
 }
});
