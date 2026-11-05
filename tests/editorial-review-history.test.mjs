import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COMPARISON_PAIRS} from '../src/lib/comparison-pairs.mjs';
import {
 computeReviewEventDigest, validateEditorialReviewHistory
} from '../src/lib/editorial-review-history.mjs';

const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const products=read('../src/data/products.json');
const ledger=read('../src/data/comparison-evidence.json');
const history=read('../src/data/editorial-review-history.json');
const today='2026-11-05';
const options={history,ledger,pairs:COMPARISON_PAIRS,products,today};
const GENESIS='0'.repeat(64);
const base={
 sequence:1,eventId:'local-review-0001',
 claimId:'comparison-hubspot-vs-pipedrive-01',productId:'hubspot',
 action:'needs-evidence',
 reason:'A relevant source is required before this vendor assertion can be evaluated.',
 recordedOn:today,previousDigest:GENESIS
};
const event=(payload)=>({...payload,digest:computeReviewEventDigest(payload)});
const first=()=>event(base);
const second=(overrides={})=>event({
 ...base,sequence:2,eventId:'local-review-0002',
 action:'rejected',reason:'Existing vendor research does not substantiate the current scope.',
 previousDigest:first().digest,...overrides
});

test('empty repository history is valid, untrusted, and incapable of approving content',()=>{
 assert.deepEqual(history,[]);
 assert.deepEqual(validateEditorialReviewHistory(options),{
  status:'LOCAL-STRUCTURE-ONLY',
  events:0,lastDigest:GENESIS,
  localChainConsistent:true,externallyAnchored:false,
  reviewerAuthenticated:false,authenticatedApprovals:0,canPublish:false
 });
});

test('sequential negative-only events have deterministic domain-separated digest',()=>{
 const one=first(),two=second();
 const before=structuredClone([one,two]);
 assert.match(one.digest,/^[0-9a-f]{64}$/);
 assert.notEqual(one.digest,two.digest);
 assert.equal(one.digest,computeReviewEventDigest({...base}));
 const result=validateEditorialReviewHistory({...options,history:[one,two]});
 assert.equal(result.events,2);
 assert.equal(result.lastDigest,two.digest);
 assert.equal(result.localChainConsistent,true);
 assert.equal(result.externallyAnchored,false);
 assert.equal(result.reviewerAuthenticated,false);
 assert.equal(result.authenticatedApprovals,0);
 assert.equal(result.canPublish,false);
 assert.deepEqual([one,two],before);
});

test('rejects edited, removed, reordered and broken-link review history',()=>{
 const one=first(),two=second();
 const cases=[
  [{...one,reason:'Rewritten reason after digest was set'},two],
  [two,one],
  [two],
  [one,{...two,previousDigest:GENESIS}],
  [one,{...two,digest:'f'.repeat(64)}],
  [{...one,sequence:2}]
 ];
 for(const candidate of cases)
  assert.throws(()=>validateEditorialReviewHistory({...options,history:candidate}),/sequence|digest|chain|hash/i);
});

test('rejects unknown claims, duplicate events, date anomalies and unsupported actions',()=>{
 const one=first();
 const bad=[
  {...base,claimId:'comparison-other-01'},
  {...base,productId:'pipedrive'},
  {...base,action:'approved'},
  {...base,action:'signed-off'},
  {...base,reason:'too short'},
  {...base,reason:'No supporting vendor fact <script>alert(1)</script>.'},
  {...base,reason:'No relevant source.\nSecond line cannot be accepted.'},
  {...base,recordedOn:'2026-11-06'},
  {...base,recordedOn:'2026-02-30'},
  {...base,eventId:'not valid'},
  {...base,previousDigest:'x'},
  {...base,approval:true},
  {...base,reviewer:'owner'},
  {...base,sourceSnapshot:'fake'},
 ];
 for(const item of bad)
  assert.throws(()=>validateEditorialReviewHistory({...options,history:[item]}));
 assert.throws(()=>validateEditorialReviewHistory({...options,history:[one,second({eventId:one.eventId})]}),/duplicate/i);
 assert.throws(()=>validateEditorialReviewHistory({...options,history:[one,second({recordedOn:'2026-11-04'})]}),/chronolog/i);
 assert.throws(()=>validateEditorialReviewHistory({...options,today:'2026-02-30'}),/date/i);
 assert.throws(()=>validateEditorialReviewHistory({...options,ledger:ledger.slice(1),history:[one]}),/incomplete/i);
 assert.throws(()=>validateEditorialReviewHistory({...options,history:'bad'}),/array/i);
});

test('review history is not rendered in any comparison page',()=>{
 const page=readFileSync(new URL('../src/pages/compare/[slug].astro',import.meta.url),'utf8');
 assert.doesNotMatch(page,/editorial-review-history|previousDigest|localChainConsistent/);
});
