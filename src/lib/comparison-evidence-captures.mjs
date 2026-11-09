/**
 * Private, offline MANUAL excerpts for claim-specific research triage.
 *
 * Hash equality proves text consistency only. It does NOT prove provenance,
 * live vendor content, factual support, reviewer identity, or approval.
 * No crawling, signing, authentication, networking or publication here.
 */
import {createHash} from 'node:crypto';
import {validateComparisonSourceProposals} from './comparison-review-packets.mjs';
import {buildCandidateSourceRiskReport} from './candidate-source-risk.mjs';

const fields=[
 'captureId','claimId','productId','researchLeadId','sourceUrl',
 'claimSha256','capturedOn','planScope','regionScope','excerpt',
 'excerptSha256','captureMethod','status','approved'
];
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const exact=(x,keys)=>record(x)&&Object.keys(x).length===keys.length&&keys.every(key=>Object.hasOwn(x,key));
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
function day(x){
 if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;
 const d=new Date(x+'T00:00:00.000Z');
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===x;
}
function validExcerpt(text){
 return typeof text==='string'&&text.length>=40&&text.length<=1000&&
  text.trim()===text&&!/[<>\x00-\x1f\x7f]/.test(text);
}
const hash=text=>createHash('sha256').update(text,'utf8').digest('hex');
const key=(claimId,productId,leadId)=>claimId+'\u0000'+productId+'\u0000'+leadId;

/** Hash only a locally supplied, bounded, single-line candidate excerpt. */
export function hashEvidenceExcerpt(excerpt){
 if(!validExcerpt(excerpt))throw new Error('Invalid private manual excerpt');
 return hash(excerpt);
}

export function validateComparisonEvidenceCaptures({
 captures,proposals,ledger,triage,researchClaims,revocations,products,pairs,
 today=new Date().toISOString().slice(0,10)
}={}){
 if(!day(today))throw new Error('Invalid reference date');
 if(!Array.isArray(captures))throw new Error('Evidence captures must be an array');
 validateComparisonSourceProposals({proposals,ledger,triage,researchClaims,revocations,products,pairs,today});
 const proposed=new Map(proposals.map(p=>[key(p.claimId,p.productId,p.researchLeadId),p]));
 const leads=new Map(researchClaims.map(lead=>[lead.id,lead]));
 const assertions=new Map();
 for(const pair of pairs){
  pair.matrix.forEach((row,i)=>{
   const claimId='comparison-'+pair.slug+'-'+String(i+1).padStart(2,'0');
   assertions.set(claimId+'\u0000'+pair.firstId,row.firstValue);
   assertions.set(claimId+'\u0000'+pair.secondId,row.secondValue);
  });
 }
 const seenIds=new Set(),seenClaimSourceDays=new Set();
 for(const capture of captures){
  if(!exact(capture,fields))throw new Error('Invalid or unauthorized manual evidence capture fields');
  if(typeof capture.captureId!=='string'||!/^excerpt-capture-\d{4,}$/.test(capture.captureId))
   throw new Error('Invalid evidence capture ID');
  if(seenIds.has(capture.captureId))throw new Error('Duplicate evidence capture ID');
  seenIds.add(capture.captureId);
  const association=key(capture.claimId,capture.productId,capture.researchLeadId);
  const proposal=proposed.get(association);
  if(!proposal)throw new Error('Manual capture requires an exact claim/product/source proposal');
  const lead=leads.get(capture.researchLeadId);
  if(!lead||lead.productId!==capture.productId||lead.sourceUrl!==capture.sourceUrl)
   throw new Error('Manual capture source URL or vendor does not match the research lead');
  if(capture.planScope!==proposal.planScope||capture.regionScope!==proposal.regionScope)
   throw new Error('Manual capture plan/region scope must match the source proposal');
  if(!day(capture.capturedOn)||capture.capturedOn>today||
     capture.capturedOn<proposal.proposedOn||capture.capturedOn<lead.recordedOn)
   throw new Error('Invalid or future capture date');
  const distinct=association+'\u0000'+capture.capturedOn;
  if(seenClaimSourceDays.has(distinct))throw new Error('Duplicate same-day claim/source capture');
  seenClaimSourceDays.add(distinct);
  const assertion=assertions.get(capture.claimId+'\u0000'+capture.productId);
  if(typeof assertion!=='string'||!assertion.trim()||
     !sha(capture.claimSha256)||capture.claimSha256!==hash(assertion))
   throw new Error('Manual capture claim assertion digest does not match private candidate');
  if(!sha(capture.excerptSha256)||capture.excerptSha256!==hashEvidenceExcerpt(capture.excerpt))
   throw new Error('Manual capture excerpt SHA256 mismatch');
  if(capture.captureMethod!=='manual'||capture.status!=='candidate'||capture.approved!==false)
   throw new Error('Manual evidence capture cannot assert verification or approval');
 }
 return captures.length;
}

/**
 * A sorted private-only inventory. Even a valid excerpt remains UNVERIFIED.
 * It cannot be written to browser assets or promoted to evidence automatically.
 */
export function buildComparisonEvidenceCaptureReport(inputs={}){
 const total=validateComparisonEvidenceCaptures(inputs);
 const {captures,proposals,ledger,triage,researchClaims,revocations,products,pairs,today}=inputs;
 const effectiveToday=today??new Date().toISOString().slice(0,10);
 const risk=buildCandidateSourceRiskReport({
  claims:researchClaims,products,revocations,today:effectiveToday
 });
 const risks=new Map(risk.entries.map(item=>[item.sourceId,item.risk]));
 const claims=new Set();
 for(const pair of pairs){
  pair.matrix.forEach((_,i)=>{
   const id='comparison-'+pair.slug+'-'+String(i+1).padStart(2,'0');
   claims.add(id+'\u0000'+pair.firstId);
   claims.add(id+'\u0000'+pair.secondId);
  });
 }
 const covered=new Set(captures.map(c=>c.claimId+'\u0000'+c.productId));
 const records=captures.map(c=>({
  ...c,
  researchLeadRisk:risks.get(c.researchLeadId),
  sourceReviewedForThisClaim:false,
  independentlyVerified:false,
  supportsClaimVerified:false,
  eligibleForPublication:false,
  approved:false
 })).sort((a,b)=>a.captureId.localeCompare(b.captureId,'en'));
 return {
  status:'INTERNAL-UNVERIFIED',
  totalCaptures:total,
  claimsWithExcerpts:covered.size,
  claimsWithoutExcerpts:claims.size-covered.size,
  approvedCaptures:0,
  independentlyVerifiedCaptures:0,
  publicationAllowed:false,
  records
 };
}
