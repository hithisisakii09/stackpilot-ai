import test from 'node:test';
import assert from 'node:assert/strict';
import {compareSubscriptionCosts,plainTextCostReport} from '../src/lib/cost-comparison.mjs';
const option=()=>({flatMonthly:'10.10',seatMonthly:'2.50',seats:'3',extrasMonthly:'4.00',oneTimeFee:'50.00'});
const other=()=>({flatMonthly:'15',seatMonthly:'1',seats:'3',extrasMonthly:'5',oneTimeFee:'0'});
const request=()=>({currency:'INR',months:12,optionA:option(),optionB:other()});
test('verified local calculation preserves exact closed user-entered input snapshot for recomputation',()=>{
 const input=request(),before=structuredClone(input);
 const result=compareSubscriptionCosts(input);
 assert.deepEqual(result.input,before);
 assert.notEqual(result.input,input);
 assert.notEqual(result.input.optionA,input.optionA);
 assert.notEqual(result.input.optionB,input.optionB);
 input.optionA.flatMonthly='900000';
 input.optionB.seats='1000';
 input.currency='USD';
 assert.deepEqual(result.input,before,'later changes to form data do not mutate a prior snapshot');
 assert.match(plainTextCostReport(result),/INR 309.20/);
});
test('valid report is unchanged by fresh integrity validation',()=>{
 const result=compareSubscriptionCosts(request());
 const prior=structuredClone(result);
 const report=plainTextCostReport(result);
 assert.match(report,/INR 276.00/);
 assert.match(report,/lower entered-cost estimate/);
 assert.match(report,/not vendor-verified pricing quotes/i);
 assert.deepEqual(result,prior);
});
test('rejects altered totals and recurring subtotals instead of exporting false savings',()=>{
 const result=compareSubscriptionCosts(request());
 const tampered=[
  {...result,optionA:{...result.optionA,totalMinor:100}},
  {...result,optionB:{...result.optionB,recurringMonthlyMinor:1}},
  {...result,optionA:{...result.optionA,seatMonthlyMinor:50}},
  {...result,optionA:{...result.optionA,seats:100}},
  {...result,optionB:{...result.optionB,oneTimeFeeMinor:12000}},
  {...result,differenceMinor:1},
  {...result,lowerCost:'A'},
  {...result,lowerCost:'tie'}
 ];
 for(const item of tampered)assert.throws(()=>plainTextCostReport(item),/invalid|result|comparison|integrity/i);
});
test('rejects stale input snapshots and changes to horizon, currency, formula',()=>{
 const result=compareSubscriptionCosts(request());
 const tampered=[
  {...result,months:24},
  {...result,currency:'USD'},
  {...result,formula:'affiliate discount guaranteed'},
  {...result,input:{...result.input,months:24}},
  {...result,input:{...result.input,currency:'USD'}},
  {...result,input:{...result.input,optionA:{...result.input.optionA,flatMonthly:'9999'}}},
  {...result,input:{...result.input,optionB:{...result.input.optionB,seats:'100'}}}
 ];
 for(const item of tampered)assert.throws(()=>plainTextCostReport(item),/invalid|result|comparison|integrity/i);
});
test('rejects forged verification, approval, source and extra object fields',()=>{
 const result=compareSubscriptionCosts(request());
 const tampered=[
  {...result,independentlyVerified:true},
  {...result,dataSource:'vendor-official-verified'},
  {...result,affiliateApproved:true},
  {...result,providerQuoteVerified:true},
  {...result,optionA:{...result.optionA,discountMinor:500}},
  {...result,input:{...result.input,affiliateUrl:'https://example.com'}},
  {...result,input:{...result.input,optionB:{...result.input.optionB,merchant:'Demo'}}}
 ];
 for(const item of tampered)assert.throws(()=>plainTextCostReport(item),/invalid|result|comparison|integrity/i);
});
test('incomplete or nonnumeric fabricated result cannot pass report validation',()=>{
 const r=compareSubscriptionCosts(request());
 const tampered=[
  null,{},Object.create(null),
  {...r,input:null},
  {...r,input:undefined},
  {...r,input:structuredClone(r.input),optionA:null},
  {...r,optionB:{...r.optionB,recurringMonthlyMinor:'2300'}},
  {...r,optionA:{...r.optionA,totalMinor:NaN}},
  {...r,optionA:{...r.optionA,totalMinor:Infinity}},
  {...r,differenceMinor:-1}
 ];
 for(const item of tampered)assert.throws(()=>plainTextCostReport(item),/invalid|result|comparison|integrity/i);
});
test('valid EUR and USD money breakdowns still work with no currency conversion',()=>{
 for(const currency of ['INR','USD','EUR','GBP']){
  const result=compareSubscriptionCosts({...request(),currency});
  assert.equal(result.input.currency,currency);
  assert.match(plainTextCostReport(result),new RegExp(currency+' 309\\.20'));
 }
});
