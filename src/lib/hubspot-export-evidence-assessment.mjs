/**
 * PRIVATE OFFLINE checklist for ONE compound HubSpot research candidate.
 * Vendor links, candidate source proposals and manual local excerpts do not
 * establish facts, independent reviewer authority, or publication rights.
 */
import {buildClaimResearchStarter} from './claim-research-starter.mjs';

const CLAIM_ID='comparison-hubspot-vs-pipedrive-05';
const PRODUCT_ID='hubspot';
const EXACT_CANDIDATE='CSV export for deals, contacts, companies; API data sync';

// Keep these predicates separate: export of CRM records is not proof of
// a continuous API sync capability. No predicate is inferred from a URL.
const ATOMIC_PREDICATES=Object.freeze([
 {
  predicateId:'deals-csv-export',
  label:'Deals — CSV record export',
  questions:[
   'Does an actual official vendor source document CSV export of deals, not merely viewing deals or exporting another format?',
   'Which plan, user export permission, account scope and region apply, and what source date confirms them?',
   'What fields, relationships, association and export limits require verification, and where is the exact short source excerpt?'
  ]
 },
 {
  predicateId:'contacts-csv-export',
  label:'Contacts — CSV record export',
  questions:[
   'Does an actual official vendor source document CSV export of contacts, distinct from exporting a list screenshot?',
   'Which plan, user export permission, account scope and region apply, and what source date confirms them?',
   'What contact properties, associations and restrictions apply, and where is the exact short source excerpt?'
  ]
 },
 {
  predicateId:'companies-csv-export',
  label:'Companies — CSV record export',
  questions:[
   'Does an actual official vendor source document CSV export of companies, rather than relying on a deals or contacts claim?',
   'Which plan, user export permission, account scope and region apply, and what source date confirms them?',
   'Which company properties, associations and export limits apply, and where is the exact short source excerpt?'
  ]
 },
 {
  predicateId:'api-data-sync',
  label:'API data sync — separate integration behavior',
  questions:[
   'Does an actual official vendor source document API data sync, rather than only the existence of a read or export API endpoint?',
   'Is the intended sync continuous, scheduled or manually initiated, and what direction, authentication, rate limits, pagination and error handling apply?',
   'Which API plan, scopes, permissions, account, region and source date apply, and where is the exact short supporting excerpt?'
  ]
 }
]);

export function buildHubspotExportAssessment(inputs={}){
 if(!inputs||typeof inputs!=='object'||Array.isArray(inputs)||
    inputs.claimId!==CLAIM_ID||inputs.productId!==PRODUCT_ID)
  throw new Error('Exact HubSpot export claim/vendor required for this private checklist');
 for(const forbidden of ['approved','sourceVerified','canPublish','reviewerAuthenticated','verified']){
  if(Object.hasOwn(inputs,forbidden))
   throw new Error('Private research checklist cannot accept authorization or verification fields');
 }
 const starter=buildClaimResearchStarter(inputs);
 if(starter.candidateAssertion!==EXACT_CANDIDATE)
  throw new Error('HubSpot private candidate assertion changed; manually review atomic checklist for drift');
 const predicates=ATOMIC_PREDICATES.map(spec=>({
  claimId:CLAIM_ID,productId:PRODUCT_ID,
  predicateId:spec.predicateId,label:spec.label,
  questions:[...spec.questions],
  status:'NEEDS-EVIDENCE',
  manuallySelectedSourceId:null,
  manuallyAssignedCaptureId:null,
  sourceVerified:false,
  independentlyVerified:false,
  supportsPredicateVerified:false,
  reviewerAuthenticated:false,
  eligibleForPublication:false
 }));
 return {
  status:'PRIVATE-ATOMIC-NEEDS-EVIDENCE',
  claimId:CLAIM_ID,productId:PRODUCT_ID,
  candidateAssertion:starter.candidateAssertion,
  stage:starter.stage,
  nextAction:starter.nextAction,
  vendorLeads:starter.vendorLeads.map(lead=>({...lead})),
  // These are UNASSIGNED leads/captures at the combined-claim level.
  // Never auto-attach them to one of the four distinct predicates.
  unassignedResearchLeadIds:[...starter.existingProposedLeadIds],
  unassignedCaptureIds:[...starter.existingManualCaptureIds],
  requiredPredicateCount:predicates.length,
  predicateIds:predicates.map(item=>item.predicateId),
  predicates,
  independentlyVerifiedPredicates:0,
  authenticatedApprovals:0,
  approved:false,
  canPublish:false
 };
}


/**
 * Private manual worksheet ONLY. Each row is one independent research question;
 * the eight evidence-input cells are intentionally EMPTY. Existing vendor leads,
 * combined-claim captures and local text matches are never attributed as proof.
 */
export function serializeHubspotExportWorksheetCsv(report){
 const ids=['deals-csv-export','contacts-csv-export','companies-csv-export','api-data-sync'];
 if(!report||report.status!=='PRIVATE-ATOMIC-NEEDS-EVIDENCE'||
    report.claimId!==CLAIM_ID||report.productId!==PRODUCT_ID||
    report.approved!==false||report.canPublish!==false||
    report.authenticatedApprovals!==0||report.independentlyVerifiedPredicates!==0||
    report.requiredPredicateCount!==4||
    !Array.isArray(report.predicateIds)||report.predicateIds.length!==4||
    report.predicateIds.some((id,i)=>id!==ids[i])||
    !Array.isArray(report.predicates)||report.predicates.length!==4||
    report.predicates.some((row,i)=>
     !row||row.claimId!==CLAIM_ID||row.productId!==PRODUCT_ID||
     row.predicateId!==ids[i]||row.status!=='NEEDS-EVIDENCE'||
     row.manuallySelectedSourceId!==null||row.manuallyAssignedCaptureId!==null||
     row.sourceVerified!==false||row.independentlyVerified!==false||
     row.supportsPredicateVerified!==false||row.reviewerAuthenticated!==false||
     row.eligibleForPublication!==false||typeof row.label!=='string'||
     !Array.isArray(row.questions)||row.questions.length<3))
  throw new Error('Invalid or approved private HubSpot research worksheet');
 const headers=[
  'Predicate ID (PRIVATE)','Atomic research requirement (UNVERIFIED)',
  'Questions for independent source inspection','Research status (NOT APPROVAL)',
  'Official source URL (manual entry)','Source checked on YYYY-MM-DD (manual entry)',
  'Plan (manual entry)','Region (manual entry)',
  'Account/permission scope (manual entry)','Exact short excerpt (manual entry)',
  'Limitations/contradictions (manual entry)','Research disposition (manual entry; NOT APPROVAL)'
 ];
 const formulaStart=/^[\s\uFEFF\u200B-\u200D\u2060]*[=+\-@]/u;
 const cell=value=>{
  if(typeof value!=='string'||/[\r\n\0]/.test(value))
   throw new Error('Invalid private research worksheet cell');
  const safe=formulaStart.test(value)?"'"+value:value;
  return '"'+safe.replaceAll('"','""')+'"';
 };
 const lines=[headers.map(cell).join(',')];
 for(const row of report.predicates){
  lines.push([
   row.predicateId,row.label,row.questions.join(' | '),row.status,
   ...Array(8).fill('')
  ].map(cell).join(','));
 }
 return lines.join('\r\n')+'\r\n';
}
