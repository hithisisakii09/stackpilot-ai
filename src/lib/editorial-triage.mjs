/**
 * Offline editorial triage. Repository edits are NOT authenticated review:
 * no verified assertion, source binding, approval or release permission.
 */
import {buildComparisonEvidenceIndex,buildComparisonReviewQueue} from './comparison-evidence.mjs';

const fields=['claimId','productId','decision','reason','recordedOn'];
const isRecord=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function validDay(x){
 if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;
 const d=new Date(x+'T00:00:00.000Z');
 return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===x;
}

export function validateEditorialTriage(records,ledger,pairs,products,{today=new Date().toISOString().slice(0,10)}={}){
 if(!validDay(today))throw new Error('Invalid reference date');
 if(!Array.isArray(records))throw new Error('Editorial triage must be an array');
 // Reuse the validated canonical claim/product boundary, including complete coverage.
 const evidence=buildComparisonEvidenceIndex(ledger,pairs,products,{today});
 const seen=new Set();
 for(const item of records){
  if(!isRecord(item)||Object.keys(item).length!==fields.length||
     fields.some(key=>!Object.hasOwn(item,key)))
   throw new Error('Editorial triage has invalid or unapproved fields');
  const key=item.claimId+'\u0000'+item.productId;
  if(!evidence.has(key))throw new Error('Unknown editorial comparison claim/product');
  if(seen.has(key))throw new Error('Duplicate editorial triage disposition');
  seen.add(key);
  if(item.decision!=='needs-evidence'&&item.decision!=='rejected')
   throw new Error('Only negative/unapproved editorial dispositions are allowed');
  if(typeof item.reason!=='string'||item.reason.length>300||
     item.reason.trim()!==item.reason||item.reason.length<24||
     /[<>\x00-\x1f\x7f]/.test(item.reason))
   throw new Error('Invalid editorial triage reason');
  if(!validDay(item.recordedOn)||item.recordedOn>today)
   throw new Error('Invalid or future editorial triage date');
 }
 return records.length;
}

export function buildEditorialTriageQueue(records,ledger,pairs,products,options={}){
 validateEditorialTriage(records,ledger,pairs,products,options);
 const dispositions=new Map(records.map(x=>[x.claimId+'\u0000'+x.productId,x]));
 return buildComparisonReviewQueue(ledger,pairs,products,options).map(row=>{
  const entry=dispositions.get(row.claimId+'\u0000'+row.productId);
  return {
   ...row,
   triageDecision:entry?.decision??'needs-evidence',
   triageReason:entry?.reason??null,
   triageRecordedOn:entry?.recordedOn??null,
   approvalAuthenticated:false,
   publicationAllowed:false
  };
 });
}
