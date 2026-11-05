import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildProductionReadinessReport} from '../src/lib/production-readiness.mjs';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const policy=read('../config/operating-policy.json');
const products=read('../src/data/products.json');
const ledger=read('../src/data/comparison-evidence.json');
const claims=read('../src/data/research-claims.json');
const revocations=read('../src/data/research-source-revocations.json');
const readyInputs={policy,products,ledger,claims,revocations,today:'2026-11-05'};

test('production report remains NO-GO with all 36 comparison claims unapproved',()=>{
 const report=buildProductionReadinessReport(readyInputs);
 assert.equal(report.status,'NO-GO');
 assert.equal(report.canPublish,false);
 assert.equal(report.canSpend,false);
 assert.equal(report.canActivateAffiliates,false);
 assert.equal(report.comparisonClaimsTotal,ledger.length);
 assert.equal(report.comparisonClaimsApproved,0);
 assert.equal(report.comparisonClaimsNeedingEvidence,ledger.length);
 assert.equal(report.remoteHostedApproval,'UNVERIFIED');
 assert.ok(report.blockers.some(x=>x.id==='editorial-evidence'));
 assert.ok(report.blockers.some(x=>x.id==='production-owner-approval'));
 assert.ok(report.blockers.some(x=>x.id==='authenticated-preview-uat'));
 assert.equal(report.blockers.every(x=>x.status==='BLOCKED'),true);
});

test('readiness report rejects tampered policy and unapproved evidence masquerading as verified',()=>{
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,policy:{...policy,productionLaunchApproved:true}}),/policy|approval|restrictive/i);
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,ledger:ledger.map((r,i)=>i===0?{...r,approved:true}:r)}),/unapproved/i);
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,ledger:ledger.slice(1)}),/incomplete/i);
});

test('production inventory shows candidate source freshness and revocation blockers',()=>{
 const report=buildProductionReadinessReport(readyInputs);
 assert.deepEqual(report.sourceRisk,{total:6,approved:0,unreviewed:6,stale:0,revoked:0});
 assert.ok(report.blockers.some(x=>x.id==='candidate-source-review'&&x.status==='BLOCKED'));
 const stale=buildProductionReadinessReport({...readyInputs,today:'2027-03-15'});
 assert.equal(stale.sourceRisk.stale,6);
 assert.equal(stale.sourceRisk.unreviewed,0);
 assert.equal(stale.status,'NO-GO');
 const item={sourceId:'hubspot-doc-claim-1',revokedOn:'2026-11-04',reason:'Vendor statement withdrawn pending documented independent review.'};
 const revoked=buildProductionReadinessReport({...readyInputs,revocations:[item]});
 assert.equal(revoked.sourceRisk.revoked,1);
 assert.equal(revoked.canPublish,false);
});

test('readiness rejects missing source inventory, invalid revocation and forged research approvals',()=>{
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,claims:undefined}),/claims|array|research/i);
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,revocations:undefined}),/revocation/i);
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,claims:claims.map((x,i)=>i===0?{...x,approved:true}:x)}),/approved/i);
});
