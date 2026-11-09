/**
 * One PRIVATE, exact claim/vendor research starter.
 * Existing vendor-document URLs are options for human inspection, NOT
 * claim-matched evidence, live verification, review identity or approval.
 * Generated templates are intentionally INCOMPLETE until a researcher
 * supplies their own real date, source association and research text.
 */
import {buildComparisonGapWorklist} from './comparison-gap-worklist.mjs';
import {buildCandidateSourceRiskReport} from './candidate-source-risk.mjs';

export function buildClaimResearchStarter(inputs={}){
 const {claimId,productId,products,researchClaims,revocations,today}=inputs;
 if(typeof claimId!=='string'||typeof productId!=='string'||
    !/^[a-z0-9-]+$/.test(claimId)||!/^[a-z0-9-]+$/.test(productId))
  throw new Error('Explicit comparison claim and vendor product IDs required');
 const worklist=buildComparisonGapWorklist(inputs);
 const row=worklist.rows.find(item=>item.claimId===claimId&&item.productId===productId);
 if(!row)throw new Error('Unknown comparison claim or vendor product association');
 const sourceReport=buildCandidateSourceRiskReport({
  claims:researchClaims,products,revocations,today:today??new Date().toISOString().slice(0,10)
 });
 const vendorLeads=sourceReport.entries.filter(item=>item.productId===productId)
  .map(item=>{
   const source=researchClaims.find(claim=>claim.id===item.sourceId);
   if(!source)throw new Error('Missing candidate vendor-source reference');
   return {
    researchLeadId:item.sourceId,
    sourceUrl:source.sourceUrl,
    recordedOn:item.recordedOn,
    risk:item.risk,
    proposedForClaim:row.researchLeadIds.includes(item.sourceId),
    sourceVerified:false,
    eligibleForPublication:false
   };
  }).sort((a,b)=>a.researchLeadId.localeCompare(b.researchLeadId,'en'));
 const usableProposals=row.researchLeadIds.filter(id=>
  vendorLeads.some(lead=>lead.researchLeadId===id&&lead.risk==='unreviewed'));
 const captureTemplates=usableProposals.map(researchLeadId=>({
  captureId:null,
  claimId,
  productId,
  researchLeadId,
  capturedOn:null,
  excerpt:null
 }));
 return {
  status:'PRIVATE-UNVERIFIED-STARTER',
  claimId,productId,productName:row.productName,
  dimension:row.dimension,
  candidateAssertion:row.candidateAssertion,
  reviewQuestion:row.reviewQuestion,
  triageDecision:row.triageDecision,
  stage:row.stage,
  nextAction:row.nextAction,
  existingProposedLeadIds:[...row.researchLeadIds],
  existingManualCaptureIds:[...row.manualCaptureIds],
  vendorLeads,
  // Null values are NOT valid proposal/capture input. Human must fill them.
  proposalTemplate:{
   claimId,
   productId,
   researchLeadId:null,
   proposedOn:null,
   relevanceNote:null,
   planScope:null,
   regionScope:null
  },
  captureTemplates,
  evidenceStatus:'UNVERIFIED',
  sourceInspectedBySystem:false,
  sourceVerified:false,
  authenticatedApprovals:0,
  approved:false,
  canPublish:false
 };
}
