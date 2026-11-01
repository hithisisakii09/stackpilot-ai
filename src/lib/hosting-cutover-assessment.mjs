/**
 * Fail-closed hosting migration decision PREPARATION, not a release gate.
 * Browser-only user-entered statuses; never verify evidence or authorize DNS.
 */
export const HOSTING_GATE_DEFINITIONS=Object.freeze([
 Object.freeze({id:'dnsEmail',label:'DNS and email inventory',hint:'Saved DNS records including MX, SPF, DKIM and DMARC'}),
 Object.freeze({id:'backupRestore',label:'Backup restore',hint:'Authorized restoration rehearsal and measured recovery time'}),
 Object.freeze({id:'tlsDependencies',label:'TLS, redirects and dependencies',hint:'Staging test evidence including callbacks and certificates'}),
 Object.freeze({id:'rollbackAuthority',label:'Rollback authority',hint:'Documented triggers, owner and recoverable old system'}),
 Object.freeze({id:'retentionBilling',label:'Data retention and billing',hint:'Retention review and overlap-cost evaluation'})
]);
const allowed=new Set(['not-assessed','pass','fail']);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
export function assessHostingCutover(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||
  Object.keys(input).length!==HOSTING_GATE_DEFINITIONS.length||
  HOSTING_GATE_DEFINITIONS.some(g=>!own(input,g.id))||
  Object.keys(input).some(id=>!HOSTING_GATE_DEFINITIONS.some(g=>g.id===id)))
  throw new Error('Invalid hosting gate field set');
 for(const gate of HOSTING_GATE_DEFINITIONS){
  if(!allowed.has(input[gate.id]))throw new Error('Invalid hosting gate status: '+gate.id);
 }
 const selections=Object.fromEntries(HOSTING_GATE_DEFINITIONS.map(g=>[g.id,input[g.id]]));
 const blockers=HOSTING_GATE_DEFINITIONS.filter(g=>input[g.id]!=='pass').map(g=>g.id);
 const passed=HOSTING_GATE_DEFINITIONS.filter(g=>input[g.id]==='pass').length;
 const failed=HOSTING_GATE_DEFINITIONS.filter(g=>input[g.id]==='fail').length;
 const notAssessed=HOSTING_GATE_DEFINITIONS.filter(g=>input[g.id]==='not-assessed').length;
 return {
  ...selections,passed,failed,notAssessed,blockers,
  status:blockers.length===0?'READY_FOR_HUMAN_REVIEW':'NO_GO',
  independentlyVerified:false,launchAuthorized:false,dataSource:'user-entered-only'
 };
}
function verifyResult(result){
 if(!result||typeof result!=='object'||Array.isArray(result))
  throw new Error('Invalid hosting gate result');
 const fields=Object.fromEntries(HOSTING_GATE_DEFINITIONS.map(g=>[g.id,result[g.id]]));
 const expected=assessHostingCutover(fields);
 if(Object.keys(result).length!==Object.keys(expected).length ||
    Object.keys(expected).some(k=>{
      if(!own(result,k))return true;
      const value=result[k],check=expected[k];
      return Array.isArray(check)?
        (!Array.isArray(value)||value.length!==check.length||value.some((v,i)=>v!==check[i])):
        value!==check;
    }))
  throw new Error('Invalid or unverified hosting gate report');
 return expected;
}
export function formatHostingCutoverReport(result){
 const checked=verifyResult(result);
 const lines=[
  'StackPilot AI — Private hosting cutover checkpoint worksheet',
  'All five statuses were entered by a user; no evidence was independently verified.',
  'Hosting cutover planning outcome: '+checked.status,
  'Passed: '+checked.passed+'; Failed: '+checked.failed+'; Not assessed: '+checked.notAssessed,
  ''
 ];
 for(const gate of HOSTING_GATE_DEFINITIONS){
  lines.push(gate.label+': '+checked[gate.id]+' (user-entered only)');
  if(checked[gate.id]!=='pass')lines.push('  Blocker: evidence requires appropriate human review');
 }
 lines.push(
  '',
  'This is not authorization to change DNS, migrate customer records, retire hosting, or launch production.',
  'Even READY_FOR_HUMAN_REVIEW is only a request for an authorized decision-maker to review actual evidence.',
  'Keep proof, approvals, contract terms, domain names and credentials in your own authorized system.',
  'No statuses were submitted to StackPilot.'
 );
 return lines.join('\n');
}
export function formatHostingCutoverCsv(result){
 const checked=verifyResult(result);
 // CSV rows contain only fixed internally authored labels and one of three exact
 // status tokens. No external strings can be interpreted as spreadsheet formulas.
 const rows=HOSTING_GATE_DEFINITIONS.map(g=>[g.label,checked[g.id],'UNVERIFIED']);
 rows.push(['overall_readiness',checked.status,'UNVERIFIED']);
 rows.push(['launch_authorized','false','UNVERIFIED']);
 const cell=s=>'"'+String(s).replaceAll('"','""')+'"';
 return ['gate,status,evidence_status',...rows.map(row=>row.map(cell).join(','))].join('\r\n')+'\r\n';
}
