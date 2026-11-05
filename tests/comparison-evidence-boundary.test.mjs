import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COMPARISON_PAIRS,getComparisonPair} from '../src/lib/comparison-pairs.mjs';
const products=JSON.parse(readFileSync(new URL('../src/data/products.json',import.meta.url),'utf8'));

test('unapproved pairwise vendor claims never render as verified comparison facts',()=>{
  for(const pair of COMPARISON_PAIRS){
    const result=getComparisonPair(pair.slug,products);
    assert.equal(result.matrix.length,pair.matrix.length);
    result.matrix.forEach((row,i)=>{
      assert.match(row.claimId,/^comparison-[a-z0-9-]+-\d{2}$/);
      assert.equal(row.evidenceStatus,'unverified');
      assert.equal(row.approved,false);
      assert.equal(row.sourceId,null);
      assert.equal(row.checkedAt,null);
      assert.match(row.firstValue,/unverified/i);
      assert.match(row.secondValue,/unverified/i);
      assert.notEqual(row.firstValue,pair.matrix[i].firstValue);
      assert.notEqual(row.secondValue,pair.matrix[i].secondValue);
      assert.match(row.buyerContext,/verify|ask|confirm/i);
    });
  }
});

test('comparison rows are isolated from mutable catalog and never carry affiliate or scoring fields',()=>{
  const result=getComparisonPair('hubspot-vs-pipedrive',products);
  for(const row of result.matrix){
    assert.equal(Object.hasOwn(row,'affiliateUrl'),false);
    assert.equal(Object.hasOwn(row,'commission'),false);
    assert.equal(Object.hasOwn(row,'score'),false);
  }
  result.matrix[0].firstValue='tampered';
  assert.notEqual(getComparisonPair('hubspot-vs-pipedrive',products).matrix[0].firstValue,'tampered');
});
