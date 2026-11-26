import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeKeywordPhrase,
  normalizeClusterKey,
  classifySearchIntent,
  normalizeKeywordClusterInput,
  deduplicateKeywordClusters
} from '../src/platform/growth/keywords.mjs';

test('normalizeKeywordPhrase normalizes whitespace and casing and rejects unsafe input', () => {
  assert.equal(normalizeKeywordPhrase('  Best   CRM   for Agencies  '), 'best crm for agencies');
  assert.throws(() => normalizeKeywordPhrase(''), /Invalid keyword/);
  assert.throws(() => normalizeKeywordPhrase('   '), /Invalid keyword/);
  assert.throws(() => normalizeKeywordPhrase('<script>alert(1)</script>'), /Invalid keyword/);
  assert.throws(() => normalizeKeywordPhrase('crm\x00test'), /Invalid keyword/);
  assert.throws(() => normalizeKeywordPhrase(null), /Invalid keyword/);
});

test('normalizeClusterKey produces deterministic order-invariant cluster keys', () => {
  assert.equal(normalizeClusterKey('  CRM   for Agencies '), normalizeClusterKey('agencies for crm'));
  assert.equal(normalizeClusterKey('HubSpot vs Pipedrive'), 'hubspot-pipedrive-vs');
});

test('classifySearchIntent classifies intent deterministically', () => {
  assert.equal(classifySearchIntent('hubspot vs pipedrive'), 'comparison');
  assert.equal(classifySearchIntent('best crm for small agencies'), 'commercial');
  assert.equal(classifySearchIntent('pipedrive pricing'), 'transactional');
  assert.equal(classifySearchIntent('hubspot login'), 'navigational');
  assert.equal(classifySearchIntent('what is crm software'), 'informational');
});

test('normalizeKeywordClusterInput preserves explicit null for unknown metrics and never fabricates numbers', () => {
  const cluster = normalizeKeywordClusterInput({
    name: '  Agency CRM Comparison  ',
    phrases: [
      { phrase: '  HubSpot  vs  Pipedrive ' },
      { phrase: 'pipedrive vs hubspot', volume: null, difficulty: null, cpc: null }
    ]
  });

  assert.equal(cluster.name, 'Agency CRM Comparison');
  assert.equal(cluster.intent, 'comparison');
  assert.match(cluster.id, /^cluster-[a-f0-9]{40}$/);
  assert.equal(cluster.phrases.length, 2);
  for (const entry of cluster.phrases) {
    assert.equal(entry.volume, null);
    assert.equal(entry.difficulty, null);
    assert.equal(entry.cpc, null);
  }
});

test('deduplicateKeywordClusters merges equivalent clusters and deduplicates phrases', () => {
  const merged = deduplicateKeywordClusters([
    {
      name: 'CRM Agencies',
      phrases: [
        { phrase: 'best crm for agencies', volume: 1200, difficulty: null, cpc: null },
        { phrase: '  Best   CRM for   Agencies ' }
      ]
    },
    {
      name: 'agencies crm',
      phrases: [
        { phrase: 'crm software for agencies', volume: null, difficulty: 35, cpc: null }
      ]
    }
  ]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].phrases.length, 2);
  assert.equal(merged[0].phrases[0].volume, 1200);
  assert.equal(merged[0].phrases[0].difficulty, null);
  assert.equal(merged[0].phrases[1].volume, null);
  assert.equal(merged[0].phrases[1].difficulty, 35);
});

test('keywords module rejects Proxy, non-plain prototypes, fabricated/invalid metrics, and monetization keys', () => {
  const proxied = new Proxy({ name: 'CRM', phrases: [{ phrase: 'crm' }] }, {});
  assert.throws(() => normalizeKeywordClusterInput(proxied), /Invalid keyword/);

  const protoObj = Object.create({ inherited: true });
  protoObj.name = 'CRM';
  protoObj.phrases = [{ phrase: 'crm' }];
  assert.throws(() => normalizeKeywordClusterInput(protoObj), /Invalid keyword/);

  assert.throws(
    () => normalizeKeywordClusterInput({
      name: 'CRM',
      affiliateUrl: 'https://example.com',
      phrases: [{ phrase: 'crm' }]
    }),
    /Commercial input is prohibited/
  );

  assert.throws(
    () => normalizeKeywordClusterInput({
      name: 'CRM',
      phrases: [{ phrase: 'crm', commissionRate: 0.2 }]
    }),
    /Commercial input is prohibited/
  );

  assert.throws(
    () => normalizeKeywordClusterInput({
      name: 'CRM',
      phrases: [{ phrase: 'crm', difficulty: 150 }]
    }),
    /Invalid keyword/
  );

  assert.throws(
    () => normalizeKeywordClusterInput({
      name: 'CRM',
      phrases: [{ phrase: 'crm', volume: -5 }]
    }),
    /Invalid keyword/
  );
});
