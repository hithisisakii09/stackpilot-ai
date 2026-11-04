import test from 'node:test';
import assert from 'node:assert/strict';
import {
 CRM_MIGRATION_GATES,assessCrmMigrationReadiness,
 formatCrmMigrationReadinessReport,formatCrmMigrationReadinessCsv
} from '../src/lib/crm-migration-readiness.mjs';
const fields=['exportPermission','mappingValidation','associationOwnership','integrationChecks','backupRestore'];
const good=(changes={})=>({
 sourceRecordCount:'1200',targetRecordCount:'1200',
 cutoverWindowMinutes:'90',measuredRollbackMinutes:'30',
 exportPermission:'pass',mappingValidation:'pass',associationOwnership:'pass',
 integrationChecks:'pass',backupRestore:'pass',...changes
});
test('approved gate catalog is exact and five distinct pre-migration checks',()=>{
 assert.deepEqual(CRM_MIGRATION_GATES.map(g=>g.id),fields);
 assert.ok(CRM_MIGRATION_GATES.every(g=>g.label&&g.hint));
});
test('matching aggregate counts and rollback duration still only reach human review',()=>{
 const input=good();
 const copy=structuredClone(input);
 const result=assessCrmMigrationReadiness(input);
 assert.equal(result.status,'READY_FOR_HUMAN_REVIEW');
 assert.equal(result.recordDiscrepancy,0);
 assert.equal(result.rollbackFitsWindow,true);
 assert.deepEqual(result.blockers,[]);
 assert.equal(result.independentlyVerified,false);
 assert.equal(result.migrationAuthorized,false);
 assert.equal(result.verifiedVendorCompatibility,false);
 assert.equal(result.dataSource,'user-entered-only');
 assert.deepEqual(result.input,input);
 assert.notEqual(result.input,input);
 assert.deepEqual(input,copy);
 assert.match(formatCrmMigrationReadinessReport(result),/not authorization/i);
});
test('aggregate mismatch is NO_GO despite every self-reported evidence pass',()=>{
 const result=assessCrmMigrationReadiness(good({targetRecordCount:'1193'}));
 assert.equal(result.recordDiscrepancy,7);
 assert.equal(result.status,'NO_GO');
 assert.deepEqual(result.blockers,['recordCountsMismatch']);
 assert.match(formatCrmMigrationReadinessReport(result),/7/);
});
test('rollback exceeding user-planned window blocks readiness independently',()=>{
 const result=assessCrmMigrationReadiness(good({cutoverWindowMinutes:'60',measuredRollbackMinutes:'61'}));
 assert.equal(result.rollbackFitsWindow,false);
 assert.equal(result.status,'NO_GO');
 assert.deepEqual(result.blockers,['rollbackExceedsWindow']);
});
test('unassessed or failed evidence always blocks readiness and counts remain descriptive',()=>{
 for(const key of fields)for(const status of ['not-assessed','fail']){
  const result=assessCrmMigrationReadiness(good({[key]:status}));
  assert.equal(result.status,'NO_GO');
  assert.ok(result.blockers.includes(key));
  assert.equal(result.migrationAuthorized,false);
 }
});
test('all selectors unassessed is NO_GO even if counts and rollback match',()=>{
 const r=assessCrmMigrationReadiness(good(Object.fromEntries(fields.map(x=>[x,'not-assessed']))));
 assert.equal(r.status,'NO_GO');
 assert.equal(r.blockers.length,5);
});
test('strict no-extra-fields schema and ranges reject exponent, decimals, negative, empty, 0, huge, whitespace',()=>{
 for(const key of ['sourceRecordCount','targetRecordCount','cutoverWindowMinutes','measuredRollbackMinutes']){
  for(const invalid of ['',0,'0','-1',' 1 ','1e3','1.5','01','99999999',null,{},'NaN']){
   assert.throws(()=>assessCrmMigrationReadiness(good({[key]:invalid})),/invalid|range|integer|field|count|minute/i,key+' '+String(invalid));
  }
 }
 assert.throws(()=>assessCrmMigrationReadiness(good({cutoverWindowMinutes:'1441'})),/invalid|range/i);
 assert.doesNotThrow(()=>assessCrmMigrationReadiness(good({cutoverWindowMinutes:'1440',measuredRollbackMinutes:'1440'})));
 for(const invalid of [null,undefined,[],{},'bad',1]){
  assert.throws(()=>assessCrmMigrationReadiness(invalid),/invalid|field/i);
 }
 assert.throws(()=>assessCrmMigrationReadiness({...good(),migrationAuthorized:true}),/invalid|field/i);
 const removed=good();delete removed.backupRestore;
 assert.throws(()=>assessCrmMigrationReadiness(removed),/invalid|field/i);
 assert.throws(()=>assessCrmMigrationReadiness(good({exportPermission:'GO'})),/invalid|status/i);
});
test('stable text report states human review and data integrity cannot be inferred from count match',()=>{
 const content=formatCrmMigrationReadinessReport(assessCrmMigrationReadiness(good()));
 for(const phrase of ['READY_FOR_HUMAN_REVIEW','user-entered','no evidence was independently verified','not authorization','counts alone','privacy','backup']){
  assert.match(content,new RegExp(phrase,'i'),phrase);
 }
 assert.doesNotMatch(content,/https?:\/\/|@SUM|=HYPERLINK|Commission|approved for production/i);
});
test('fixed-schema CSV offline export labels all five statuses and disclaims verification',()=>{
 const csv=formatCrmMigrationReadinessCsv(assessCrmMigrationReadiness(good()));
 assert.match(csv,/^check,value,evidence_status\r\n/);
 assert.match(csv,/"source_record_count","1200","SELF_REPORTED"/);
 assert.match(csv,/"record_discrepancy","0","SELF_REPORTED"/);
 assert.match(csv,/"overall_readiness","READY_FOR_HUMAN_REVIEW","SELF_REPORTED"/);
 assert.match(csv,/"migration_authorized","false","SELF_REPORTED"/);
 assert.ok(csv.endsWith('\r\n'));
 assert.doesNotMatch(csv,/https?:\/\/|@SUM|=HYPERLINK|affiliate|commission/i);
});
test('forged result, formulas, flags, changed snapshot and extra fields rejected by both exporters',()=>{
 const r=assessCrmMigrationReadiness(good());
 const cases=[
  {...r,status:'GO'}, {...r,status:'NO_GO'}, {...r,migrationAuthorized:true},
  {...r,independentlyVerified:true}, {...r,verifiedVendorCompatibility:true},
  {...r,recordDiscrepancy:8}, {...r,rollbackFitsWindow:false},
  {...r,blockers:['backupRestore']},{...r,dataSource:'vendor-prices'},
  {...r,ownerApproval:true},{...r,input:{...r.input,sourceRecordCount:'900'}},
  {...r,input:{...r.input,notes:'=HYPERLINK("bad")'}},
  {...r,input:{...r.input,exportPermission:'fail'}},null
 ];
 for(const fake of cases){
  assert.throws(()=>formatCrmMigrationReadinessReport(fake),/invalid|integrity|report|assessment/i);
  assert.throws(()=>formatCrmMigrationReadinessCsv(fake),/invalid|integrity|report|assessment/i);
 }
});
test('input is copied and cannot be altered by a later form edit',()=>{
 const input=good();const result=assessCrmMigrationReadiness(input);
 input.targetRecordCount='1';input.backupRestore='fail';
 assert.equal(result.input.targetRecordCount,'1200');
 assert.equal(result.input.backupRestore,'pass');
 assert.match(formatCrmMigrationReadinessReport(result),/READY_FOR_HUMAN_REVIEW/);
});
