/**
 * Offline manual-source intake: turns explicitly human-supplied research
 * data into VALIDATED CANDIDATE JSON only. Does not inspect vendor sites,
 * authenticate a reviewer, modify repository data, or approve a claim.
 */
import {createHash} from 'node:crypto';
import {validateComparisonSourceProposals} from './comparison-review-packets.mjs';
import {
 hashEvidenceExcerpt,validateComparisonEvidenceCaptures
} from './comparison-evidence-captures.mjs';

const proposalFields=[
 'claimId','productId','researchLeadId','proposedOn',
 'relevanceNote','planScope','regionScope'
];
const captureFields=[
 'captureId','claimId','productId','researchLeadId','capturedOn','excerpt'
];
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function assertExact(input,fields){
 if(!record(input)||Object.keys(input).length!==fields.length||
    fields.some(key=>!Object.hasOwn(input,key)))
  throw new Error('Invalid manual research intake fields; authenticated approval and extra fields are prohibited');
}
const association=(claimId,productId,leadId)=>
 claimId+'\u0000'+productId+'\u0000'+leadId;

export function prepareManualSourceProposal(input,inputs={}){
 assertExact(input,proposalFields);
 const {proposals,researchClaims}=inputs;
 const proposal={...input,status:'candidate',approved:false};
 validateComparisonSourceProposals({...inputs,proposals:[...proposals,proposal]});
 const lead=researchClaims.find(x=>x.id===proposal.researchLeadId);
 if(!lead||lead.productId!==proposal.productId)
  throw new Error('Unknown official-vendor research lead');
 return {
  status:'DRAFT-UNVERIFIED',
  record:proposal,
  sourceLeadId:lead.id,
  candidateSourceUrl:lead.sourceUrl,
  sourceInspected:false,
  sourceVerified:false,
  eligibleForPublication:false
 };
}

export function prepareManualEvidenceCapture(input,inputs={}){
 assertExact(input,captureFields);
 const {proposals,researchClaims,pairs,captures}=inputs;
 if(!Array.isArray(proposals)||!Array.isArray(captures))
  throw new Error('Existing research proposals and captures must be arrays');
 const proposed=proposals.find(p=>
  association(p.claimId,p.productId,p.researchLeadId)===
  association(input.claimId,input.productId,input.researchLeadId));
 if(!proposed)throw new Error('A matching recorded research source proposal is required before manual capture');
 const lead=researchClaims.find(x=>x.id===input.researchLeadId&&x.productId===input.productId);
 if(!lead)throw new Error('Unknown official-vendor source lead for manual capture');
 const claimKey=input.claimId+'\u0000'+input.productId;
 let assertion;
 for(const pair of pairs){
  pair.matrix.forEach((row,i)=>{
   const id='comparison-'+pair.slug+'-'+String(i+1).padStart(2,'0');
   if(id+'\u0000'+pair.firstId===claimKey)assertion=row.firstValue;
   if(id+'\u0000'+pair.secondId===claimKey)assertion=row.secondValue;
  });
 }
 if(typeof assertion!=='string'||!assertion.trim())
  throw new Error('Unknown raw comparison candidate assertion');
 const capture={
  ...input,
  sourceUrl:lead.sourceUrl,
  claimSha256:createHash('sha256').update(assertion,'utf8').digest('hex'),
  planScope:proposed.planScope,
  regionScope:proposed.regionScope,
  excerptSha256:hashEvidenceExcerpt(input.excerpt),
  captureMethod:'manual',
  status:'candidate',
  approved:false
 };
 validateComparisonEvidenceCaptures({...inputs,captures:[...captures,capture]});
 return {
  status:'DRAFT-UNVERIFIED',
  record:capture,
  sourceInspectedBySystem:false,
  sourceVerified:false,
  independentlyVerified:false,
  canPublish:false
 };
}
