/**
 * Offline, local structural consistency checker for NEGATIVE-ONLY editorial
 * notes. SHA-256 hash links are NOT external anchoring, authenticated reviewer
 * identity, an immutable log, evidence approval, or publication permission.
 * A repository editor can replace the entire chain and recompute its hashes.
 */
import {createHash} from 'node:crypto';
import {buildComparisonEvidenceIndex} from './comparison-evidence.mjs';

const GENESIS='0'.repeat(64);
const fields=[
 'sequence','eventId','claimId','productId','action','reason',
 'recordedOn','previousDigest'
];
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const exact=(obj,keys)=>record(obj)&&Object.keys(obj).length===keys.length&&
 keys.every(k=>Object.hasOwn(obj,k));
const plain=x=>typeof x==='string'&&x.length>=24&&x.length<=300&&
 x.trim()===x&&!/[<>\x00-\x1f\x7f]/.test(x);
const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
function day(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(value+'T00:00:00.000Z');
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;
}
function validatePayload(p){
 if(!exact(p,fields))throw new Error('Review event has invalid or unauthorized fields');
 if(!Number.isSafeInteger(p.sequence)||p.sequence<1)throw new Error('Invalid event sequence');
 if(typeof p.eventId!=='string'||!/^[a-z][a-z0-9-]{3,70}$/.test(p.eventId))
  throw new Error('Invalid review event ID');
 if(typeof p.claimId!=='string'||!/^comparison-[a-z0-9-]+-\d{2}$/.test(p.claimId)||
    typeof p.productId!=='string'||!/^[a-z][a-z0-9-]*$/.test(p.productId))
  throw new Error('Invalid claim/product key');
 if(!['needs-evidence','rejected'].includes(p.action))
  throw new Error('Only negative review actions are allowed');
 if(!plain(p.reason))throw new Error('Invalid review note reason');
 if(!day(p.recordedOn))throw new Error('Invalid review event date');
 if(!digest(p.previousDigest))throw new Error('Invalid prior history digest');
}

/** Hashing helper only; no signing, authorization, identity or network calls. */
export function computeReviewEventDigest(payload){
 validatePayload(payload);
 return createHash('sha256')
  .update('STACKPILOT-LOCAL-UNTRUSTED-REVIEW-HISTORY-V1\n','utf8')
  .update(JSON.stringify(fields.map(k=>payload[k])),'utf8')
  .digest('hex');
}

export function validateEditorialReviewHistory({
 history,ledger,pairs,products,today=new Date().toISOString().slice(0,10)
}={}){
 if(!day(today))throw new Error('Invalid reference date');
 if(!Array.isArray(history))throw new Error('Review history must be an array');
 const validClaims=buildComparisonEvidenceIndex(ledger,pairs,products,{today});
 const seen=new Set();
 let lastDigest=GENESIS;
 let latestDate=null;
 for(const [i,row] of history.entries()){
  if(!exact(row,[...fields,'digest']))throw new Error('Invalid review history fields');
  if(row.sequence!==i+1)throw new Error('Invalid review event sequence');
  const payload=Object.fromEntries(fields.map(k=>[k,row[k]]));
  const expectedDigest=computeReviewEventDigest(payload);
  const key=row.claimId+'\u0000'+row.productId;
  if(!validClaims.has(key))throw new Error('Unknown comparison claim/product for review event');
  if(seen.has(row.eventId))throw new Error('Duplicate review event ID');
  seen.add(row.eventId);
  if(row.recordedOn>today)throw new Error('Future review event date');
  if(latestDate!==null&&row.recordedOn<latestDate)
   throw new Error('Review event chronology is not monotonic');
  latestDate=row.recordedOn;
  if(row.previousDigest!==lastDigest)throw new Error('Review history chain broken');
  if(!digest(row.digest)||row.digest!==expectedDigest)
   throw new Error('Review event digest mismatch');
  lastDigest=row.digest;
 }
 return {
  status:'LOCAL-STRUCTURE-ONLY',
  events:history.length,
  lastDigest,
  localChainConsistent:true,
  externallyAnchored:false,
  reviewerAuthenticated:false,
  authenticatedApprovals:0,
  canPublish:false
 };
}
