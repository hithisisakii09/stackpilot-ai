import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { 
  COMPARISON_PAIRS, 
  getAllComparisonPairs, 
  getComparisonPair,
  generatePairVendorQuestionsCsv 
} from '../src/lib/comparison-pairs.mjs';

const products = JSON.parse(readFileSync(new URL('../src/data/products.json', import.meta.url), 'utf8'));

test('COMPARISON_PAIRS covers all three categories with valid slugs', () => {
  const pairs = getAllComparisonPairs();
  assert.equal(pairs.length, 3);

  const slugs = pairs.map(p => p.slug);
  assert.deepEqual(slugs, ['hubspot-vs-pipedrive', 'semrush-vs-ahrefs', 'kinsta-vs-cloudways']);

  for (const pair of pairs) {
    assert.match(pair.slug, /^[a-z0-9]+-vs-[a-z0-9]+$/);
    assert.ok(pair.category);
    assert.ok(pair.title);
    assert.ok(pair.firstId);
    assert.ok(pair.secondId);
    assert.ok(Array.isArray(pair.relatedTools) && pair.relatedTools.length >= 1);
    assert.ok(Array.isArray(pair.relatedGuides) && pair.relatedGuides.length >= 1);
  }
});

test('getComparisonPair returns complete side-by-side neutral matrix', () => {
  const crmPair = getComparisonPair('hubspot-vs-pipedrive', products);
  assert.equal(crmPair.pair.category, 'CRM');
  assert.equal(crmPair.first.id, 'hubspot');
  assert.equal(crmPair.second.id, 'pipedrive');
  assert.ok(Array.isArray(crmPair.matrix) && crmPair.matrix.length >= 6);

  for (const row of crmPair.matrix) {
    assert.ok(row.dimension);
    assert.ok(row.firstValue);
    assert.ok(row.secondValue);
    assert.ok(row.buyerContext);
  }
});

test('generatePairVendorQuestionsCsv produces safe CSV with neutralized formula characters', () => {
  const crmPair = getComparisonPair('hubspot-vs-pipedrive', products);
  const csv = generatePairVendorQuestionsCsv(crmPair);

  assert.match(csv, /^"Question ID","Category","Software Target","Question","Verification Priority"\r\n/);
  assert.match(csv, /"HubSpot"/);
  assert.match(csv, /"Pipedrive"/);
  // Neutral formula security check
  const lines = csv.split('\r\n').slice(1);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split('","');
    for (const col of cols) {
      const clean = col.replace(/^"|"$/g, '');
      assert.doesNotMatch(clean, /^[=+\-@\t\r]/, 'CSV value must not start with spreadsheet formula trigger');
    }
  }
});

test('getComparisonPair throws fail-closed on unknown slug or invalid catalog', () => {
  assert.throws(() => getComparisonPair('invalid-slug', products), /unknown/i);
  assert.throws(() => getComparisonPair('hubspot-vs-pipedrive', null), /invalid/i);
  assert.throws(() => getComparisonPair('hubspot-vs-pipedrive', []), /invalid|empty/i);
  assert.throws(() => getComparisonPair('hubspot-vs-pipedrive', [{ id: 'other' }]), /not found/i);
});
