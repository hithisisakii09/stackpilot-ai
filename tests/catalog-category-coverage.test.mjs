import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../src/data/products.json' with { type: 'json' };
import { recommend, GOALS, TEAM_SIZES, BUDGETS } from '../src/lib/recommend.mjs';

const expected = {
  sales: ['HubSpot', 'Pipedrive'],
  seo: ['Ahrefs', 'Semrush'],
  hosting: ['Cloudways', 'Kinsta']
};

for (const goal of GOALS) {
  for (const team of TEAM_SIZES) {
    for (const budget of BUDGETS) {
      test(`unverified ${goal} / ${team} / ${budget} stays neutral`, () => {
        const results = recommend(catalog, { goal, team, budget });
        assert.deepEqual(results.map(r => r.product.name), expected[goal], 'category results must already be alphabetically neutral');
        for (const item of results) {
          assert.deepEqual(Object.keys(item).sort(), ['cautions','product','reasons'], 'unknown or unreviewed fit must never receive a numeric score');
          assert.equal(item.product.verified, false);
          assert.match(item.cautions.join(' '), /Team-size suitability has not been verified/);
          assert.match(item.cautions.join(' '), /pricing and budget suitability are not verified/);
          assert.match(item.cautions.join(' '), /editorial verification/);
          assert.equal(item.product.affiliateUrl, null);
        }
      });
    }
  }
}
