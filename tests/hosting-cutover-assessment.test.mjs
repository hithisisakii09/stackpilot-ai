import test from 'node:test';
import assert from 'node:assert/strict';
import {
 assessHostingCutover,formatHostingCutoverReport,formatHostingCutoverCsv
} from '../src/lib/hosting-cutover-assessment.mjs';

const sample=(changes={})=>({
 dnsEmail:'not-assessed',backupRestore:'not-assessed',tlsDependencies:'not-assessed',
 rollbackAuthority:'not-assessed',retentionBilling:'not-assessed',...changes
});
const allPass=()=>Object.fromEntries(Object.keys(sample()).map(k=>[k,'pass']));
test('all unknown gates remain NO_GO and explicitly unverified',()=>{
 const r=assessHostingCutover(sample());
 assert.equal(r.status,'NO_GO');
 assert.equal(r.notAssessed,5);
 assert.equal(r.failed,0);
 assert.equal(r.passed,0);
 assert.equal(r.blockers.length,5);
 assert.equal(r.launchAuthorized,false);
 assert.equal(r.independentlyVerified,false);
 assert.equal(r.dataSource,'user-entered-only');
});
test('any failed gate blocks cutover readiness even if other gates are marked pass',()=>{
 const r=assessHostingCutover({...allPass(),backupRestore:'fail'});
 assert.equal(r.status,'NO_GO');
 assert.equal(r.failed,1);
 assert.equal(r.passed,4);
 assert.deepEqual(r.blockers,['backupRestore']);
 assert.match(formatHostingCutoverReport(r),/NO_GO/);
 assert.match(formatHostingCutoverReport(r),/Backup restore/i);
});
test('any not-assessed gate stays NO_GO, even if the others pass',()=>{
 const r=assessHostingCutover({...allPass(),dnsEmail:'not-assessed'});
 assert.equal(r.status,'NO_GO');
 assert.equal(r.notAssessed,1);
 assert.deepEqual(r.blockers,['dnsEmail']);
});
test('five self-attested passes mean only READY_FOR_HUMAN_REVIEW, not GO approval',()=>{
 const r=assessHostingCutover(allPass());
 assert.equal(r.status,'READY_FOR_HUMAN_REVIEW');
 assert.equal(r.passed,5);
 assert.equal(r.blockers.length,0);
 assert.equal(r.launchAuthorized,false);
 assert.equal(r.independentlyVerified,false);
 assert.match(formatHostingCutoverReport(r),/human review/i);
 assert.match(formatHostingCutoverReport(r),/not authoriz/i);
});
test('schema is exact and allowed choices cannot be overridden with a GO field',()=>{
 for(const value of ['GO','approved','PASS','yes',null,true,'','passed']){
  assert.throws(()=>assessHostingCutover(sample({dnsEmail:value})),/invalid|gate|status/i);
 }
 assert.throws(()=>assessHostingCutover({...sample(),approval:true}),/invalid|field/i);
 const missing=sample();delete missing.rollbackAuthority;
 assert.throws(()=>assessHostingCutover(missing),/invalid|field/i);
 for(const bad of [null,undefined,[],42,'ready']){
  assert.throws(()=>assessHostingCutover(bad),/invalid|field/i);
 }
});
test('source data is never mutated or elevated to independent evidence',()=>{
 const input=sample({backupRestore:'pass',retentionBilling:'fail'});
 const saved=structuredClone(input);
 const r=assessHostingCutover(input);
 assert.deepEqual(input,saved);
 assert.equal(r.failed,1);
 assert.equal(r.notAssessed,3);
 assert.equal(r.passed,1);
 assert.equal(r.independentlyVerified,false);
 assert.equal(r.launchAuthorized,false);
});
test('private text report enumerates all five gates and explicit NO_GO handling',()=>{
 const r=assessHostingCutover(sample({backupRestore:'fail'}));
 const report=formatHostingCutoverReport(r);
 for(const heading of ['DNS and email','Backup restore','TLS','Rollback','retention','billing','NO_GO','unverified']){
  assert.match(report,new RegExp(heading,'i'),heading);
 }
 assert.doesNotMatch(report,/https?:\/\/|Semrush|HubSpot|affiliate|commission|approved for production/i);
});
test('CSV is fixed, offline, quoted, stable, and does not contain unsafe formulas',()=>{
 const result=assessHostingCutover(allPass());
 const csv=formatHostingCutoverCsv(result);
 assert.equal(csv,formatHostingCutoverCsv(result));
 assert.match(csv,/^gate,status,evidence_status\r\n/);
 assert.match(csv,/"DNS and email inventory","pass","UNVERIFIED"/);
 assert.match(csv,/"Backup restore","pass","UNVERIFIED"/);
 assert.match(csv,/"overall_readiness","READY_FOR_HUMAN_REVIEW","UNVERIFIED"/);
 assert.match(csv,/"launch_authorized","false","UNVERIFIED"/);
 assert.ok(csv.endsWith('\r\n'));
 assert.equal(csv.split('\r\n').filter(Boolean).length,8);
 assert.doesNotMatch(csv,/https?:\/\/|@SUM|=HYPERLINK|commission|guaranteed|GO,"APPROVED"/i);
});
test('forged model results are rejected by both report formatters',()=>{
 const r=assessHostingCutover(allPass());
 for(const fake of [
   {...r,status:'GO'},
   {...r,status:'NO_GO'},
   {...r,launchAuthorized:true},
   {...r,independentlyVerified:true},
   {...r,passed:3},
   {...r,blockers:['dnsEmail']},
   {...r,externalEvidence:'approved'},
   {...r,dnsEmail:'fail'},
   null
 ]){
  assert.throws(()=>formatHostingCutoverReport(fake),/invalid|unverified|report|gate/i);
  assert.throws(()=>formatHostingCutoverCsv(fake),/invalid|unverified|report|gate/i);
 }
});
