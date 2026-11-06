import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COMPARISON_PAIRS} from '../src/lib/comparison-pairs.mjs';
import {
 PUBLIC_COMPARISON_ROUTES,getPublicComparisonRoute
} from '../src/lib/public-comparison-routes.mjs';

test('public-safe routes exactly match every generated canonical static comparison',()=>{
 const expected=COMPARISON_PAIRS.map(({slug,firstId,secondId})=>({slug,firstId,secondId}));
 assert.deepEqual(PUBLIC_COMPARISON_ROUTES,expected);
 assert.equal(PUBLIC_COMPARISON_ROUTES.length,3);
 for(const pair of expected){
  assert.equal(getPublicComparisonRoute(pair.firstId,pair.secondId),'/compare/'+pair.slug+'/');
  assert.equal(getPublicComparisonRoute(pair.secondId,pair.firstId),'/compare/'+pair.slug+'/');
  assert.equal(getPublicComparisonRoute(pair.firstId),'/compare/'+pair.slug+'/');
  assert.equal(getPublicComparisonRoute(pair.secondId),'/compare/'+pair.slug+'/');
 }
});

test('unknown, invalid, mismatched or noncatalog product pairs have no synthesized link',()=>{
 for(const [id,peer] of [
  ['semrush','kinsta'],['hubspot','ahrefs'],['kinsta','pipedrive'],
  ['ahrefs','ahrefs'],['hubspot','hubspot'],['not-a-product',undefined],
  ['',undefined],[null,undefined],[undefined,'semrush'],[{},'ahrefs'],
  ['semrush',{}]
 ]){
  assert.equal(getPublicComparisonRoute(id,peer),null);
 }
});

test('safe routing module never imports the private research matrix or embeds candidate claims',()=>{
 const source=readFileSync(new URL('../src/lib/public-comparison-routes.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/comparison-pairs|matrix|firstValue|secondValue|candidateAssertion|verificationTier/i);
 for(const literal of ['CSV export for deals','Monthly workspace credit limits','One-click staging'])
  assert.equal(source.includes(literal),false);
});

test('homepage advisor exposes only public-safe profile and canonical comparison links',()=>{
 const page=readFileSync(new URL('../src/pages/index.astro',import.meta.url),'utf8');
 assert.match(page,/import\s*\{\s*getPublicComparisonRoute\s*\}\s*from\s*['"]\.\.\/lib\/public-comparison-routes\.mjs['"]/);
 assert.match(page,/getPublicComparisonRoute\(product\.id\)/);
 assert.match(page,/\/software\/\$\{product\.id\}\//);
 assert.match(page,/View (?:candidate )?profile|View product profile|Product profile/);
 assert.match(page,/Compare with category peer|Peer comparison/);
 assert.doesNotMatch(page,/import .*recommend-explainability|import .*comparison-pairs/);
});
