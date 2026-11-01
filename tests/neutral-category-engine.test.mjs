import test from 'node:test';
import assert from 'node:assert/strict';
import {recommend} from '../src/lib/recommend.mjs';

const req={goal:'sales',team:'2–20',budget:'Moderate'};
const candidate=(id,name,verified=false)=>({
 id,name,bestFor:['sales'],verified,affiliateUrl:null,
 supportedTeams:['Solo'],budgetTiers:['Premium']
});

test('unverified category matches never expose arbitrary numeric suitability or ranking fields',()=>{
 const results=recommend([candidate('b','Beta'),candidate('a','Alpha')],req);
 assert.deepEqual(results.map(x=>x.product.name),['Alpha','Beta']);
 for(const match of results){
  assert.deepEqual(Object.keys(match).sort(),['cautions','product','reasons']);
  assert.equal(Object.hasOwn(match,'score'),false);
  assert.equal(Object.hasOwn(match,'rank'),false);
  assert.match(match.cautions.join(' '),/not (?:been )?verified|not completed/i);
  assert.doesNotMatch(JSON.stringify({reasons:match.reasons,cautions:match.cautions}),/\b(?:60|100)\/100\b/);
 }
});

test('alphabetical neutral order prevails even when a later candidate has verified compatibility',()=>{
 const a={...candidate('a','Aster'),verified:false};
 const z={...candidate('z','Zenith',true),supportedTeams:['2–20'],budgetTiers:['Moderate']};
 const results=recommend([z,a],req);
 assert.deepEqual(results.map(x=>x.product.name),['Aster','Zenith']);
 assert.equal(results[1].reasons.length>=2,true,'verified explanatory data may be shown without ranking');
 for(const r of results) assert.deepEqual(Object.keys(r).sort(),['cautions','product','reasons']);
});

test('changing selected team and budget never ranks unverified candidates or asserts unsupported fit',()=>{
 const products=[candidate('two','Zebra'),candidate('one','Alfa')];
 for(const team of ['Solo','2–20','21+'])for(const budget of ['Minimal','Moderate','Premium']){
  const results=recommend(products,{goal:'sales',team,budget});
  assert.deepEqual(results.map(x=>x.product.name),['Alfa','Zebra']);
  for(const item of results){
   assert.deepEqual(Object.keys(item).sort(),['cautions','product','reasons']);
   assert.match(item.cautions.join(' '),/team-size suitability has not been verified/i);
   assert.match(item.cautions.join(' '),/pricing.*not verified/i);
  }
 }
});

test('affiliate tracking does not change category order or explanatory content',()=>{
 const plain=[candidate('a','Alpha'),candidate('b','Beta')];
 const tracked=plain.map(x=>({...x,affiliateUrl:'https://invalid.example/affiliate?ref=x'}));
 const original=recommend(plain,req);
 const changed=recommend(tracked,req);
 assert.deepEqual(changed.map(x=>({reasons:x.reasons,cautions:x.cautions})),
                  original.map(x=>({reasons:x.reasons,cautions:x.cautions})));
 assert.deepEqual(changed.map(x=>x.product.name),['Alpha','Beta']);
});

test('deterministic name ties use id as secondary alphabetic key, not a priority score',()=>{
 const r=recommend([candidate('z-last','Same'),candidate('a-first','Same')],req);
 assert.deepEqual(r.map(x=>x.product.id),['a-first','z-last']);
});

test('invalid category/selector combinations still throw and empty category returns no matches',()=>{
 assert.throws(()=>recommend([candidate('x','X')],{...req,goal:'invalid'}),/Invalid/);
 assert.throws(()=>recommend([candidate('x','X')],{...req,team:'invalid'}),/Invalid/);
 assert.throws(()=>recommend([candidate('x','X')],{...req,budget:'invalid'}),/Invalid/);
 assert.deepEqual(recommend([candidate('x','X')],{...req,goal:'seo'}),[]);
});
