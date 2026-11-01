import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateHostingHiddenCosts,formatHostingHiddenCostReport,formatHostingHiddenCostCsv} from '../src/lib/hosting-hidden-costs.mjs';

const fields=()=>({
 currency:'INR',months:12,overlapMonths:2,
 baseMonthly:'100.10',backupMonthly:'5.25',bandwidthMonthly:'10',
 supportMonthly:'20',otherMonthly:'4.65',oldHostingMonthly:'70',
 migrationOnce:'240.50',cancellationOnce:'15.25'
});
test('monthly hosting breakdown is separate from one-off and time-limited overlap costs',()=>{
 const r=calculateHostingHiddenCosts(fields());
 assert.equal(r.currency,'INR');
 assert.equal(r.months,12);
 assert.equal(r.overlapMonths,2);
 assert.equal(r.monthlyNewHostMinor,14000);
 assert.equal(r.baselineMinor,120120);
 assert.equal(r.recurringExtrasMinor,47880);
 assert.equal(r.overlapMinor,14000);
 assert.equal(r.oneTimeMinor,25575);
 assert.equal(r.additionalMinor,87455);
 assert.equal(r.totalMinor,207575);
 assert.equal(r.dataSource,'user-entered-only');
 assert.equal(r.independentlyVerified,false);
 assert.equal(r.providerQuoteVerified,false);
 assert.equal(r.purchaseAuthorized,false);
});
test('zero base and fully free quote are allowed, no hidden zero-assumption about unknown costs',()=>{
 const zero={...fields(),baseMonthly:'0',backupMonthly:'0',bandwidthMonthly:'0',supportMonthly:'0',otherMonthly:'0',oldHostingMonthly:'0',migrationOnce:'0',cancellationOnce:'0',overlapMonths:'0',months:'1'};
 const r=calculateHostingHiddenCosts(zero);
 assert.equal(r.totalMinor,0);
 assert.equal(r.additionalMinor,0);
 assert.equal(r.providerQuoteVerified,false);
 assert.match(formatHostingHiddenCostReport(r),/user-entered/i);
 assert.match(formatHostingHiddenCostReport(r),/not.*verified/i);
});
test('overlapMonths zero ignores old-host charge; one-time costs never multiply',()=>{
 const r=calculateHostingHiddenCosts({...fields(),months:36,overlapMonths:0});
 assert.equal(r.overlapMinor,0);
 assert.equal(r.oneTimeMinor,25575);
 assert.equal(r.baselineMinor,360360);
 assert.equal(r.recurringExtrasMinor,143640);
 assert.equal(r.totalMinor,529575);
});
test('money uses integer cents including 0.10 + 0.20 exactly',()=>{
 const input={...fields(),months:1,overlapMonths:0,baseMonthly:'0.10',backupMonthly:'0.20',bandwidthMonthly:'0',supportMonthly:'0',otherMonthly:'0',oldHostingMonthly:'0',migrationOnce:'0',cancellationOnce:'0'};
 const r=calculateHostingHiddenCosts(input);
 assert.equal(r.monthlyNewHostMinor,30);
 assert.equal(r.totalMinor,30);
 assert.equal(r.additionalMinor,20);
});
test('bad money strings or unsafe numbers are rejected',()=>{
 const bad=['','-1','1e6','1,000','01','1.','1.234',' 1 ','NaN','Infinity','1000000.01',null,100,'=SUM(1,1)'];
 for(const value of bad){
  assert.throws(()=>calculateHostingHiddenCosts({...fields(),backupMonthly:value}),/invalid|money|amount|range/i,String(value));
 }
});
test('month horizon and overlap must be whole numbers and overlap cannot exceed horizon',()=>{
 for(const input of [{months:0},{months:61},{months:'1e2'},{months:'2.5'},
  {overlapMonths:'-1'},{overlapMonths:13},{overlapMonths:'1.1'},{overlapMonths:Infinity}]){
  assert.throws(()=>calculateHostingHiddenCosts({...fields(),...input}),/invalid|month|overlap/i);
 }
});
test('exact field shape, supported currency and no silent FX conversion',()=>{
 const bad={...fields()};delete bad.migrationOnce;
 assert.throws(()=>calculateHostingHiddenCosts(bad),/invalid|field/i);
 assert.throws(()=>calculateHostingHiddenCosts({...fields(),affiliateUrl:'https://example.com'}),/invalid|field/i);
 assert.throws(()=>calculateHostingHiddenCosts(null),/invalid|field/i);
 assert.throws(()=>calculateHostingHiddenCosts({...fields(),currency:'JPY'}),/currency/i);
 for(const currency of ['INR','USD','EUR','GBP'])assert.equal(calculateHostingHiddenCosts({...fields(),currency}).currency,currency);
});
test('maximum allowed amounts remain safe and input is not mutated',()=>{
 const input={...fields(),months:60,overlapMonths:60,
  baseMonthly:'1000000',backupMonthly:'1000000',bandwidthMonthly:'1000000',supportMonthly:'1000000',
  otherMonthly:'1000000',oldHostingMonthly:'1000000',migrationOnce:'1000000',cancellationOnce:'1000000'};
 const original=structuredClone(input);
 const r=calculateHostingHiddenCosts(input);
 assert.ok(Number.isSafeInteger(r.totalMinor));
 assert.deepEqual(input,original);
});
test('report explains breakdown without representing user inputs as vendor-approved rates',()=>{
 const r=calculateHostingHiddenCosts(fields());
 const report=formatHostingHiddenCostReport(r);
 for(const v of ['INR 1201.20','INR 478.80','INR 140.00','INR 255.75','INR 874.55','INR 2075.75','12','2']){
  assert.ok(report.includes(v),'Missing '+v);
 }
 assert.match(report,/user-entered-only|user-entered/i);
 assert.match(report,/not a verified provider quote/i);
 assert.match(report,/not.*recommendation/i);
 assert.doesNotMatch(report,/https?:\/\/|affiliate link|guaranteed savings/i);
});
test('CSV is fixed-field and marks all estimates UNVERIFIED, without formulas',()=>{
 const csv=formatHostingHiddenCostCsv(calculateHostingHiddenCosts(fields()));
 assert.match(csv,/^metric,value,evidence_status\r\n/);
 assert.match(csv,/"baseline","1201.20","UNVERIFIED"/);
 assert.match(csv,/"total","2075.75","UNVERIFIED"/);
 assert.match(csv,/"provider_quote_verified","false","UNVERIFIED"/);
 assert.match(csv,/"purchase_authorized","false","UNVERIFIED"/);
 assert.ok(csv.endsWith('\r\n'));
 assert.doesNotMatch(csv,/[=+@]\w|\bPASS\b|https?:\/\/|affiliate/i);
});
test('exports reject tampering, new fields, fabricated approval and result math edits',()=>{
 const r=calculateHostingHiddenCosts(fields());
 for(const altered of [
  {...r,totalMinor:1},
  {...r,additionalMinor:1},
  {...r,overlapMinor:300},
  {...r,baselineMinor:0},
  {...r,providerQuoteVerified:true},
  {...r,purchaseAuthorized:true},
  {...r,independentlyVerified:true},
  {...r,dataSource:'provider'},
  {...r,input:{...r.input,months:13}},
  {...r,extra:'approved'},
  null
 ]){
  assert.throws(()=>formatHostingHiddenCostReport(altered),/invalid|result|estimate|unverified/i);
  assert.throws(()=>formatHostingHiddenCostCsv(altered),/invalid|result|estimate|unverified/i);
 }
});
