import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildProductionReadinessReport} from '../src/lib/production-readiness.mjs';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const policy=read('../config/operating-policy.json');
const products=read('../src/data/products.json');
const ledger=read('../src/data/comparison-evidence.json');

test('production report remains NO-GO with all 36 comparison claims unapproved',()=>{
 const report=buildProductionReadinessReport({policy,products,ledger});
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
 assert.throws(()=>buildProductionReadinessReport({policy:{...policy,productionLaunchApproved:true},products,ledger}),/policy|approval|restrictive/i);
 assert.throws(()=>buildProductionReadinessReport({policy,products,ledger:ledger.map((r,i)=>i===0?{...r,approved:true}:r)}),/unapproved/i);
 assert.throws(()=>buildProductionReadinessReport({policy,products,ledger:ledger.slice(1)}),/incomplete/i);
});
