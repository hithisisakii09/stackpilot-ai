import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const report=file=>JSON.parse(execFileSync(process.execPath,[file,'--json'],{encoding:'utf8'}));

test('publisher CLI lists only owner evidence gates and unapplied vendor programs',()=>{
 const x=report('scripts/publisher-readiness-report.mjs');
 assert.equal(x.status,'prelaunch-owner-evidence-required');
 assert.equal(x.ownerGates.length,11);
 assert.equal(x.programCandidates.length,6);
 assert.equal(x.applicationReady,false);
 assert.equal(x.publisherIdentityVerified,false);
 assert.equal(x.actualTraffic,null);
 assert.equal(x.actualEarnings,null);
 assert.ok(x.ownerGates.every(g=>g.actor==='owner'&&g.status==='unverified'));
 assert.ok(x.programCandidates.every(p=>p.applicationStatus==='not-applied'&&!p.approved));
});
test('ops report includes truthful non-sensitive publisher readiness summary',()=>{
 const x=report('scripts/ops-report.mjs');
 assert.equal(x.publisherReadiness.applicationReady,false);
 assert.equal(x.publisherReadiness.ownerGatesOutstanding,11);
 assert.equal(x.publisherReadiness.affiliateProgramsApplied,0);
 assert.equal(x.publisherReadiness.affiliateProgramsAccepted,0);
 assert.equal(x.publisherReadiness.actualTraffic,null);
 assert.equal(x.publisherReadiness.actualEarnings,null);
 assert.equal(x.canPublish,false);
 assert.equal(x.canMonetize,false);
 assert.equal(x.canSpend,false);
});
test('operating policy and published catalog cannot contain active affiliate links or approval',()=>{
 const policy=JSON.parse(readFileSync('config/operating-policy.json','utf8'));
 const products=JSON.parse(readFileSync('src/data/products.json','utf8'));
 assert.equal(policy.productionLaunchApproved,true);
 assert.equal(policy.affiliateActivationApproved,false);
 assert.equal(policy.monthlyBudgetINR,0);
 assert.equal(policy.delegatedSpendINR,0);
 assert.ok(products.every(p=>p.affiliateUrl===null&&p.verified===false));
});
