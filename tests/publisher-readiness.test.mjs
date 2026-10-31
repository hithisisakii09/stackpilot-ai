import test from 'node:test';
import assert from 'node:assert/strict';
import products from '../src/data/products.json' with {type:'json'};
import affiliateCandidates from '../src/data/affiliate-programs.json' with {type:'json'};
import policy from '../config/operating-policy.json' with {type:'json'};
import {buildPublisherReadiness} from '../src/lib/publisher-readiness.mjs';

const inputs=(extra={})=>({policy,products,affiliateCandidates,...extra});
test('publisher readiness never implies a verified identity, audience, approval or revenue',()=>{
 const r=buildPublisherReadiness(inputs());
 assert.equal(r.status,'prelaunch-owner-evidence-required');
 assert.equal(r.applicationReady,false);
 assert.equal(r.canPublish,false);
 assert.equal(r.canActivateAffiliates,false);
 assert.equal(r.canSpend,false);
 assert.equal(r.actualTraffic,null);
 assert.equal(r.actualEarnings,null);
 assert.equal(r.programApplicationsSubmitted,0);
 assert.equal(r.programsAccepted,0);
 assert.equal(r.trackingLinksEnabled,0);
 assert.equal(r.publisherIdentityVerified,false);
 assert.equal(r.audienceVerified,false);
 assert.equal(r.editorialClaimsApproved,0);
 assert.ok(r.ownerGates.length>=9);
 assert.ok(r.ownerGates.every(g=>g.actor==='owner'&&g.status==='unverified'&&g.sensitiveValuesStored===false));
});
test('program status distinguishes source discovery from confirmed participation',()=>{
 const r=buildPublisherReadiness(inputs());
 assert.equal(r.programCandidates.length,6);
 assert.deepEqual(r.programCandidates.map(x=>x.productId).sort(),[...products.map(x=>x.id)].sort());
 assert.equal(r.programCandidates.filter(x=>x.sourceStatus==='official-program-candidate').length,5);
 assert.equal(r.programCandidates.filter(x=>x.sourceStatus==='official-program-unconfirmed').length,1);
 assert.ok(r.programCandidates.every(x=>x.applicationStatus==='not-applied'&&x.approved===false&&x.affiliateLinkActive===false));
});
test('owner gates include contact, publisher channel, editorial, legal and truthful audience proof',()=>{
 const keys=new Set(buildPublisherReadiness(inputs()).ownerGates.map(x=>x.id));
 for(const k of ['publisher-identity','contact-channel','jurisdiction','publisher-channel','commercial-hosting-review','editorial-signoff','legal-privacy-review','authentic-audience-proof','affiliate-application-consent','tax-payout-kyc','production-release']){
  assert.ok(keys.has(k),k);
 }
});
test('does not accept changed spend, launch, or affiliate flags as proof',()=>{
 for(const [key,value] of Object.entries({monthlyBudgetINR:100,delegatedSpendINR:1,commercialHostingApproved:true,productionLaunchApproved:true,affiliateActivationApproved:true,paidServicesApproved:true})){
  assert.throws(()=>buildPublisherReadiness(inputs({policy:{...policy,[key]:value}})),/budget|policy|authorization/i,key);
 }
});
test('refuses forged catalog product approvals and tracked links',()=>{
 assert.throws(()=>buildPublisherReadiness(inputs({products:[{...products[0],verified:true},...products.slice(1)]})),/product|verified|approved/i);
 assert.throws(()=>buildPublisherReadiness(inputs({products:[{...products[0],affiliateUrl:'https://example.com/?ref=1'},...products.slice(1)]})),/affiliate|link/i);
});
test('refuses fabricated affiliate program acceptance and incomplete catalogs',()=>{
 assert.throws(()=>buildPublisherReadiness(inputs({affiliateCandidates:[{...affiliateCandidates[0],acceptedByProgram:true},...affiliateCandidates.slice(1)]})),/program|approval|candidate|accepted/i);
 assert.throws(()=>buildPublisherReadiness(inputs({affiliateCandidates:affiliateCandidates.slice(1)})),/missing.*candidate/i);
});
test('report is deterministic regardless of input order and never modifies sources',()=>{
 const data=structuredClone(inputs());
 const prior=structuredClone(data);
 const r=buildPublisherReadiness(data);
 assert.deepEqual(data,prior);
 assert.deepEqual(r,buildPublisherReadiness(inputs({products:[...products].reverse(),affiliateCandidates:[...affiliateCandidates].reverse()})));
 assert.deepEqual(r.programCandidates.map(p=>p.productId),[...r.programCandidates.map(p=>p.productId)].sort());
});
test('no externally asserted partner approval, revenue, contacts or secrets in output',()=>{
 const serialized=JSON.stringify(buildPublisherReadiness(inputs()));
 assert.doesNotMatch(serialized,/"(email|password|token|taxId|bankAccount|commissionEarned|contactName)"\s*:/i);
 assert.doesNotMatch(serialized,/"applicationReady"\s*:\s*true/);
 assert.doesNotMatch(serialized,/"approved"\s*:\s*true/);
});
