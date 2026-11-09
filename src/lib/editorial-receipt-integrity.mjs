/**
 * A signature can prove byte integrity against a pinned key, NOT reviewer
 * identity, factual truth, owner authorization, or publication permission.
 * The repository production configuration accepts zero keys and zero receipts.
 * No secret signing keys, network access or approval transition is provided.
 */
import {createHash,createPublicKey,verify as verifySignature} from 'node:crypto';

const payloadFields=[
 'schemaVersion','keyId','claimId','productId','claimSha256','sourceUrl',
 'sourceSnapshotSha256','planScope','regionScope','checkedOn','expiresOn','decision'
];
const anchorFields=['keyId','algorithm','publicKeySpkiBase64','status','revokedOn'];
const contextFields=[
 'claimId','productId','candidateAssertion','sourceUrl',
 'sourceSnapshotSha256','planScope','regionScope'
];
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const exactFields=(x,keys)=>record(x)&&Object.keys(x).length===keys.length&&
 keys.every(k=>Object.hasOwn(x,k));
function isDay(x){
 if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;
 const d=new Date(x+'T00:00:00.000Z');
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===x;
}
const plain=(x,min,max)=>typeof x==='string'&&x.length>=min&&x.length<=max&&
 x.trim()===x&&!/[<>\x00-\x1f\x7f]/.test(x);
const id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{2,63}$/.test(x);
const digest=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
function officialLikeUrl(value){
 if(typeof value!=='string')return false;
 try{
  const url=new URL(value);
  return url.protocol==='https:'&&url.hostname.includes('.')&&
   !url.username&&!url.password&&!url.port&&!url.search&&!url.hash&&
   url.pathname.length>1&&url.toString()===value;
 }catch{return false;}
}

function validatePayload(p){
 if(!exactFields(p,payloadFields))throw new Error('Invalid or undeclared receipt payload fields');
 if(p.schemaVersion!==1||p.decision!=='source-inspected-unapproved')
  throw new Error('Receipt is not a valid unapproved source-inspection record');
 if(!id(p.keyId)||typeof p.claimId!=='string'||!/^comparison-[a-z0-9-]+-\d{2}$/.test(p.claimId)||
    !id(p.productId))throw new Error('Invalid receipt claim or signing-key identifier');
 if(!digest(p.claimSha256)||!digest(p.sourceSnapshotSha256))
  throw new Error('Invalid source or assertion snapshot digest');
 if(!officialLikeUrl(p.sourceUrl)||!plain(p.planScope,3,100)||!plain(p.regionScope,3,100))
  throw new Error('Invalid source URL or exact plan/region context');
 if(!isDay(p.checkedOn)||!isDay(p.expiresOn)||p.expiresOn<=p.checkedOn)
  throw new Error('Invalid receipt review or expiration date');
}

/**
 * Domain-separated, fixed-order serialization. The sign operation itself is
 * deliberately NOT implemented in this repository.
 */
export function canonicalReviewReceiptPayload(payload){
 validatePayload(payload);
 return Buffer.from(
  'STACKPILOT-EDITORIAL-SOURCE-INSPECTION-V1\n'+
  JSON.stringify(payloadFields.map(k=>payload[k])),
  'utf8'
 );
}

