import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {COMPARISON_PAIRS,getComparisonPair} from '../src/lib/comparison-pairs.mjs';
import {
 canonicalReviewReceiptPayload,verifyReviewReceiptIntegrity,assertEditorialReceiptsLocked
} from '../src/lib/editorial-receipt-integrity.mjs';

const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const anchorsFile=read('../src/data/editorial-review-trust-anchors.json');
const receiptsFile=read('../src/data/editorial-review-receipts.json');
const products=read('../src/data/products.json');
const raw=COMPARISON_PAIRS[0].matrix[0].firstValue;
const digest=s=>createHash('sha256').update(s,'utf8').digest('hex');
const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const testAnchor={keyId:'test-review-key-v1',algorithm:'Ed25519',
 publicKeySpkiBase64:publicKey.export({format:'der',type:'spki'}).toString('base64'),
 status:'active',revokedOn:null};
const payload={
 schemaVersion:1,keyId:testAnchor.keyId,
 claimId:'comparison-hubspot-vs-pipedrive-01',productId:'hubspot',
 claimSha256:digest(raw),
 sourceUrl:'https://knowledge.hubspot.com/import-and-export/export-records',
 sourceSnapshotSha256:digest('TEST ONLY: this is not a real web snapshot'),
 planScope:'CRM Professional',regionScope:'United States',
 checkedOn:'2026-11-05',expiresOn:'2026-12-05',
 decision:'source-inspected-unapproved'
};
const expected={
 claimId:payload.claimId,productId:payload.productId,candidateAssertion:raw,
 sourceUrl:payload.sourceUrl,sourceSnapshotSha256:payload.sourceSnapshotSha256,
 planScope:payload.planScope,regionScope:payload.regionScope
};
const receipt=(p=payload,key=privateKey)=>({...p,
 signature:sign(null,canonicalReviewReceiptPayload(p),key).toString('base64url')});
const input=(overrides={})=>({
 receipt:receipt(),trustAnchors:[testAnchor],expected,today:'2026-11-05',...overrides
});

test('repository contains no trusted review signer or accepted review receipts',()=>{
 assert.deepEqual(anchorsFile,[]);
 assert.deepEqual(receiptsFile,[]);
 assert.deepEqual(assertEditorialReceiptsLocked(anchorsFile,receiptsFile),
  {trustedKeys:0,acceptedReceipts:0,authenticatedApprovals:0,canPublish:false});
 assert.throws(()=>assertEditorialReceiptsLocked([testAnchor],receiptsFile),/locked/i);
 assert.throws(()=>assertEditorialReceiptsLocked(anchorsFile,[receipt()]),/locked/i);
 assert.throws(()=>assertEditorialReceiptsLocked(null,receiptsFile),/locked/i);
});

test('test-only valid Ed25519 signature proves receipt integrity, never identity or approval',()=>{
 const result=verifyReviewReceiptIntegrity(input());
 assert.deepEqual(result,{
  signatureValid:true,integrityBoundToExpectedContext:true,
  reviewerAuthenticated:false,editorialApproved:false,canPublish:false,
  status:'INTEGRITY-ONLY-UNAPPROVED'
 });
 assert.equal(canonicalReviewReceiptPayload(payload).toString('utf8'),canonicalReviewReceiptPayload({...payload}).toString('utf8'));
 assert.equal(getComparisonPair('hubspot-vs-pipedrive',products).matrix[0].approved,false);
});

test('a compromised or modified signature cannot be treated as verification',()=>{
 const signed=receipt();
 const mutated={...signed,signature:receipt({...payload,claimId:'comparison-hubspot-vs-pipedrive-02'}).signature};
 const result=verifyReviewReceiptIntegrity(input({receipt:mutated}));
 assert.equal(result.signatureValid,false);
 assert.equal(result.editorialApproved,false);
 assert.equal(result.canPublish,false);
});

test('signed receipt cannot be replayed across vendor, claim, raw text, source or plan',()=>{
 const changed=[
  {...expected,claimId:'comparison-hubspot-vs-pipedrive-02'},
  {...expected,productId:'pipedrive'},
  {...expected,candidateAssertion:raw+' altered'},
  {...expected,sourceUrl:'https://knowledge.hubspot.com/other'},
  {...expected,sourceSnapshotSha256:digest('different snapshot')},
  {...expected,planScope:'Enterprise'},
  {...expected,regionScope:'Europe'}
 ];
 for(const context of changed){
  assert.throws(()=>verifyReviewReceiptIntegrity(input({expected:context})),/context|match|digest/i);
 }
});

test('invalid, revoked, unknown or duplicated public signing keys fail closed',()=>{
 assert.throws(()=>verifyReviewReceiptIntegrity(input({trustAnchors:[]})),/key|anchor|trust/i);
 assert.throws(()=>verifyReviewReceiptIntegrity(input({trustAnchors:[testAnchor,testAnchor]})),/duplicate/i);
 assert.throws(()=>verifyReviewReceiptIntegrity(input({trustAnchors:[{...testAnchor,status:'revoked',revokedOn:'2026-11-05'}]})),/revok|active/i);
 assert.throws(()=>verifyReviewReceiptIntegrity(input({trustAnchors:[{...testAnchor,keyId:'unrelated-key'}]})),/key|anchor/i);
 assert.throws(()=>verifyReviewReceiptIntegrity(input({trustAnchors:[{...testAnchor,algorithm:'RSA'}]})),/algorithm|key/i);
 assert.throws(()=>verifyReviewReceiptIntegrity(input({trustAnchors:[{...testAnchor,publicKeySpkiBase64:'invalid'}]})),/key|base64/i);
 assert.throws(()=>verifyReviewReceiptIntegrity(input({trustAnchors:[{...testAnchor,privateKey:'forbidden'}]})),/field|key/i);
});

test('invalid dates, schema, metadata, or signature encoding fail closed',()=>{
 assert.throws(()=>verifyReviewReceiptIntegrity(input({today:'2026-02-30'})),/date/i);
 assert.throws(()=>verifyReviewReceiptIntegrity(input({today:'2026-11-04'})),/future|date/i);
 assert.throws(()=>verifyReviewReceiptIntegrity(input({today:'2026-12-06'})),/expir/i);
 const examples=[
  {...payload,decision:'approved'}, {...payload,schemaVersion:2},
  {...payload,expiresOn:'2026-02-30'},
  {...payload,expiresOn:'2026-11-04'},
  {...payload,planScope:'<script>'},
  {...payload,sourceUrl:'http://knowledge.hubspot.com/path'},
  {...payload,reviewer:'fake-owner'},
  {...payload,signerAuthenticated:true},
  {...payload,sourceSnapshotSha256:'invalid'}
 ];
 for(const p of examples){
  assert.throws(()=>canonicalReviewReceiptPayload(p));
 }
 assert.throws(()=>verifyReviewReceiptIntegrity(input({receipt:{...receipt(),signature:'not base64!'}})),/signature/i);
 assert.throws(()=>verifyReviewReceiptIntegrity(input({receipt:{...receipt(),approved:true}})),/field|receipt/i);
});
