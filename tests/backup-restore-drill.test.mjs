import test from 'node:test';
import assert from 'node:assert/strict';
import {assessBackupRestoreDrill,formatBackupRestoreDrillReport,formatBackupRestoreDrillCsv} from '../src/lib/backup-restore-drill.mjs';

const sample=(changes={})=>({
 targetRtoMinutes:'120',observedRestoreMinutes:'75',
 targetRpoMinutes:'60',observedRecoveryPointAgeMinutes:'25',
 restoreTested:true,dataIntegrityChecked:true,...changes
});

test('self-attested observations within both limits are only ready for human review',()=>{
 const r=assessBackupRestoreDrill(sample());
 assert.equal(r.readiness,'READY_FOR_HUMAN_REVIEW');
 assert.equal(r.rtoWithinTarget,true);
 assert.equal(r.rpoWithinTarget,true);
 assert.equal(r.targetRtoMinutes,120);
 assert.equal(r.observedRestoreMinutes,75);
 assert.equal(r.independentlyVerified,false);
 assert.equal(r.cutoverAuthorized,false);
 assert.equal(r.dataSource,'user-entered-only');
});
test('observed time equal to target is within the user-entered planning threshold',()=>{
 const r=assessBackupRestoreDrill(sample({
 observedRestoreMinutes:'120',observedRecoveryPointAgeMinutes:'60'
 }));
 assert.equal(r.readiness,'READY_FOR_HUMAN_REVIEW');
 assert.equal(r.rtoWithinTarget,true);
 assert.equal(r.rpoWithinTarget,true);
});
test('exceeding either target is NO_GO even if both checkboxes are selected',()=>{
 for(const changes of [
  {observedRestoreMinutes:'121'},
  {observedRecoveryPointAgeMinutes:'61'},
  {observedRestoreMinutes:'121',observedRecoveryPointAgeMinutes:'61'}
 ]){
  const r=assessBackupRestoreDrill(sample(changes));
  assert.equal(r.readiness,'NO_GO');
  assert.equal(r.cutoverAuthorized,false);
 }
});
test('blank observation is unknown, never zero or a passing measurement',()=>{
 for(const key of ['observedRestoreMinutes','observedRecoveryPointAgeMinutes']){
  const r=assessBackupRestoreDrill(sample({[key]:''}));
  assert.equal(r.readiness,'NO_GO');
  assert.equal(r[key],null);
  assert.equal(key==='observedRestoreMinutes'?r.rtoWithinTarget:r.rpoWithinTarget,null);
 }
});
test('unchecked restore or integrity verification blocks review readiness',()=>{
 for(const key of ['restoreTested','dataIntegrityChecked']){
  const r=assessBackupRestoreDrill(sample({[key]:false}));
  assert.equal(r.readiness,'NO_GO');
  assert.equal(r.independentlyVerified,false);
 }
});
test('RPO zero is a possible user-entered goal, but not evidence of zero data loss',()=>{
 const r=assessBackupRestoreDrill(sample({targetRpoMinutes:'0',observedRecoveryPointAgeMinutes:'0'}));
 assert.equal(r.readiness,'READY_FOR_HUMAN_REVIEW');
 assert.equal(r.rpoWithinTarget,true);
 assert.match(formatBackupRestoreDrillReport(r),/not proof of zero data loss/i);
});
test('target RTO must be positive and all numeric inputs strictly bounded',()=>{
 for(const value of ['-1','01',' 12 ','12.5','1e3','1,000','1000001',Infinity,null,1.2]){
  assert.throws(()=>assessBackupRestoreDrill(sample({targetRpoMinutes:value})),/invalid|minute|count|range/i,JSON.stringify(value));
 }
 assert.throws(()=>assessBackupRestoreDrill(sample({targetRtoMinutes:'0'})),/invalid|positive|RTO/i);
 assert.throws(()=>assessBackupRestoreDrill(sample({observedRestoreMinutes:'0'})),/invalid|positive|restore/i);
});
test('exact field set and boolean types are mandatory',()=>{
 const missing=sample();delete missing.restoreTested;
 assert.throws(()=>assessBackupRestoreDrill(missing),/invalid|field/i);
 assert.throws(()=>assessBackupRestoreDrill({...sample(),provider:'Kinsta'}),/invalid|field/i);
 assert.throws(()=>assessBackupRestoreDrill(sample({restoreTested:'true'})),/invalid|boolean/i);
 assert.throws(()=>assessBackupRestoreDrill(null),/invalid|field/i);
});
test('inputs unchanged and report clarifies self-attested vs actual recovery',()=>{
 const input=sample();const copy=structuredClone(input);
 const result=assessBackupRestoreDrill(input);
 const report=formatBackupRestoreDrillReport(result);
 assert.deepEqual(input,copy);
 for(const phrase of ['RTO','RPO','75','120','60','25','READY_FOR_HUMAN_REVIEW','UNVERIFIED','not authorization']){
  assert.match(report,new RegExp(phrase,'i'));
 }
 assert.doesNotMatch(report,/https?:\/\/|guaranteed uptime|affiliate|commission|verified provider/i);
});
test('CSV is safe fixed-schema offline export with no personal data or external links',()=>{
 const r=assessBackupRestoreDrill(sample());
 const csv=formatBackupRestoreDrillCsv(r);
 assert.equal(csv,formatBackupRestoreDrillCsv(r));
 assert.match(csv,/^metric,value,evidence_status\r\n/);
 assert.match(csv,/"observed_restore_minutes","75","UNVERIFIED"/);
 assert.match(csv,/"observed_recovery_point_age_minutes","25","UNVERIFIED"/);
 assert.match(csv,/"readiness","READY_FOR_HUMAN_REVIEW","UNVERIFIED"/);
 assert.match(csv,/"cutover_authorized","false","UNVERIFIED"/);
 assert.ok(csv.endsWith('\r\n'));
 assert.doesNotMatch(csv,/https?:\/\/|=HYPERLINK|@SUM|guaranteed|approved plan/i);
});
test('reports reject tampered, independently-verified or externally attributed output',()=>{
 const r=assessBackupRestoreDrill(sample());
 for(const forged of [
  {...r,readiness:'GO'},
  {...r,readiness:'NO_GO'},
  {...r,cutoverAuthorized:true},
  {...r,independentlyVerified:true},
  {...r,rtoWithinTarget:false},
  {...r,observedRestoreMinutes:9999},
  {...r,providerValidated:true},
  {...r,dataSource:'provider'},
  null
 ]){
  assert.throws(()=>formatBackupRestoreDrillReport(forged),/invalid|unverified|result|field/i);
  assert.throws(()=>formatBackupRestoreDrillCsv(forged),/invalid|unverified|result|field/i);
 }
});
