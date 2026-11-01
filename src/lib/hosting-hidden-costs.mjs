/**
 * Vendor-neutral hosting cost planning using only user-entered figures.
 * Never validates provider quotes, commits purchases, or contacts providers.
 */
import {formatMinorUnits} from './cost-comparison.mjs';
const moneyFields=['baseMonthly','backupMonthly','bandwidthMonthly','supportMonthly',
 'otherMonthly','oldHostingMonthly','migrationOnce','cancellationOnce'];
const fields=['currency','months','overlapMonths',...moneyFields];
const currencies=new Set(['INR','USD','EUR','GBP']);
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const exactly=(o,keys)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===keys.length&&keys.every(k=>own(o,k))&&
 Object.keys(o).every(k=>keys.includes(k));
function money(value,label){
 if(typeof value!=='string'||!/^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/.test(value))
  throw new Error('Invalid '+label+' money amount or range');
 const [whole,decimal='']=value.split('.');
 const cents=Number(whole)*100+Number(decimal.padEnd(2,'0'));
 if(!Number.isSafeInteger(cents)||cents>100000000)
  throw new Error('Invalid '+label+' amount range');
 return cents;
}
function whole(value,label,min,max){
 if(!((typeof value==='number'&&Number.isSafeInteger(value))||
   (typeof value==='string'&&/^(?:0|[1-9]\d*)$/.test(value))))
  throw new Error('Invalid '+label+' integer');
 const n=Number(value);
 if(!Number.isSafeInteger(n)||n<min||n>max)
  throw new Error('Invalid '+label+' integer range');
 return n;
}
export function calculateHostingHiddenCosts(input){
 if(!exactly(input,fields))throw new Error('Invalid hosting estimate field set');
 if(!currencies.has(input.currency))throw new Error('Invalid hosting currency');
 const months=whole(input.months,'month horizon',1,60);
 const overlapMonths=whole(input.overlapMonths,'overlap months',0,months);
 const minor=Object.fromEntries(moneyFields.map(key=>[key+'Minor',money(input[key],key)]));
 const monthlyExtrasMinor=minor.backupMonthlyMinor+minor.bandwidthMonthlyMinor+
  minor.supportMonthlyMinor+minor.otherMonthlyMinor;
 const monthlyNewHostMinor=minor.baseMonthlyMinor+monthlyExtrasMinor;
 const baselineMinor=minor.baseMonthlyMinor*months;
 const recurringExtrasMinor=monthlyExtrasMinor*months;
 const overlapMinor=minor.oldHostingMonthlyMinor*overlapMonths;
 const oneTimeMinor=minor.migrationOnceMinor+minor.cancellationOnceMinor;
 const additionalMinor=recurringExtrasMinor+overlapMinor+oneTimeMinor;
 const totalMinor=baselineMinor+additionalMinor;
 if([monthlyNewHostMinor,baselineMinor,recurringExtrasMinor,overlapMinor,oneTimeMinor,
  additionalMinor,totalMinor].some(v=>!Number.isSafeInteger(v)||v<0))
  throw new Error('Invalid hosting estimate total amount');
 return {
  input:{currency:input.currency,months,overlapMonths,...Object.fromEntries(
   moneyFields.map(k=>[k,input[k]])
  )},
  currency:input.currency,months,overlapMonths,...minor,
  monthlyExtrasMinor,monthlyNewHostMinor,baselineMinor,recurringExtrasMinor,
  overlapMinor,oneTimeMinor,additionalMinor,totalMinor,
  dataSource:'user-entered-only',independentlyVerified:false,
  providerQuoteVerified:false,purchaseAuthorized:false
 };
}
function validateResult(result){
 const expected=calculateHostingHiddenCosts(result?.input);
 if(!exactly(result,Object.keys(expected))||!exactly(result.input,fields))
  throw new Error('Invalid hosting estimate result fields');
 for(const key of Object.keys(expected)){
  if(key==='input'){
   for(const field of fields)if(result.input[field]!==expected.input[field])
    throw new Error('Invalid hosting estimate result input');
  }else if(result[key]!==expected[key])throw new Error('Invalid hosting estimate result calculation');
 }
 return expected;
}
const decimalCents=minor=>Math.floor(minor/100)+'.'+String(minor%100).padStart(2,'0');
export function formatHostingHiddenCostReport(result){
 const r=validateResult(result),money=n=>formatMinorUnits(n,r.currency);
 return [
  'StackPilot AI — user-entered hosting hidden-cost worksheet',
  'Currency: '+r.currency+' (no exchange-rate conversion)',
  'Time horizon: '+r.months+' month(s)',
  'Old/new hosting overlap: '+r.overlapMonths+' month(s)',
  'New host base monthly cost: '+money(r.baseMonthlyMinor),
  'Backup monthly allowance: '+money(r.backupMonthlyMinor),
  'Bandwidth/egress monthly allowance: '+money(r.bandwidthMonthlyMinor),
  'Support monthly allowance: '+money(r.supportMonthlyMinor),
  'Other monthly allowance: '+money(r.otherMonthlyMinor),
  'New host monthly recurring: '+money(r.monthlyNewHostMinor),
  'Base-only headline over horizon: '+money(r.baselineMinor),
  'Additional monthly costs across horizon: '+money(r.recurringExtrasMinor),
  'Existing host during overlap: '+money(r.overlapMinor),
  'One-time migration and cancellation: '+money(r.oneTimeMinor),
  'Additional costs beyond base-only headline: '+money(r.additionalMinor),
  'Estimated total over horizon: '+money(r.totalMinor),
  'Source: user-entered-only; not a verified provider quote or pricing promise.',
  'A lower estimated amount is not a recommendation and does not imply product fit.',
  'These amounts exclude unentered taxes, currency exchange, usage variance, contract terms and price changes.',
  'A zero entry is your own estimate, not evidence that a provider includes the service for free.',
  'Verify current provider-specific plan, region, overage, backup and cancellation terms independently.',
  'This worksheet cannot authorize purchases, production migration, paid add-ons or a hosting cutover.'
 ].join('\n');
}
export function formatHostingHiddenCostCsv(result){
 const r=validateResult(result);
 const rows=[
  ['currency',r.currency],['months',r.months],['overlap_months',r.overlapMonths],
  ...moneyFields.map(k=>[k,decimalCents(r[k+'Minor'])]),
  ['monthly_new_host',decimalCents(r.monthlyNewHostMinor)],
  ['baseline',decimalCents(r.baselineMinor)],
  ['recurring_extras',decimalCents(r.recurringExtrasMinor)],
  ['old_host_overlap',decimalCents(r.overlapMinor)],
  ['one_time',decimalCents(r.oneTimeMinor)],
  ['additional',decimalCents(r.additionalMinor)],
  ['total',decimalCents(r.totalMinor)],
  ['provider_quote_verified','false'],['purchase_authorized','false']
 ];
 const safe=value=>'"'+String(value).replaceAll('"','""')+'"';
 return ['metric,value,evidence_status',...rows.map(([k,v])=>[k,v,'UNVERIFIED'].map(safe).join(','))].join('\r\n')+'\r\n';
}
