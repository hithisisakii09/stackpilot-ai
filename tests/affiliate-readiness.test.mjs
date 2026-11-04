import test from 'node:test';
import assert from 'node:assert/strict';
import products from '../src/data/products.json' with { type:'json' };
import {
  validateAffiliateCandidates, createAffiliateResearchQueue
} from '../src/lib/affiliate-readiness.mjs';

const make = (productId='pipedrive') => ({
  productId,
  programUrl:'https://www.pipedrive.com/en/affiliate-partnership',
  researchStatus:'candidate',
  sourceLoggedOn:'2026-10-31',
  applicationStatus:'not-applied',
  applicationSubmittedAt:null,
  acceptedByProgram:false,
  acceptedTerms:false,
  trackingUrl:null,
  earningsReported:null,
  nextResearchAction:'assess-eligibility'
});
const gap = () => ({
  ...make('ahrefs'),programUrl:null,researchStatus:'program-discovery-needed',
  nextResearchAction:'locate-official-program'
});
const opts = {today:'2026-10-31'};

test('candidate sources do not constitute partner approval or earnings', () => {
 const data=[make(),gap()];
 assert.equal(validateAffiliateCandidates(data,products,opts),2);
 const queue=createAffiliateResearchQueue(data,products,opts);
 assert.equal(queue.filter(x=>x.affiliateReady).length,0);
 assert.ok(queue.every(x=>x.applicationStatus==='not-applied' && x.earningsKnown===false));
});
test('rejects unknown product ids and duplicate candidate records', () => {
 assert.throws(()=>validateAffiliateCandidates([make('unlisted')],products,opts),/product/i);
 assert.throws(()=>validateAffiliateCandidates([make(),make()],products,opts),/duplicate/i);
});
test('rejects fabricated activation and partner approval', () => {
 for(const [key,value] of Object.entries({
  acceptedByProgram:true, acceptedTerms:true, applicationStatus:'approved',
  applicationSubmittedAt:'2026-10-30',
  trackingUrl:'https://click.example/ref',
  earningsReported:100
 })) {
  assert.throws(()=>validateAffiliateCandidates([{...make(),[key]:value}],products,opts),
   /application|approval|contract|earnings|tracking|candidate|status/i,key);
 }
});
test('rejects insecure, redirect or referral style source URLs', () => {
 for(const url of ['http://www.pipedrive.com/en/affiliate-partnership',
   'https://www.pipedrive.com/en/affiliate-partnership?ref=abc',
   'https://evil.example/affiliate','javascript:alert(1)']) {
  assert.throws(()=>validateAffiliateCandidates([{...make(),programUrl:url}],products,opts),/source|url|domain/i,url);
 }
});
test('rejects contradictory program discovery state', () => {
 assert.throws(()=>validateAffiliateCandidates([{...gap(),researchStatus:'candidate'}],products,opts),/program|status|source/i);
 assert.throws(()=>validateAffiliateCandidates([{...make(),programUrl:null}],products,opts),/program|status|source/i);
});
test('rejects future dates and impossible calendar dates', () => {
 for(const date of ['2027-01-01','2026-02-30','tomorrow']) {
  assert.throws(()=>validateAffiliateCandidates([{...make(),sourceLoggedOn:date}],products,opts),/date/i);
 }
});
test('disallows extra affiliate data fields and unsafe research actions', () => {
 assert.throws(()=>validateAffiliateCandidates([{...make(),commissionPercent:100}],products,opts),/field/i);
 assert.throws(()=>validateAffiliateCandidates([{...make(),nextResearchAction:'apply-without-approval'}],products,opts),/action/i);
});
test('requires product program domain to match official known vendor identity', () => {
 assert.throws(()=>validateAffiliateCandidates([{...make(),productId:'kinsta'}],products,opts),/domain|source|url/i);
});
test('candidate results deterministic, leave input untouched, and never propose applying', () => {
 const items=[gap(),make()];
 const before=structuredClone(items);
 const queue=createAffiliateResearchQueue(items,products,opts);
 assert.deepEqual(items,before);
 assert.deepEqual(queue.map(x=>x.productId),['ahrefs','pipedrive']);
 assert.ok(queue.every(x=>x.nextAction!=='submit-application'));
 assert.ok(queue.every(x=>x.affiliateReady===false));
});
test('rejects malformed top-level input or options', () => {
 assert.throws(()=>validateAffiliateCandidates({},products,opts),/array/i);
 assert.throws(()=>validateAffiliateCandidates([make()],products,{today:'2026-02-30'}),/date/i);
});
