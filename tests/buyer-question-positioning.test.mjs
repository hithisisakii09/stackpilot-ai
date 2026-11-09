import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import products from '../src/data/products.json' with {type:'json'};
import {getAllComparisonPairs,getComparisonPair} from '../src/lib/comparison-pairs.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('pairwise buyer page labels the matrix as questions, not verified vendor feature comparisons',()=>{
 const page=read('../src/pages/compare/[slug].astro');
 assert.match(page,/Unverified buyer research worksheet/);
 assert.match(page,/not a verified feature comparison/i);
 assert.match(page,/does not establish a better vendor, fit, or savings/i);
 assert.doesNotMatch(page,/<p>Independent side-by-side comparison<\/p>/);
 assert.match(page,/Download vendor questions \(CSV\)/);
});

test('homepage links describe vendor questions without promising feature parity',()=>{
 const home=read('../src/pages/index.astro');
 assert.match(home,/Prepare questions for both vendors:/);
 assert.match(home,/Review questions for category peer/);
 assert.doesNotMatch(home,/Compare head-to-head:/);
});

test('all public pairwise matrix values still fail closed as unverified prompts',()=>{
 for(const pair of getAllComparisonPairs()){
  const result=getComparisonPair(pair.slug,products);
  assert.ok(result.matrix.length>=6);
  for(const row of result.matrix){
   assert.equal(row.evidenceStatus,'unverified');
   assert.equal(row.approved,false);
   assert.equal(row.sourceId,null);
   assert.equal(row.checkedAt,null);
   assert.match(row.firstValue,/^Unverified — ask /);
   assert.match(row.secondValue,/^Unverified — ask /);
  }
 }
});
