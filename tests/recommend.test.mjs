import test from 'node:test';
import assert from 'node:assert/strict';
import {recommend, TEAM_SIZES, BUDGETS, GOALS} from '../src/lib/recommend.mjs';

const hubspot={id:'hubspot',name:'HubSpot',bestFor:['sales'],verified:false,affiliateUrl:null};
const verified={id:'other',name:'Other',bestFor:['sales'],verified:true,supportedTeams:['2–20'],budgetTiers:['Moderate'],affiliateUrl:null};
const input={goal:'sales',team:'2–20',budget:'Moderate'};

test('category matching selects only requested priority',()=>{
 assert.deepEqual(recommend([hubspot,{name:'SEO',bestFor:['seo']}],input).map(x=>x.product.id),['hubspot']);
});

test('unknown team and pricing yield cautions, not numeric suitability scores',()=>{
 const [result]=recommend([hubspot],input);
 assert.deepEqual(Object.keys(result).sort(),['cautions','product','reasons']);
 assert.match(result.cautions.join(' '),/pricing/i);
 assert.match(result.cautions.join(' '),/Team-size/i);
});

test('category matches remain alphabetical regardless of verified compatibility',()=>{
 const results=recommend([verified,hubspot],input);
 assert.deepEqual(results.map(x=>x.product.name),['HubSpot','Other']);
 assert.deepEqual(Object.keys(results[1]).sort(),['cautions','product','reasons']);
 assert.ok(results[1].reasons.some(x=>/team size|budget/i.test(x)));
});

test('incompatible verified facts are cautions but never ranking penalties or winners',()=>{
 const [result]=recommend([{...verified,supportedTeams:['Solo'],budgetTiers:['Premium']}],input);
 assert.deepEqual(Object.keys(result).sort(),['cautions','product','reasons']);
 assert.equal(result.cautions.length,2);
 assert.doesNotMatch(result.cautions.join(' '),/\bscore\b/i);
});

test('affiliate presence cannot affect order, evidence or explanatory notes',()=>{
 const withAffiliate={...hubspot,affiliateUrl:'https://example.com/affiliate'};
 const matched=recommend([withAffiliate],input)[0];
 const plain=recommend([hubspot],input)[0];
 assert.deepEqual({reasons:matched.reasons,cautions:matched.cautions},{reasons:plain.reasons,cautions:plain.cautions});
 assert.equal(Object.hasOwn(matched,'score'),false);
});

test('invalid inputs are rejected',()=>{
 assert.throws(()=>recommend([hubspot],{...input,goal:'invalid'}),/Invalid/);
 assert.throws(()=>recommend([hubspot],{...input,budget:'unknown'}),/Invalid/);
});

test('no match produces an empty result list',()=>{
 assert.deepEqual(recommend([hubspot],{...input,goal:'hosting'}),[]);
});

test('unreviewed compatibility annotations do not become positive claims',()=>{
 const tentative={...verified,verified:false,supportedTeams:['2–20'],budgetTiers:['Moderate']};
 const mismatched={...tentative,supportedTeams:['Solo'],budgetTiers:['Premium']};
 const a=recommend([tentative],input)[0];
 const b=recommend([mismatched],input)[0];
 assert.deepEqual(a.reasons,b.reasons);
 assert.equal(Object.hasOwn(a,'score'),false);
 assert.equal(Object.hasOwn(b,'score'),false);
 assert.match(a.cautions.join(' '),/not been verified/);
});

test('exported criteria constants are frozen', () => {
  assert.ok(Object.isFrozen(TEAM_SIZES));
  assert.ok(Object.isFrozen(BUDGETS));
  assert.ok(Object.isFrozen(GOALS));
});

test('defensive product list handling for non-arrays and null entries', () => {
  assert.deepEqual(recommend(null, input), []);
  assert.deepEqual(recommend(undefined, input), []);
  assert.deepEqual(recommend('not-an-array', input), []);
  const mixed = [null, undefined, hubspot, { bestFor: 'not-array' }];
  const results = recommend(mixed, input);
  assert.equal(results.length, 1);
  assert.equal(results[0].product.id, 'hubspot');
});

test('non-object or null options reject cleanly', () => {
  assert.throws(() => recommend([hubspot], null), /Invalid recommendation inputs/);
  assert.throws(() => recommend([hubspot], undefined), /Invalid recommendation inputs/);
  assert.throws(() => recommend([hubspot], 'not-object'), /Invalid recommendation inputs/);
  assert.throws(() => recommend([hubspot], {}), /Invalid recommendation inputs/);
});

test('defensive sorting handles missing product name or id without throwing', () => {
  const noName = { id: 'x', bestFor: ['sales'] };
  const noId = { name: 'Alpha', bestFor: ['sales'] };
  const normal = { id: 'beta', name: 'Beta', bestFor: ['sales'] };
  const results = recommend([noName, noId, normal], input);
  assert.equal(results.length, 3);
  assert.equal(results[0].product.name, undefined);
  assert.equal(results[1].product.name, 'Alpha');
  assert.equal(results[2].product.name, 'Beta');
});

