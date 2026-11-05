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

test('comparison page visibly exposes evidence status and identifiers',()=>{
 const page=readFileSync(new URL('../src/pages/compare/[slug].astro',import.meta.url),'utf8');
 assert.match(page,/row\.evidenceStatus/);
 assert.match(page,/row\.claimId/);
 assert.match(page,/No editorial approval/);
});

test('public comparison metadata is neutral, detached and contains no private raw research matrix',()=>{
 for(const candidate of COMPARISON_PAIRS){
  const data=getComparisonPair(candidate.slug,products);
  assert.notStrictEqual(data.pair,candidate);
  assert.equal(Object.hasOwn(data.pair,'matrix'),false);
  assert.equal(Object.hasOwn(data.pair,'buyerContext'),false);
  assert.notEqual(data.pair.metaDescription,candidate.metaDescription);
  assert.match(data.pair.metaDescription,/unverified|verify/i);
  assert.ok(data.pair.metaDescription.includes(candidate.title));
  const serialized=JSON.stringify(data);
  assert.equal(serialized.includes(candidate.metaDescription),false);
  for(const originalRow of candidate.matrix){
   for(const value of [originalRow.firstValue,originalRow.secondValue,originalRow.buyerContext]){
    assert.equal(serialized.includes(value),false,'Raw candidate research may not cross the public view-model boundary');
   }
  }
  const originalTool=candidate.relatedTools[0].title;
  data.pair.relatedTools[0].title='Changed display title';
  assert.equal(candidate.relatedTools[0].title,originalTool);
  const originalGuide=candidate.relatedGuides[0].title;
  data.pair.relatedGuides[0].title='Changed guide title';
  assert.equal(candidate.relatedGuides[0].title,originalGuide);
 }
});

test('Astro compare routes accept only a slug, never private comparison records as route props',()=>{
 const page=readFileSync(new URL('../src/pages/compare/[slug].astro',import.meta.url),'utf8');
 assert.match(page,/params:\s*\{\s*slug:\s*pair\.slug\s*\}/);
 assert.doesNotMatch(page,/props:\s*\{\s*pair\s*\}/);
 assert.doesNotMatch(page,/const\s+\{\s*pair\s*\}\s*=\s*Astro\.props/);
 assert.match(page,/getComparisonPair\(Astro\.params\.slug,\s*products\)/);
 assert.match(page,/metaDescription/);
});
