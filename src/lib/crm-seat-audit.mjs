/**
 * Vendor-neutral private seat utilization. Buyer-supplied counts are not
 * contract, feature, billing, refund or saving claims.
 */
const fields=['billedSeats','occupiedPaidSeats','activeUsers','invitedUsers','deactivatedUsers','accountModelConfirmed','roleRequirementsConfirmed','billingChangeDateConfirmed'];
const counts=fields.slice(0,5);
const checks=fields.slice(5);
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
function parseCount(value,key){
  if(!((typeof value==='number'&&Number.isSafeInteger(value))||
    (typeof value==='string'&&/^(0|[1-9]\d*)$/.test(value))))
    throw new Error('Invalid '+key+' integer count');
  const n=Number(value);
  if(!Number.isSafeInteger(n)||n<0||n>10000)
    throw new Error('Invalid '+key+' count range (0–10000)');
  return n;
}
export function auditCrmSeats(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||
    Object.keys(input).length!==fields.length||
    fields.some(key=>!own(input,key))||
    Object.keys(input).some(key=>!fields.includes(key)))
    throw new Error('Invalid CRM seat audit field set');
  const parsed=Object.fromEntries(counts.map(key=>[key,parseCount(input[key],key)]));
  for(const key of checks)
    if(typeof input[key]!=='boolean')throw new Error('Confirmation must be boolean: '+key);
  if(parsed.occupiedPaidSeats>parsed.billedSeats)
    throw new Error('Occupied paid seats cannot exceed billed seats');
  const vacantPaidSeats=parsed.billedSeats-parsed.occupiedPaidSeats;
  const hundredths=parsed.billedSeats===0?null:
    Math.round(parsed.occupiedPaidSeats*10000/parsed.billedSeats);
  const utilizationPercent=hundredths===null?'N/A':
    Math.floor(hundredths/100)+'.'+String(hundredths%100).padStart(2,'0')+'%';
  const ready=parsed.billedSeats>0&&checks.every(key=>input[key]===true);
  return {...parsed,vacantPaidSeats,utilizationPercent,
    status:ready?'READY_FOR_HUMAN_REVIEW':'INCOMPLETE',
    billingImpact:'UNKNOWN',refundEligible:null,
    dataSource:'user-entered-only',independentlyVerified:false,
    confirmedChecks:Object.fromEntries(checks.map(key=>[key,input[key]]))};
}
export function formatSeatAuditReport(result){
  if(!result||result.dataSource!=='user-entered-only'||
    result.independentlyVerified!==false||
    !['INCOMPLETE','READY_FOR_HUMAN_REVIEW'].includes(result.status))
    throw new Error('Only unverified buyer-entered audits can be exported');
  return [
    'StackPilot AI — Private CRM paid-seat audit',
    'Billed seats: '+result.billedSeats,
    'Occupied paid seats (buyer-confirmed): '+result.occupiedPaidSeats,
    'Vacant paid seats (arithmetic only): '+result.vacantPaidSeats,
    'Paid-seat utilization: '+result.utilizationPercent,
    'Active users (context only): '+result.activeUsers,
    'Invited users (context only): '+result.invitedUsers,
    'Deactivated users (context only): '+result.deactivatedUsers,
    'Account model checked: '+(result.confirmedChecks.accountModelConfirmed?'yes':'no'),
    'Required roles checked: '+(result.confirmedChecks.roleRequirementsConfirmed?'yes':'no'),
    'Billing change effective date checked: '+(result.confirmedChecks.billingChangeDateConfirmed?'yes':'no'),
    'Status: '+result.status,
    'Billing impact: UNKNOWN. This is not a vendor quote or refund entitlement.',
    'A deactivated user does not prove that a billed seat was cancelled.',
    'Paid-seat utilization is not workforce utilization or a saving estimate.',
    'Confirm entitlements, invoice terms, renewal dates and role permissions with the provider.',
    'Only local arithmetic was performed. No seat counts were submitted to StackPilot.'
  ].join('\n');
}