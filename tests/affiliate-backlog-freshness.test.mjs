import test from 'node:test';
import assert from 'node:assert/strict';
import products from '../src/data/products.json' with { type:'json' };
import evidenceLeads from '../src/data/evidence-leads.json' with { type:'json' };
import affiliateCandidates from '../src/data/affiliate-programs.json' with { type:'json' };
import editorialPackets from '../src/data/editorial-packet-ledger.json' with { type:'json' };
import policy from '../config/operating-policy.json' with { type:'json' };
import { validateAffiliateCandidates, createAffiliateResearchQueue } from '../src/lib/affiliate-readiness.mjs';
import { buildOperatingBacklog } from '../src/lib/operating-backlog.mjs';

const reviewedCandidates=()=>affiliateCandidates.map(candidate=>({
 ...candidate,
 lastReviewedOn:'2026-11-04',
 ...(candidate.productId==='ahrefs'
  ? {researchStatus:'no-public-program-found',nextResearchAction:'recheck-program-status'}
  : {})
}));
const make=(updates={})=>({
 products,evidenceLeads,affiliateCandidates:reviewedCandidates(),editorialPackets,policy,
 today:'2026-11-04',...updates
});
const affiliateActions=new Set(['locate-official-program','recheck-program-eligibility','recheck-program-status']);

test('records separate source intake and last-review dates without treating no public program as acceptance',()=>{
 const candidates=reviewedCandidates();
 assert.equal(validateAffiliateCandidates(candidates,products,{today:'2026-11-04'}),6);
 const queue=createAffiliateResearchQueue(candidates,products,{today:'2026-11-04'});
 const ahrefs=queue.find(row=>row.productId==='ahrefs');
 assert.equal(ahrefs.researchStatus,'no-public-program-found');
 assert.equal(ahrefs.sourceUrl,null);
 assert.equal(ahrefs.lastReviewedOn,'2026-11-04');
 assert.equal(ahrefs.nextAction,'recheck-program-status');
 assert.equal(ahrefs.applicationStatus,'not-applied');
 assert.equal(ahrefs.partnerAcceptance,'not-verified');
 assert.equal(ahrefs.affiliateReady,false);
 assert.equal(ahrefs.earningsKnown,false);
});

test('rejects future or impossible last-review dates and contradictory no-public-program records',()=>{
 const candidates=reviewedCandidates();
 for(const date of ['2026-11-05','2026-02-30','not-a-date']){
  const changed=candidates.map(row=>row.productId==='pipedrive'?{...row,lastReviewedOn:date}:row);
  assert.throws(()=>validateAffiliateCandidates(changed,products,{today:'2026-11-04'}),/review|date/i,date);
 }
 assert.throws(()=>validateAffiliateCandidates(candidates.map(row=>row.productId==='ahrefs'?{...row,programUrl:'https://ahrefs.com/affiliate'}:row),products,{today:'2026-11-04'}),/program|source|url/i);
 assert.throws(()=>validateAffiliateCandidates(candidates.map(row=>row.productId==='ahrefs'?{...row,nextResearchAction:'locate-official-program'}:row),products,{today:'2026-11-04'}),/program|action|status/i);
});

test('freshly reviewed candidates and no-public-program finding do not repeat in the daily backlog',()=>{
 const result=buildOperatingBacklog(make());
 assert.deepEqual(result.automatic.filter(task=>affiliateActions.has(task.action)),[]);
 assert.equal(result.metrics.programCandidates,5);
 assert.equal(result.metrics.programDiscoveryGaps,0);
 assert.equal(result.metrics.programsWithoutPublicAffiliateProgram,1);
 assert.equal(result.metrics.affiliateReviewsDue,0);
 assert.equal(result.canPublish,false);
 assert.equal(result.canMonetize,false);
 assert.equal(result.canSpend,false);
});

test('unresolved public-program discovery remains the highest-priority affiliate task',()=>{
 const candidates=reviewedCandidates().map(row=>row.productId==='ahrefs'
  ? {...row,researchStatus:'program-discovery-needed',nextResearchAction:'locate-official-program'}
  : row);
 const result=buildOperatingBacklog(make({affiliateCandidates:candidates}));
 const task=result.automatic.find(item=>item.productId==='ahrefs'&&item.action==='locate-official-program');
 assert.equal(task.priority,40);
 assert.equal(result.metrics.programDiscoveryGaps,1);
 assert.equal(result.metrics.programsWithoutPublicAffiliateProgram,0);
});

test('stale affiliate reviews re-enter deterministically after the 90-day review window',()=>{
 const result=buildOperatingBacklog(make({today:'2027-02-03',staleAfterDays:90}));
 const tasks=result.automatic.filter(item=>affiliateActions.has(item.action));
 assert.deepEqual(tasks.map(item=>[item.productId,item.priority,item.action]),[
  ['cloudways',50,'recheck-program-eligibility'],
  ['hubspot',50,'recheck-program-eligibility'],
  ['kinsta',50,'recheck-program-eligibility'],
  ['pipedrive',50,'recheck-program-eligibility'],
  ['semrush',50,'recheck-program-eligibility'],
  ['ahrefs',60,'recheck-program-status']
 ]);
 assert.equal(result.metrics.affiliateReviewsDue,6);
});

test('missing review date fails closed by requeueing that candidate immediately',()=>{
 const candidates=reviewedCandidates().map(row=>row.productId==='pipedrive'
  ? {...row,lastReviewedOn:null}
  : row);
 const result=buildOperatingBacklog(make({affiliateCandidates:candidates}));
 const task=result.automatic.find(item=>item.productId==='pipedrive'&&item.action==='recheck-program-eligibility');
 assert.equal(task.priority,50);
 assert.equal(result.metrics.affiliateReviewsDue,1);
});

test('review queue is deterministic, does not mutate source data and never grants commercial authority',()=>{
 const candidates=reviewedCandidates();
 const snapshot=structuredClone(candidates);
 const forward=buildOperatingBacklog(make({affiliateCandidates:candidates}));
 const reversed=buildOperatingBacklog(make({
  affiliateCandidates:[...candidates].reverse(),
  products:[...products].reverse()
 }));
 assert.deepEqual(forward,reversed);
 assert.deepEqual(candidates,snapshot);
 assert.ok(candidates.every(row=>row.applicationStatus==='not-applied'));
 assert.ok(candidates.every(row=>row.acceptedByProgram===false&&row.acceptedTerms===false));
 assert.ok(candidates.every(row=>row.trackingUrl===null&&row.earningsReported===null));
 assert.equal(forward.metrics.approvedClaims,0);
 assert.equal(forward.metrics.verifiedRevenue,null);
});
