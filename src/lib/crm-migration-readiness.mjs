import { escapeSpreadsheetCsvCell } from './buyer-worksheet.mjs';

/**
 * Vendor-neutral CRM cutover preparation: all data is user-entered aggregate
 * counts and self-attested evidence. No real data, provider access, or approval.
 */
export const CRM_MIGRATION_GATES=Object.freeze([
 Object.freeze({id:'exportPermission',label:'Permitted source export',hint:'Confirm authorized access, export scope, retention and safe handling'}),
 Object.freeze({id:'mappingValidation',label:'Field mapping and sample import',hint:'Reconcile mandatory fields, picklists and data types using approved test records'}),
 Object.freeze({id:'associationOwnership',label:'Relationships and owner mapping',hint:'Test associations, record owners, activity history and attachments'}),
 Object.freeze({id:'integrationChecks',label:'Integrations and automations',hint:'Test API clients, reporting, workflow triggers and operational dependencies'}),
 Object.freeze({id:'backupRestore',label:'Backup restore and rollback rehearsal',hint:'Rehearse an authorized rollback and measure recovery time'})
]);
const numberFields=['sourceRecordCount','targetRecordCount','cutoverWindowMinutes','measuredRollbackMinutes'];
const allFields=[...numberFields,...CRM_MIGRATION_GATES.map(g=>g.id)];
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function count(value,field,max){
 if(typeof value!=='string'||!/^[1-9]\d*$/.test(value))throw new Error('Invalid '+field+' integer');
 const n=Number(value);
 if(!Number.isSafeInteger(n)||n<1||n>max)throw new Error('Invalid '+field+' range');
 return n;
}
function exactKeys(data,keys){
 return Boolean(data&&typeof data==='object'&&!Array.isArray(data)&&
   Object.getPrototypeOf(data)===Object.prototype&&
   Object.keys(data).length===keys.length&&keys.every(k=>own(data,k))&&
   Object.keys(data).every(k=>keys.includes(k)));
}
export function assessCrmMigrationReadiness(input){
 if(!exactKeys(input,allFields))throw new Error('Invalid CRM migration field set');
 const source=count(input.sourceRecordCount,'source record count',10_000_000);
 const target=count(input.targetRecordCount,'target record count',10_000_000);
 const window=count(input.cutoverWindowMinutes,'cutover window minutes',1440);
 const rollback=count(input.measuredRollbackMinutes,'measured rollback minutes',1440);
 for(const gate of CRM_MIGRATION_GATES){
  if(!['pass','fail','not-assessed'].includes(input[gate.id]))
   throw new Error('Invalid CRM migration gate status: '+gate.id);
 }
 const inputCopy=Object.fromEntries(allFields.map(k=>[k,input[k]]));
 const recordDiscrepancy=Math.abs(source-target);
 const rollbackFitsWindow=rollback<=window;
 const blockers=CRM_MIGRATION_GATES.filter(g=>input[g.id]!=='pass').map(g=>g.id);
 if(recordDiscrepancy!==0)blockers.push('recordCountsMismatch');
 if(!rollbackFitsWindow)blockers.push('rollbackExceedsWindow');
 return {
  input:inputCopy,recordDiscrepancy,rollbackFitsWindow,blockers,
  status:blockers.length?'NO_GO':'READY_FOR_HUMAN_REVIEW',
  independentlyVerified:false,migrationAuthorized:false,
  verifiedVendorCompatibility:false,dataSource:'user-entered-only'
 };
}
function equalPlain(actual,expected){
 if(expected===null||typeof expected!=='object')return Object.is(actual,expected);
 if(Array.isArray(expected))return Array.isArray(actual)&&actual.length===expected.length&&
  expected.every((v,i)=>equalPlain(actual[i],v));
 if(!actual||typeof actual!=='object'||Array.isArray(actual)||
    Object.getPrototypeOf(actual)!==Object.prototype)return false;
 const keys=Object.keys(expected);
 return Object.keys(actual).length===keys.length&&
  keys.every(k=>own(actual,k)&&equalPlain(actual[k],expected[k]));
}
function validatedResult(result){
 if(!result||typeof result!=='object'||Array.isArray(result)||
    !own(result,'input'))throw new Error('Invalid CRM migration assessment report');
 let checked;
 try{checked=assessCrmMigrationReadiness(result.input);}
 catch{throw new Error('Invalid CRM migration report input');}
 if(!equalPlain(result,checked))throw new Error('Invalid CRM migration assessment integrity');
 return checked;
}
export function formatCrmMigrationReadinessReport(result){
 const r=validatedResult(result);
 const i=r.input;
 const text=[
  'StackPilot AI — CRM migration rollback readiness worksheet',
  'UNVERIFIED — user-entered aggregate figures and statuses; no evidence was independently verified.',
  'Outcome: '+r.status,
  'Source test record count (user-entered): '+i.sourceRecordCount,
  'Target test record count (user-entered): '+i.targetRecordCount,
  'Absolute record discrepancy: '+r.recordDiscrepancy,
  'Planned cutover window (minutes): '+i.cutoverWindowMinutes,
  'Measured rollback rehearsal (minutes): '+i.measuredRollbackMinutes,
  'Rollback fits the planned window (self-reported): '+r.rollbackFitsWindow,
  ''
 ];
 for(const g of CRM_MIGRATION_GATES)text.push(g.label+': '+i[g.id]+' (user-entered)');
 for(const blocker of r.blockers)text.push('Blocker: '+blocker);
 text.push(
  '',
  'Matching counts alone never establish data integrity, associations, user permissions or completeness.',
  'Even READY_FOR_HUMAN_REVIEW is not authorization to migrate, delete, retire or modify live systems.',
  'No vendor compatibility, backup, restore, or data privacy requirement was verified by StackPilot.',
  'Keep real evidence, credentials, sensitive exports and human approval in your own controlled system.',
  'Nothing entered into this worksheet is submitted to StackPilot by the browser-only tool.'
 );
 return text.join('\n');
}
export function formatCrmMigrationReadinessCsv(result){
 const r=validatedResult(result);
 const i=r.input;
 const rows=[
  ['source_record_count',i.sourceRecordCount],
  ['target_record_count',i.targetRecordCount],
  ['record_discrepancy',String(r.recordDiscrepancy)],
  ['cutover_window_minutes',i.cutoverWindowMinutes],
  ['measured_rollback_minutes',i.measuredRollbackMinutes],
  ['rollback_fits_window',String(r.rollbackFitsWindow)],
  ...CRM_MIGRATION_GATES.map(g=>[g.id,i[g.id]]),
  ['overall_readiness',r.status],
  ['independently_verified','false'],
  ['migration_authorized','false']
 ];
 return ['check,value,evidence_status',...rows.map(row=>[...row,'SELF_REPORTED'].map(escapeSpreadsheetCsvCell).join(','))].join('\r\n')+'\r\n';
}
