import { escapeSpreadsheetCsvCell } from './buyer-worksheet.mjs';

/**
 * Offline, deterministic RTO/RPO planning on user-entered observations only.
 * RTO and RPO are goals, not verified service continuity or data-loss outcomes.
 */
const numberFields=['targetRtoMinutes','observedRestoreMinutes','targetRpoMinutes','observedRecoveryPointAgeMinutes'];
const booleanFields=['restoreTested','dataIntegrityChecked'];
const fields=[...numberFields,...booleanFields];
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
function parseMinutes(value,name,{allowUnknown=false,positive=false}={}){
 if(allowUnknown && value==='')return null;
 if(!((typeof value==='number' && Number.isSafeInteger(value)) ||
  (typeof value==='string' && /^(0|[1-9]\d*)$/.test(value))))
  throw new Error('Invalid '+name+' minute count');
 const n=Number(value);
 if(!Number.isSafeInteger(n)||n<0||n>1000000||(positive&&n===0))
  throw new Error('Invalid '+name+' range or positive minute requirement');
 return n;
}
export function assessBackupRestoreDrill(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||
  Object.keys(input).length!==fields.length||
  fields.some(k=>!own(input,k))||Object.keys(input).some(k=>!fields.includes(k)))
  throw new Error('Invalid restore drill field set');
 const targetRtoMinutes=parseMinutes(input.targetRtoMinutes,'targetRtoMinutes',{positive:true});
 const observedRestoreMinutes=parseMinutes(input.observedRestoreMinutes,'observedRestoreMinutes',{allowUnknown:true,positive:true});
 const targetRpoMinutes=parseMinutes(input.targetRpoMinutes,'targetRpoMinutes');
 const observedRecoveryPointAgeMinutes=parseMinutes(input.observedRecoveryPointAgeMinutes,'observedRecoveryPointAgeMinutes',{allowUnknown:true});
 for(const field of booleanFields){
  if(typeof input[field]!=='boolean')throw new Error('Invalid boolean '+field);
 }
 const rtoWithinTarget=observedRestoreMinutes===null?null:observedRestoreMinutes<=targetRtoMinutes;
 const rpoWithinTarget=observedRecoveryPointAgeMinutes===null?null:observedRecoveryPointAgeMinutes<=targetRpoMinutes;
 const blockers=[];
 if(observedRestoreMinutes===null)blockers.push('restore-time-unknown');
 else if(!rtoWithinTarget)blockers.push('restore-time-exceeds-target');
 if(observedRecoveryPointAgeMinutes===null)blockers.push('recovery-point-age-unknown');
 else if(!rpoWithinTarget)blockers.push('recovery-point-age-exceeds-target');
 if(!input.restoreTested)blockers.push('restoration-not-attested');
 if(!input.dataIntegrityChecked)blockers.push('data-integrity-not-attested');
 return {
  targetRtoMinutes,observedRestoreMinutes,targetRpoMinutes,observedRecoveryPointAgeMinutes,
  restoreTested:input.restoreTested,dataIntegrityChecked:input.dataIntegrityChecked,
  rtoWithinTarget,rpoWithinTarget,blockers,
  readiness:blockers.length===0?'READY_FOR_HUMAN_REVIEW':'NO_GO',
  independentlyVerified:false,cutoverAuthorized:false,dataSource:'user-entered-only'
 };
}
function checkReport(result){
 if(!result||typeof result!=='object'||Array.isArray(result))
  throw new Error('Invalid unverified restore drill result');
 const reconstructed={
  targetRtoMinutes:result.targetRtoMinutes,
  observedRestoreMinutes:result.observedRestoreMinutes===null?'':result.observedRestoreMinutes,
  targetRpoMinutes:result.targetRpoMinutes,
  observedRecoveryPointAgeMinutes:result.observedRecoveryPointAgeMinutes===null?'':result.observedRecoveryPointAgeMinutes,
  restoreTested:result.restoreTested,
  dataIntegrityChecked:result.dataIntegrityChecked
 };
 const expected=assessBackupRestoreDrill(reconstructed);
 if(Object.keys(result).length!==Object.keys(expected).length ||
  Object.keys(expected).some(k=> {
   if(!own(result,k))return true;
   if(Array.isArray(expected[k]))return !Array.isArray(result[k])||
      expected[k].length!==result[k].length||expected[k].some((v,i)=>v!==result[k][i]);
   return result[k]!==expected[k];
  }))throw new Error('Invalid or unverified restore drill result');
 return expected;
}
export function formatBackupRestoreDrillReport(result){
 const r=checkReport(result);
 return [
  'StackPilot AI — Private backup restore drill planning report',
  'RTO user-entered target (minutes): '+r.targetRtoMinutes,
  'Observed restore duration in authorized drill (minutes): '+(r.observedRestoreMinutes??'UNKNOWN'),
  'RTO threshold comparison: '+(r.rtoWithinTarget===null?'UNKNOWN':r.rtoWithinTarget?'within user target':'above user target'),
  'RPO user-entered target (minutes): '+r.targetRpoMinutes,
  'Observed recovery-point age in drill (minutes): '+(r.observedRecoveryPointAgeMinutes??'UNKNOWN'),
  'RPO threshold comparison: '+(r.rpoWithinTarget===null?'UNKNOWN':r.rpoWithinTarget?'within user target':'above user target'),
  'Restoration tested (self-attested): '+(r.restoreTested?'yes':'no'),
  'Data integrity checked (self-attested): '+(r.dataIntegrityChecked?'yes':'no'),
  'Readiness: '+r.readiness,
  'Unresolved blockers: '+(r.blockers.length?r.blockers.join(', '):'none reported by user'),
  'Evidence: UNVERIFIED — user-entered numbers and checkboxes are not independent restoration proof.',
  'A backup recovery-point age is not proof of zero data loss or verified actual business data-loss exposure.',
  'Measured component restore time is not guaranteed end-to-end service downtime or future recovery time.',
  'This is not authorization to change DNS, retire hosting, spend money or migrate live customer data.',
  'Only a designated human may review real proof and authorize any later cutover.'
 ].join('\n');
}
export function formatBackupRestoreDrillCsv(result){
 const r=checkReport(result);
 const rows=[
  ['target_rto_minutes',r.targetRtoMinutes,'UNVERIFIED'],
  ['observed_restore_minutes',r.observedRestoreMinutes??'','UNVERIFIED'],
  ['rto_within_user_target',r.rtoWithinTarget===null?'UNKNOWN':String(r.rtoWithinTarget),'UNVERIFIED'],
  ['target_rpo_minutes',r.targetRpoMinutes,'UNVERIFIED'],
  ['observed_recovery_point_age_minutes',r.observedRecoveryPointAgeMinutes??'','UNVERIFIED'],
  ['rpo_within_user_target',r.rpoWithinTarget===null?'UNKNOWN':String(r.rpoWithinTarget),'UNVERIFIED'],
  ['restore_tested',String(r.restoreTested),'UNVERIFIED'],
  ['data_integrity_checked',String(r.dataIntegrityChecked),'UNVERIFIED'],
  ['readiness',r.readiness,'UNVERIFIED'],
  ['cutover_authorized','false','UNVERIFIED']
 ];
 return ['metric,value,evidence_status',...rows.map(row=>row.map(escapeSpreadsheetCsvCell).join(','))].join('\r\n')+'\r\n';
}
