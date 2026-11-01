import test from 'node:test';
import assert from 'node:assert/strict';
import {auditCrmSeats,formatSeatAuditReport} from '../src/lib/crm-seat-audit.mjs';
const sample=(overrides={})=>({
 billedSeats:'8',occupiedPaidSeats:'5',activeUsers:'5',
 invitedUsers:'0',deactivatedUsers:'1',accountModelConfirmed:false,
 roleRequirementsConfirmed:false,billingChangeDateConfirmed:false,...overrides
});
test('separates billed capacity from occupied seats and unknown billing impact',()=>{
 const r=auditCrmSeats(sample());
 assert.equal(r.vacantPaidSeats,3);
 assert.equal(r.utilizationPercent,'62.50%');
 assert.equal(r.status,'INCOMPLETE');
 assert.equal(r.billingImpact,'UNKNOWN');
 assert.equal(r.refundEligible,null);
});
test('deactivation does not imply billed seats were cancelled',()=>{
 const r=auditCrmSeats(sample({deactivatedUsers:'4'}));
 assert.equal(r.vacantPaidSeats,3);
 assert.match(formatSeatAuditReport(r),/deactivat.*does not prove.*cancel/i);
});
test('free or view-only users can outnumber paid-seat occupancy',()=>{
 const r=auditCrmSeats(sample({activeUsers:'25',invitedUsers:'3'}));
 assert.equal(r.vacantPaidSeats,3);
 assert.equal(r.utilizationPercent,'62.50%');
});
test('zero billed capacity is N/A and incomplete',()=>{
 const r=auditCrmSeats(sample({billedSeats:'0',occupiedPaidSeats:'0',activeUsers:'0'}));
 assert.equal(r.utilizationPercent,'N/A');
 assert.equal(r.vacantPaidSeats,0);
 assert.equal(r.status,'INCOMPLETE');
});
test('confirmed checks mean human review, never product or billing approval',()=>{
 const r=auditCrmSeats(sample({accountModelConfirmed:true,roleRequirementsConfirmed:true,billingChangeDateConfirmed:true}));
 assert.equal(r.status,'READY_FOR_HUMAN_REVIEW');
 assert.equal(r.refundEligible,null);
 assert.match(formatSeatAuditReport(r),/not a vendor quote or refund entitlement/i);
});
test('each unconfirmed account check keeps the result incomplete',()=>{
 for(const key of ['accountModelConfirmed','roleRequirementsConfirmed','billingChangeDateConfirmed']){
  const values={accountModelConfirmed:true,roleRequirementsConfirmed:true,billingChangeDateConfirmed:true};
  values[key]=false;
  assert.equal(auditCrmSeats(sample(values)).status,'INCOMPLETE');
 }
});
test('occupied paid seats cannot exceed billed capacity',()=>{
 assert.throws(()=>auditCrmSeats(sample({occupiedPaidSeats:'9'})),/occupied.*billed/i);
});
test('strict integer fields reject invalid and unsafe counts',()=>{
 for(const v of ['', '-1','1.5','01','1e3','10001',' 2 ','2,000',null,2.5])
  assert.throws(()=>auditCrmSeats(sample({billedSeats:v})),/billed|count|integer|range/i);
});
test('strict schema blocks extra fields and non-boolean confirmations',()=>{
 assert.throws(()=>auditCrmSeats({...sample(),vendorPrice:'100'}),/field/i);
 const missing=sample();delete missing.activeUsers;
 assert.throws(()=>auditCrmSeats(missing),/field/i);
 assert.throws(()=>auditCrmSeats(sample({accountModelConfirmed:'true'})),/boolean|confirm/i);
});
test('report is neutral, private and deterministic; no input mutation',()=>{
 const request=sample();const copy=structuredClone(request);
 const report=formatSeatAuditReport(auditCrmSeats(request));
 assert.deepEqual(request,copy);
 assert.match(report,/billed seats: 8/i);
 assert.match(report,/62\.50%/);
 assert.match(report,/status: INCOMPLETE/i);
 assert.match(report,/UNKNOWN/);
 assert.doesNotMatch(report,/https?:\/\/|commission|affiliate|hubspot|pipedrive|guaranteed saving/i);
});
