/**
 * Vendor-neutral, user-supplied estimates. No price feeds, affiliate data,
 * exchange rates, browser storage, or network calls. Money is integer cents.
 */
const fields=['flatMonthly','seatMonthly','seats','extrasMonthly','oneTimeFee'];
const currencies=new Set(['INR','USD','EUR','GBP']);
const maxMinor=100000000;
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);

function strictFields(input,expected,label){
 if(!input || typeof input!=='object'||Array.isArray(input) ||
  Object.keys(input).length!==expected.length ||
  expected.some(k=>!own(input,k)) ||
  Object.keys(input).some(k=>!expected.includes(k))){
  throw new Error('Invalid '+label+' field set');
 }
}
function minorUnits(value,label) {
 if(typeof value!=='string' || !/^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/.test(value)) {
  throw new Error('Invalid '+label+' money amount format or range');
 }
 const [whole,fraction='']=value.split('.');
 const minor=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(minor)||minor>maxMinor)
  throw new Error('Invalid '+label+' amount range');
 return minor;
}
function integer(value,label,min,max) {
 if(!(typeof value==='number' && Number.isSafeInteger(value)) &&
   !(typeof value==='string' && /^[1-9]\d*$/.test(value))) throw new Error('Invalid '+label);
 const n=Number(value);
 if(!Number.isSafeInteger(n)||n<min||n>max) throw new Error('Invalid '+label+' range');
 return n;
}
function scenario(data,months,label){
 strictFields(data,fields,label+' scenario');
 const seats=integer(data.seats,'seat count',1,1000);
 const flatMonthlyMinor=minorUnits(data.flatMonthly,'flat monthly');
 const seatMonthlyMinor=minorUnits(data.seatMonthly,'per-seat monthly');
 const extrasMonthlyMinor=minorUnits(data.extrasMonthly,'additional monthly');
 const oneTimeFeeMinor=minorUnits(data.oneTimeFee,'one-time');
 const recurringMonthlyMinor=flatMonthlyMinor+seatMonthlyMinor*seats+extrasMonthlyMinor;
 const totalMinor=recurringMonthlyMinor*months+oneTimeFeeMinor;
 if(!Number.isSafeInteger(totalMinor))throw new Error('Estimated total exceeds safe range');
 return {seats,flatMonthlyMinor,seatMonthlyMinor,extrasMonthlyMinor,oneTimeFeeMinor,recurringMonthlyMinor,totalMinor};
}
export function compareSubscriptionCosts(input){
 strictFields(input,['currency','months','optionA','optionB'],'comparison input');
 if(!currencies.has(input.currency))throw new Error('Unsupported comparison currency');
 const months=integer(input.months,'month horizon',1,60);
 const optionA=scenario(input.optionA,months,'Option A');
 const optionB=scenario(input.optionB,months,'Option B');
 // Snapshot only allowed fields, not references to mutable form state.
 const inputSnapshot={
  currency:input.currency,months:input.months,
  optionA:Object.fromEntries(fields.map(key=>[key,input.optionA[key]])),
  optionB:Object.fromEntries(fields.map(key=>[key,input.optionB[key]]))
 };
 return {
  input:inputSnapshot,
  currency:input.currency,
  months,
  formula:'(monthly base + price per seat × seats + other monthly costs) × months + one-time costs',
  optionA,optionB,
  differenceMinor:Math.abs(optionA.totalMinor-optionB.totalMinor),
  lowerCost:optionA.totalMinor<optionB.totalMinor?'A':optionB.totalMinor<optionA.totalMinor?'B':'tie',
  dataSource:'user-entered-only',
  independentlyVerified:false
 };
}
export function formatMinorUnits(value,currency){
 if(!Number.isSafeInteger(value)||value<0)throw new Error('Invalid money minor-unit amount');
 if(!currencies.has(currency))throw new Error('Unsupported currency');
 const whole=Math.floor(value/100).toString();
 const minor=String(value%100).padStart(2,'0');
 return currency+' '+whole+'.'+minor;
}
// A locally calculated amount is not external verification of a vendor price.
// Recompute the caller's entire result before generating a trusted-looking report.
function exactlyEqual(actual,expected){
 if(expected===null||typeof expected!=='object')return Object.is(actual,expected);
 if(!actual||typeof actual!=='object'||Array.isArray(actual)||
    Object.getPrototypeOf(actual)!==Object.prototype)return false;
 const expectedKeys=Object.keys(expected),keys=Object.keys(actual);
 return keys.length===expectedKeys.length&&expectedKeys.every(key=>
  own(actual,key)&&exactlyEqual(actual[key],expected[key]));
}
function validateCostReport(comparison){
 if(!comparison||typeof comparison!=='object'||Array.isArray(comparison)||
    !own(comparison,'input')||comparison.dataSource!=='user-entered-only'||
    comparison.independentlyVerified!==false)
  throw new Error('Invalid cost comparison report provenance');
 let expected;
 try{expected=compareSubscriptionCosts(comparison.input);}
 catch{throw new Error('Invalid cost comparison report input snapshot');}
 if(!exactlyEqual(comparison,expected))
  throw new Error('Invalid cost comparison report integrity: amounts or field set differ from original input');
 return expected;
}
export function plainTextCostReport(comparison){
 comparison=validateCostReport(comparison);
 const f=v=>formatMinorUnits(v,comparison.currency);
 const line=(name,x)=>name+': monthly '+f(x.recurringMonthlyMinor)+
  ', one-time '+f(x.oneTimeFeeMinor)+', '+comparison.months+'-month total '+f(x.totalMinor);
 const finding=comparison.lowerCost==='tie'
  ?'Both options have equal entered-cost estimates.'
  :'Option '+comparison.lowerCost+' has the lower entered-cost estimate by '+f(comparison.differenceMinor)+'.';
 return [
  'StackPilot AI — User-entered software cost estimate',
  'Currency: '+comparison.currency+' (no currency conversion)',
  'Horizon: '+comparison.months+' month(s)',
  'Formula: '+comparison.formula,
  line('Option A',comparison.optionA),
  line('Option B',comparison.optionB),
  finding,
  'These are not vendor-verified pricing quotes or a product recommendation.',
  'Estimates do not include taxes, exchange costs, discounts, variable usage or price changes unless you entered them as costs.',
  'Verify current plan entitlements, limits, contracts and final charges directly with each vendor.',
  'The estimate was calculated locally in your browser; no input was submitted to StackPilot.'
 ].join('\n');
}
