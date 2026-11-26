/**
 * Offline, private research packets. Candidate assertions and research leads
 * are not reviewed facts and must NEVER be consumed by Astro public pages.
 * This module has no authentication, approval or publication capability.
 */
import {buildEditorialTriageQueue} from './editorial-triage.mjs';
import {buildCandidateSourceRiskReport} from './candidate-source-risk.mjs';

const fields=[
 'claimId','productId','researchLeadId','proposedOn','relevanceNote',
 'planScope','regionScope','status','approved'
];
const isRecord=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function isDay(x){
 if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;
 const d=new Date(x+'T00:00:00.000Z');
 return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===x;
}
const isPlain=(x,min,max)=>typeof x==='string'&&
 x.length>=min&&x.length<=max&&x.trim()===x&&
 !/[<>\x00-\x1f\x7f]/.test(x);

export function validateComparisonSourceProposals({
 proposals,ledger,triage,researchClaims,revocations,products,pairs,
 today=new Date().toISOString().slice(0,10)
}={}){
 if(!isDay(today))throw new Error('Invalid reference date');
 if(!Array.isArray(proposals))throw new Error('Comparison research proposals must be an array');
 // All underlying research leads must be valid, unapproved, and risk-classified.
 buildCandidateSourceRiskReport({claims:researchClaims,products,revocations,today});
 const triageRows=buildEditorialTriageQueue(triage,ledger,pairs,products,{today});
 const allowed=new Set(triageRows.map(x=>x.claimId+'\u0000'+x.productId));
 const sourceById=new Map(researchClaims.map(x=>[x.id,x]));
 const seen=new Set();
 for(const proposal of proposals){
  if(!isRecord(proposal)||Object.keys(proposal).length!==fields.length||
     fields.some(k=>!Object.hasOwn(proposal,k)))
   throw new Error('Invalid or unauthorized comparison research proposal fields');
  const claimKey=proposal.claimId+'\u0000'+proposal.productId;
  if(!allowed.has(claimKey))throw new Error('Unknown comparison claim/product');
  const source=sourceById.get(proposal.researchLeadId);
  if(!source||source.productId!==proposal.productId)
   throw new Error('Research lead must match the exact vendor product');
  const key=claimKey+'\u0000'+proposal.researchLeadId;
  if(seen.has(key))throw new Error('Duplicate source proposal');
  seen.add(key);
  if(!isDay(proposal.proposedOn)||proposal.proposedOn>today||
     proposal.proposedOn<source.recordedOn)
   throw new Error('Invalid or future proposal date');
  if(!isPlain(proposal.relevanceNote,30,350))
   throw new Error('Invalid research relevance note');
  for(const k of ['planScope','regionScope']){
   if(proposal[k]!==null&&!isPlain(proposal[k],3,100))
    throw new Error('Invalid unverified plan or region scope');
  }
  if(proposal.status!=='candidate'||proposal.approved!==false)
   throw new Error('Research proposal cannot claim editorial approval');
 }
 return proposals.length;
}

export function buildComparisonReviewPackets(inputs={}){
 validateComparisonSourceProposals(inputs);
 const {proposals,ledger,triage,researchClaims,revocations,products,pairs,today}=inputs;
 const effectiveToday=today??new Date().toISOString().slice(0,10);
 const risk=buildCandidateSourceRiskReport({claims:researchClaims,products,revocations,today:effectiveToday});
 const sourceRisk=new Map(risk.entries.map(x=>[x.sourceId,x]));
 const sourceById=new Map(researchClaims.map(x=>[x.id,x]));
 const original=new Map();
 for(const pair of pairs){
  pair.matrix.forEach((row,index)=>{
   const id=`comparison-${pair.slug}-${String(index+1).padStart(2,'0')}`;
   original.set(id+'\u0000'+pair.firstId,row.firstValue);
   original.set(id+'\u0000'+pair.secondId,row.secondValue);
  });
 }
 const proposalsByKey=new Map();
 for(const x of proposals){
  const key=x.claimId+'\u0000'+x.productId;
  if(!proposalsByKey.has(key))proposalsByKey.set(key,[]);
  const source=sourceById.get(x.researchLeadId);
  proposalsByKey.get(key).push({
   researchLeadId:x.researchLeadId,
   sourceUrl:source.sourceUrl,
   proposedOn:x.proposedOn,
   relevanceNote:x.relevanceNote,
   planScope:x.planScope,
   regionScope:x.regionScope,
   risk:sourceRisk.get(source.id).risk,
   sourceReviewedForThisClaim:false,
   scopeVerified:false,
   eligibleAsEvidence:false
  });
 }
 const packets=buildEditorialTriageQueue(triage,ledger,pairs,products,{today:effectiveToday})
  .map(row=>{
   const key=row.claimId+'\u0000'+row.productId;
   const candidateAssertion=original.get(key);
   if(typeof candidateAssertion!=='string'||!candidateAssertion.trim())
    throw new Error('Missing raw internal candidate assertion');
   return {
    ...row,
    candidateAssertion,
    unverified:true,
    approved:false,
    canPublish:false,
    proposedSources:(proposalsByKey.get(key)??[]).sort((a,b)=>a.researchLeadId.localeCompare(b.researchLeadId,'en'))
   };
  });
 return {
  status:'INTERNAL-UNVERIFIED',
  totalClaims:packets.length,
  proposedSources:proposals.length,
  claimsWithoutProposals:packets.filter(x=>x.proposedSources.length===0).length,
  authenticatedApprovals:0,
  publicationAllowed:false,
  packets
 };
}
