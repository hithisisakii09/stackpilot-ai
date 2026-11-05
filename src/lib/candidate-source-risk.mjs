/**
 * Repository-only risk inventory for vendor documentation candidates.
 * Recent collection is not verification. Revocation is not editorial approval.
 * No network IO, approval transition, or publication side effects.
 */
import {validateResearchClaims} from './research-claims.mjs';

const isRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function utcDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const date=new Date(value+'T00:00:00.000Z');
 return Number.isNaN(date.valueOf())||date.toISOString().slice(0,10)!==value?null:date;
}

export function buildCandidateSourceRiskReport({
 claims,products,revocations,today=new Date().toISOString().slice(0,10),staleAfterDays=90
}={}){
 if(!utcDate(today))throw new Error('Invalid reference date');
 if(!Number.isInteger(staleAfterDays)||staleAfterDays<1||staleAfterDays>3650)
  throw new Error('Invalid freshness threshold');
 validateResearchClaims(claims,products,{today});
 if(!Array.isArray(revocations))throw new Error('Source revocations must be an array');
 const byId=new Map(claims.map(entry=>[entry.id,entry]));
 const revoked=new Map();
 const revocationFields=['sourceId','revokedOn','reason'];
 for(const item of revocations){
  if(!isRecord(item)||Object.keys(item).length!==revocationFields.length||
     revocationFields.some(key=>!Object.hasOwn(item,key)))
   throw new Error('Invalid source revocation fields');
  if(typeof item.sourceId!=='string'||!byId.has(item.sourceId))
   throw new Error('Unknown candidate source revocation ID');
  if(revoked.has(item.sourceId))throw new Error('Duplicate source revocation');
  const source=byId.get(item.sourceId);
  if(!utcDate(item.revokedOn)||item.revokedOn>today||item.revokedOn<source.recordedOn)
   throw new Error('Invalid source revocation date');
  if(typeof item.reason!=='string'||item.reason.trim().length<20||
     item.reason.length>300||/[<>\x00-\x1f\x7f]/.test(item.reason))
   throw new Error('Invalid source revocation reason');
  revoked.set(item.sourceId,item);
 }
 const now=utcDate(today);
 const entries=claims.map(claim=>{
  const withdrawn=revoked.get(claim.id);
  const daysSinceRecorded=Math.floor((now-utcDate(claim.recordedOn))/86_400_000);
  const risk=withdrawn?'revoked':daysSinceRecorded>staleAfterDays?'stale':'unreviewed';
  return {
   sourceId:claim.id,productId:claim.productId,
   recordedOn:claim.recordedOn,daysSinceRecorded,
   risk,approved:false,eligibleForPublication:false,reviewRequired:true,
   revokedOn:withdrawn?.revokedOn??null,
   revocationReason:withdrawn?.reason??null
  };
 }).sort((a,b)=>a.sourceId.localeCompare(b.sourceId,'en'));
 return {
  status:'UNVERIFIED',
  totalSources:entries.length,
  approvedSources:0,
  unreviewedSources:entries.filter(x=>x.risk==='unreviewed').length,
  staleSources:entries.filter(x=>x.risk==='stale').length,
  revokedSources:entries.filter(x=>x.risk==='revoked').length,
  entries
 };
}
