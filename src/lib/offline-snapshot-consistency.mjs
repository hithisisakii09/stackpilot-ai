/**
 * OFFLINE TEXT CONSISTENCY ONLY: a manually supplied plaintext copy may
 * be fake, outdated, incomplete, or irrelevant to the vendor assertion.
 * This code does NOT fetch a vendor site, verify provenance, authenticate
 * anyone, approve a claim, or authorize publishing.
 */
import {createHash} from 'node:crypto';
import {buildComparisonEvidenceCaptureReport} from './comparison-evidence-captures.mjs';

const isRecord=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const snapshotFields=['sourceUrl','snapshotOn','text'];
function validSnapshot(snapshot){
 return isRecord(snapshot)&&Object.keys(snapshot).length===snapshotFields.length&&
  snapshotFields.every(key=>Object.hasOwn(snapshot,key))&&
  typeof snapshot.sourceUrl==='string'&&
  typeof snapshot.snapshotOn==='string'&&
  typeof snapshot.text==='string'&&
  Buffer.byteLength(snapshot.text,'utf8')>=40&&
  Buffer.byteLength(snapshot.text,'utf8')<=262144&&
  !snapshot.text.includes('\u0000');
}
function sameRecord(a,b){
 return Object.keys(a).length===Object.keys(b).length&&
  Object.keys(a).every(key=>Object.hasOwn(b,key)&&a[key]===b[key]);
}

/**
 * Supports an existing registered candidate capture or a newly prepared
 * candidate draft; both must satisfy the same exact source/claim validation.
 * Returns NO original excerpt, local text, candidate assertion or source URL.
 */
export function checkOfflineSnapshotConsistency(inputs={}){
 const {capture,snapshot,captures}=inputs;
 if(!isRecord(capture))throw new Error('Invalid candidate capture record');
 if(!Array.isArray(captures))throw new Error('Registered captures must be an array');
 if(!validSnapshot(snapshot))throw new Error('Invalid private plaintext snapshot');
 const existing=captures.find(row=>row.captureId===capture.captureId);
 if(existing&&!sameRecord(existing,capture))
  throw new Error('Registered capture record mismatch');
 const validatedCaptures=existing?captures:[...captures,capture];
 const report=buildComparisonEvidenceCaptureReport({
  ...inputs,captures:validatedCaptures
 });
 const record=report.records.find(row=>row.captureId===capture.captureId);
 if(!record)throw new Error('Validated capture record not found');
 if(snapshot.sourceUrl!==record.sourceUrl)
  throw new Error('Local snapshot source URL does not match the vendor candidate');
 // A local date is user-supplied metadata, not proof of the date of a webpage.
 if(snapshot.snapshotOn!==record.capturedOn)
  throw new Error('Local snapshot date must match the candidate capture date');
 const exactExcerptFound=snapshot.text.includes(record.excerpt);
 const sourceRisk=record.researchLeadRisk;
 const status=!exactExcerptFound?'LOCAL-TEXT-MISMATCH':
  sourceRisk==='unreviewed'?'LOCAL-TEXT-MATCH-UNVERIFIED':
  'LOCAL-TEXT-MATCH-REFRESH-REQUIRED';
 return {
  status,
  captureId:record.captureId,
  claimId:record.claimId,
  productId:record.productId,
  researchLeadId:record.researchLeadId,
  snapshotSha256:createHash('sha256').update(snapshot.text,'utf8').digest('hex'),
  sourceRisk,
  exactExcerptFound,
  localCopyAuthenticated:false,
  remoteVendorSourceVerified:false,
  relevanceToClaimVerified:false,
  reviewerAuthenticated:false,
  approved:false,
  canPublish:false
 };
}
