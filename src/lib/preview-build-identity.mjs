/**
 * Build-time source identity for a *protected* Netlify PR deploy-preview.
 *
 * Only provider-supplied, public Git metadata is reflected. This is NOT a
 * signature, live access-control test, full header audit, or launch approval.
 * An unknown context must never reuse stale/current GitHub Actions metadata.
 *
 * REVIEW_ID is the Netlify-documented variable set to the actual GitHub PR
 * number (e.g. '7') during a deploy-preview build. Any positive integer is
 * accepted; the parsed integer is returned as prNumber. This is public
 * information — no secrets are involved.
 */
const fields=['NETLIFY','CONTEXT','PULL_REQUEST','REVIEW_ID','COMMIT_REF'];
const positiveInt=/^[1-9][0-9]*$/;
const hexSha40=/^[a-f0-9]{40}$/;
export function buildPreviewBuildIdentity(meta){
 if(!meta||typeof meta!=='object'||Array.isArray(meta)||
    Object.getPrototypeOf(meta)!==Object.prototype||
    Object.keys(meta).length!==fields.length||
    fields.some(k=>!Object.hasOwn(meta,k))||
    Object.keys(meta).some(k=>!fields.includes(k)))
  throw new Error('Invalid preview build environment metadata field set');
 const eligible=
  meta.NETLIFY==='true'&&meta.CONTEXT==='deploy-preview'&&
  meta.PULL_REQUEST==='true'&&
  typeof meta.REVIEW_ID==='string'&&positiveInt.test(meta.REVIEW_ID)&&
  typeof meta.COMMIT_REF==='string'&&hexSha40.test(meta.COMMIT_REF);
 return {
  status:eligible?'PREVIEW_COMMIT_REPORTED':'UNVERIFIED_CONTEXT',
  source:eligible?'netlify-build-environment':'unavailable',
  sourceCommit:eligible?meta.COMMIT_REF:null,
  prNumber:eligible?Number(meta.REVIEW_ID):null,
  authenticatedHostedUatPassed:false,
  anonymousPreviewDenialVerified:false,
  providerAccountVerified:false,
  publicReleaseAuthorized:false,
  productionPromoted:false,
  delegatedSpendINR:0
 };
}
