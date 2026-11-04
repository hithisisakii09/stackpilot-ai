import test from 'node:test';
import assert from 'node:assert/strict';
import {compareSubscriptionCosts,formatMinorUnits,plainTextCostReport} from '../src/lib/cost-comparison.mjs';

const a=()=>({flatMonthly:'10.10',seatMonthly:'2.50',seats:'3',extrasMonthly:'4.00',oneTimeFee:'50.00'});
const b=()=>({flatMonthly:'15',seatMonthly:'1',seats:'3',extrasMonthly:'5',oneTimeFee:'0'});
const request=(overrides={})=>({currency:'INR',months:12,optionA:a(),optionB:b(),...overrides});
test('uses integer minor units for exact recurring and setup costs',()=>{
 const r=compareSubscriptionCosts(request());
 assert.equal(r.currency,'INR');
 assert.equal(r.months,12);
 assert.equal(r.optionA.recurringMonthlyMinor,2160);
 assert.equal(r.optionA.totalMinor,30920);
 assert.equal(r.optionB.recurringMonthlyMinor,2300);
 assert.equal(r.optionB.totalMinor,27600);
 assert.equal(r.differenceMinor,3320);
 assert.equal(r.lowerCost,'B');
 assert.deepEqual(r.formula,'(monthly base + price per seat × seats + other monthly costs) × months + one-time costs');
});
test('equal totals produce a neutral tie, not a recommendation',()=>{
 const r=compareSubscriptionCosts(request({optionB:a()}));
 assert.equal(r.lowerCost,'tie');
 assert.equal(r.differenceMinor,0);
});
test('percentage-free integer cents: 0.10 + 0.20 = exactly 0.30',()=>{
 const zero=()=>({flatMonthly:'0',seatMonthly:'0',seats:'1',extrasMonthly:'0',oneTimeFee:'0'});
 const x=compareSubscriptionCosts(request({months:1,optionA:{...zero(),flatMonthly:'0.10',extrasMonthly:'0.20'},optionB:zero()}));
 assert.equal(x.optionA.totalMinor,30);
 assert.equal(x.differenceMinor,30);
 assert.equal(x.lowerCost,'B');
});
test('accepts zero costs and fixed periods while retaining both inputs intact',()=>{
 const data=request({months:60,optionB:{...a(),flatMonthly:'0.00'}});
 const original=structuredClone(data);
 const r=compareSubscriptionCosts(data);
 assert.equal(r.months,60);
 assert.deepEqual(data,original);
});
test('rejects invalid money, negatives, exponents, commas and overprecision',()=>{
 for (const invalid of ['', '-1', 'NaN','Infinity','1e4','1,000','12.345',' 5 ','1000000.01', '1.']) {
   assert.throws(()=>compareSubscriptionCosts(request({optionA:{...a(),flatMonthly:invalid}})),/amount|money|cost|format|range/i,invalid);
 }
});
test('rejects malformed seats and horizon',()=>{
 for(const seats of [0,-1,1001,1.5,'2.5','abc','1e2',null]){
  assert.throws(()=>compareSubscriptionCosts(request({optionA:{...a(),seats}})),/seat/i, String(seats));
 }
 for(const months of [0,61,-3,2.5,'abc','1e2',null]){
  assert.throws(()=>compareSubscriptionCosts(request({months})),/month|horizon/i,String(months));
 }
});
test('same currency is required and no exchange conversion takes place',()=>{
 for(const currency of ['JPY','INR/USD','usd',null]){
  assert.throws(()=>compareSubscriptionCosts(request({currency})),/currency/i,String(currency));
 }
 for(const currency of ['INR','USD','EUR','GBP']){
  assert.equal(compareSubscriptionCosts(request({currency})).currency,currency);
 }
});
test('strict keys and valid option object required',()=>{
 assert.throws(()=>compareSubscriptionCosts(request({optionA:null})),/option|scenario/i);
 assert.throws(()=>compareSubscriptionCosts(request({optionA:{...a(),affiliateUrl:'https://x.example'}})),/field|option|scenario/i);
 assert.throws(()=>compareSubscriptionCosts({...request(),affiliateApproved:true}),/field|input/i);
});
test('handles maximum inputs without unsafe arithmetic or rounding',()=>{
 const big=()=>({flatMonthly:'1000000',seatMonthly:'1000000',seats:1000,extrasMonthly:'1000000',oneTimeFee:'1000000'});
 const r=compareSubscriptionCosts(request({months:60,optionA:big(),optionB:big()}));
 assert.ok(Number.isSafeInteger(r.optionA.totalMinor));
 assert.equal(r.differenceMinor,0);
});
test('formats as unconverted same-currency decimal and no unverified claim',()=>{
 assert.equal(formatMinorUnits(30920,'INR'),'INR 309.20');
 assert.equal(formatMinorUnits(30,'USD'),'USD 0.30');
 assert.throws(()=>formatMinorUnits(-1,'INR'),/amount|minor/i);
 const report=plainTextCostReport(compareSubscriptionCosts(request()));
 assert.match(report,/INR 309.20/);
 assert.match(report,/INR 276.00/);
 assert.match(report,/Option B has the lower entered-cost estimate/);
 assert.match(report,/not vendor-verified pricing/i);
 assert.match(report,/not include taxes/i);
 assert.doesNotMatch(report,/hubspot|semrush|pipedrive|affiliate|commission|https?:\/\//i);
});
