/**
 * PRIVATE OFFLINE researcher worklist, not a public comparison API.
 * Every result is unverified: a research lead or local excerpt is not
 * independent verification, an authenticated editorial vote or approval.
 */
import {buildPrivateReviewPacketBundle} from './private-review-packet-bundle.mjs';

const ACTIONS={
 'needs-source-proposal':'Identify relevant official vendor source documentation and propose a claim-specific research lead; verify plan and region.',
 'needs-manual-capture':'Inspect the proposed vendor source manually and record a short exact excerpt with date, plan and region in the private capture register.',
 'needs-independent-verification':'Obtain independent source and plan/region verification; local excerpt hashes do not establish vendor truth or approval.',
 'source-refresh-needed':'Recheck stale or revoked research sources before making any independent evidence assessment.',
 'rejected-needs-reassessment':'Keep this assertion rejected; any reassessment requires a separately authorized editorial process.'
};
const STAGES=Object.keys(ACTIONS);

export function buildComparisonGapWorklist(inputs={}){
 const bundle=buildPrivateReviewPacketBundle(inputs);
 const productNames=new Map(inputs.products.map(p=>[p.id,p.name]));
 const rows=bundle.packets.map(packet=>{
  const leadRisk=packet.proposedSources.some(s=>s.risk==='stale'||s.risk==='revoked');
  const stage=packet.triageDecision==='rejected'?'rejected-needs-reassessment':
   leadRisk?'source-refresh-needed':
   packet.capturedExcerpts.length?'needs-independent-verification':
   packet.proposedSources.length?'needs-manual-capture':
   'needs-source-proposal';
  const productName=productNames.get(packet.productId);
  if(typeof productName!=='string'||!productName.trim())
   throw new Error('Missing vendor name for private research worklist');
  return {
   key:packet.key,
   claimId:packet.claimId,
   productId:packet.productId,
   productName,
   dimension:packet.dimension,
   candidateAssertion:packet.candidateAssertion,
   reviewQuestion:packet.reviewQuestion,
   triageDecision:packet.triageDecision,
   stage,
   nextAction:ACTIONS[stage],
   researchLeadIds:packet.proposedSources.map(s=>s.researchLeadId).sort(),
   manualCaptureIds:packet.capturedExcerpts.map(s=>s.captureId).sort(),
   evidenceStatus:'UNVERIFIED',
   approved:false,
   sourceVerified:false,
   canPublish:false
  };
 });
 const count=stage=>rows.filter(row=>row.stage===stage).length;
 return {
  status:'PRIVATE-UNVERIFIED-WORKLIST',
  totalClaims:rows.length,
  withoutProposals:count('needs-source-proposal'),
  awaitingManualCapture:count('needs-manual-capture'),
  awaitingIndependentVerification:count('needs-independent-verification'),
  requiringSourceRefresh:count('source-refresh-needed'),
  rejected:count('rejected-needs-reassessment'),
  manualCaptures:bundle.manualCaptures.total,
  authenticatedApprovals:0,
  publicationAllowed:false,
  rows
 };
}

/**
 * Explicitly private manual CSV worksheet, not import-ready validated evidence.
 * Quote EVERY cell and guard spreadsheet interpreters against formula execution.
 * The manually entered columns remain blank; this command never fabricates facts.
 */
export function serializeComparisonGapCsv(report){
 if(!report||report.status!=='PRIVATE-UNVERIFIED-WORKLIST'||
    report.publicationAllowed!==false||report.authenticatedApprovals!==0||
    !Array.isArray(report.rows)||report.rows.length===0||
    report.rows.length!==report.totalClaims||
    report.rows.some(row=>!row||row.approved!==false||
     row.canPublish!==false||row.sourceVerified!==false||
     row.evidenceStatus!=='UNVERIFIED'||!STAGES.includes(row.stage)))
  throw new Error('Invalid, publication-enabled or unapproved private worklist rows');
 const headers=[
  'Claim ID','Vendor','Dimension',
  'UNVERIFIED candidate assertion (PRIVATE)','Research question',
  'Research stage (NOT APPROVAL)','Existing proposed lead IDs (NOT EVIDENCE)',
  'Existing manual capture IDs (NOT VERIFIED)','Next research action',
  'Official source URL (manual entry)','Plan scope (manual entry)',
  'Region scope (manual entry)','Source checked on YYYY-MM-DD (manual entry)',
  'Exact short excerpt (manual entry)','Research notes (manual entry)'
 ];
 const formulaStart=/^[\s\uFEFF\u200B-\u200D\u2060]*[=+\-@]/u;
 function cell(value){
  if(typeof value!=='string')throw new Error('Invalid worksheet cell value');
  const safe=formulaStart.test(value)?"'"+value:value;
  return '"'+safe.replaceAll('"','""')+'"';
 }
 const lines=[
  headers.map(cell).join(','),
  ...report.rows.map(row=>[
   row.claimId,row.productName,row.dimension,row.candidateAssertion,
   row.reviewQuestion,row.stage,row.researchLeadIds.join('; '),
   row.manualCaptureIds.join('; '),row.nextAction,
   '','','','','',''
  ].map(cell).join(','))
 ];
 return lines.join('\r\n')+'\r\n';
}
