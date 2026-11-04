/**
 * Build-time source identity for a *protected* Netlify PR preview.
 *
 * Only provider-supplied, public Git metadata is reflected. This is NOT a
 * signature, live access-control test, full header audit, or launch approval.
 * An unknown context must never reuse stale/current GitHub Actions metadata.
 */
const fields=['NETLIFY','CONTEXT','PULL_REQUEST','REVIEW_ID','COMMIT_REF'];
export function buildPreviewBuildIdentity(meta){
 if(!meta||typeof meta!=='object'||Array.isArray(meta)||
    Object.getPrototypeOf(meta)!==Object.prototype||
    Object.keys(meta).length!==fields.length||
    fields.some(k=>!Object.hasOwn(meta,k))||
    Object.keys(meta).some(k=>!fields.includes(k)))
  throw new Error('Invalid preview build environment metadata field set');
 const eligible=
  meta.NETLIFY==='true'&&meta.CONTEXT==='deploy-preview'&&
  meta.PULL_REQUEST==='true'&&meta.REVIEW_ID==='1'&&
  typeof meta.COMMIT_REF==='string'&&/^[a-f0-9]{40}$/.test(meta.COMMIT_REF);
 return {
  status:eligible?'PREVIEW_COMMIT_REPORTED':'UNVERIFIED_CONTEXT',
  source:eligible?'netlify-build-environment':'unavailable',
  sourceCommit:eligible?meta.COMMIT_REF:null,
  prNumber:eligible?1:null,
  authenticatedHostedUatPassed:false,
  anonymousPreviewDenialVerified:false,
  providerAccountVerified:false,
  publicReleaseAuthorized:false,
  productionPromoted:false,
  delegatedSpendINR:0
 };
}