function validateTrustAnchors(anchors){
 if(!Array.isArray(anchors))throw new Error('Trusted key anchors must be an array');
 const seen=new Set(),keys=new Map();
 for(const anchor of anchors){
  if(!exactFields(anchor,anchorFields))throw new Error('Invalid signing key fields');
  if(!id(anchor.keyId)||anchor.algorithm!=='Ed25519'||
     !['active','revoked'].includes(anchor.status)||
     (anchor.status==='active'&&anchor.revokedOn!==null)||
     (anchor.status==='revoked'&&!isDay(anchor.revokedOn)))
   throw new Error('Invalid or revoked signing key metadata');
  if(seen.has(anchor.keyId))throw new Error('Duplicate trusted signing key');
  seen.add(anchor.keyId);
  const encoded=anchor.publicKeySpkiBase64;
  if(typeof encoded!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
   throw new Error('Invalid signing key base64 encoding');
  const bytes=Buffer.from(encoded,'base64');
  if(bytes.toString('base64')!==encoded)throw new Error('Invalid signing key base64');
  let key;
  try{
   key=createPublicKey({key:bytes,format:'der',type:'spki'});
  }catch{throw new Error('Invalid Ed25519 signing key');}
  if(key.asymmetricKeyType!=='ed25519')throw new Error('Incorrect signing key algorithm');
  keys.set(anchor.keyId,{metadata:anchor,key});
 }
 return keys;
}

/**
 * Future offline integrity primitive. Even a good signature cannot approve
 * a source, establish the reviewer's identity or unlock the publishing gate.
 */
export function verifyReviewReceiptIntegrity({
 receipt,trustAnchors,expected,today=new Date().toISOString().slice(0,10)
}={}){
 if(!isDay(today))throw new Error('Invalid reference date');
 if(!record(receipt)||!exactFields(receipt,[...payloadFields,'signature']))
  throw new Error('Invalid or unauthorised receipt fields');
 const payload=Object.fromEntries(payloadFields.map(k=>[k,receipt[k]]));
 const message=canonicalReviewReceiptPayload(payload);
 if(payload.checkedOn>today)throw new Error('Receipt review date is in the future');
 if(payload.expiresOn<today)throw new Error('Receipt expired');
 if(!exactFields(expected,contextFields)||typeof expected.candidateAssertion!=='string'||
    !expected.candidateAssertion.trim())
  throw new Error('Missing trusted expected context');
 const claimSha256=createHash('sha256').update(expected.candidateAssertion,'utf8').digest('hex');
 const binding={
  claimId:expected.claimId,
  productId:expected.productId,
  claimSha256,
  sourceUrl:expected.sourceUrl,
  sourceSnapshotSha256:expected.sourceSnapshotSha256,
  planScope:expected.planScope,
  regionScope:expected.regionScope
 };
 if(Object.entries(binding).some(([key,value])=>payload[key]!==value))
  throw new Error('Receipt does not match the expected claim/source/scope context or digest');
 const trusted=validateTrustAnchors(trustAnchors);
 const anchor=trusted.get(payload.keyId);
 if(!anchor)throw new Error('No trusted key anchor for receipt');
 if(anchor.metadata.status!=='active'||anchor.metadata.revokedOn!==null)
  throw new Error('Revoked signing key cannot verify review receipt');
 if(typeof receipt.signature!=='string'||!/^[A-Za-z0-9_-]{86}$/.test(receipt.signature))
  throw new Error('Invalid Ed25519 receipt signature encoding');
 const signature=Buffer.from(receipt.signature,'base64url');
 if(signature.length!==64||signature.toString('base64url')!==receipt.signature)
  throw new Error('Invalid signature bytes');
 const signatureValid=verifySignature(null,message,anchor.key,signature);
 return {
  signatureValid,integrityBoundToExpectedContext:signatureValid,
  reviewerAuthenticated:false,editorialApproved:false,canPublish:false,
  status:signatureValid?'INTEGRITY-ONLY-UNAPPROVED':'UNVERIFIED-BAD-SIGNATURE'
 };
}

/**
 * All configured signing keys and receipts are permanently disabled in this
 * milestone. A PR that adds either fails the CI data and readiness gates.
 */
export function assertEditorialReceiptsLocked(trustAnchors,receipts){
 if(!Array.isArray(trustAnchors)||!Array.isArray(receipts)||
    trustAnchors.length!==0||receipts.length!==0)
  throw new Error('Editorial receipt activation locked: owner authorization and independent review required');
 return {trustedKeys:0,acceptedReceipts:0,authenticatedApprovals:0,canPublish:false};
}
