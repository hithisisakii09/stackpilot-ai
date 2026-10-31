/**
 * Truthful preapplication readiness inventory. No third-party actions, secrets,
 * identity validation, contract approvals, traffic claims or revenue forecasts.
 * This module can NEVER mark a publisher application ready or active.
 */
import { validateAffiliateCandidates } from './affiliate-readiness.mjs';

const gateDescriptions=[
 ['publisher-identity','Provide truthful publisher/operator name and who is legally responsible'],
 ['contact-channel','Verify a working business email or contact channel outside the repository'],
 ['jurisdiction','Confirm relevant operator country/jurisdiction and required legal notices'],
 ['publisher-channel','Demonstrate a genuine eligible website or professional social channel under owner control'],
 ['commercial-hosting-review','Confirm hosting provider plan and applicable commercial terms with account owner'],
 ['editorial-signoff','Obtain human editorial review of source-backed product claims and limitations'],
 ['legal-privacy-review','Approve accurate privacy, disclosures and applicable terms before any public launch'],
 ['authentic-audience-proof','Provide real audience statistics or other channel evidence without invention'],
 ['affiliate-application-consent','Owner must authorize and personally verify each actual partner application'],
 ['tax-payout-kyc','Owner completes platform-specific tax, payout and identity checks privately'],
 ['production-release','Owner must separately authorize domain, public publication and indexing']
];
function assertPolicy(policy){
 if(!policy || policy.policyVersion!==1 || policy.monthlyBudgetINR!==0 ||
    policy.delegatedSpendINR!==0 || policy.hostingCandidate!=='netlify-free' ||
    policy.commercialHostingApproved!==false || policy.productionLaunchApproved!==false ||
    policy.affiliateActivationApproved!==false || policy.paidServicesApproved!==false) {
  throw new Error('Publisher report requires restrictive zero-budget authorization policy');
 }
}
export function buildPublisherReadiness({policy,products,affiliateCandidates}={}){
 assertPolicy(policy);
 if(!Array.isArray(products) || !products.length)
  throw new Error('Missing publisher product catalog');
 const ids=new Set();
 for(const item of products){
  if(!item || typeof item.id!=='string'||ids.has(item.id))
   throw new Error('Duplicate or missing product record');
  ids.add(item.id);
  if(item.verified!==false || item.researchStatus==='verified')
   throw new Error('Product editorial verification not authenticated');
  if(item.affiliateUrl!==null)
   throw new Error('Affiliate link activation cannot be asserted');
 }
 const count=validateAffiliateCandidates(affiliateCandidates,products);
 if(count!==products.length || products.some(item=>!affiliateCandidates.some(x=>x.productId===item.id)))
  throw new Error('Missing affiliate candidate for a catalog product');

 const programCandidates=affiliateCandidates.map(c=>({
  productId:c.productId,
  sourceStatus:c.researchStatus==='candidate'?'official-program-candidate':'official-program-unconfirmed',
  officialSourceUrl:c.programUrl,
  applicationStatus:'not-applied',
  approved:false,
  affiliateLinkActive:false,
  nextResearchAction:c.nextResearchAction
 })).sort((a,b)=>a.productId.localeCompare(b.productId,'en'));
 const ownerGates=gateDescriptions.map(([id,reason])=>({
  id,reason,actor:'owner',status:'unverified',sensitiveValuesStored:false
 }));
 return {
  schemaVersion:1,
  status:'prelaunch-owner-evidence-required',
  source:'repository-only-readiness-inventory',
  applicationReady:false,
  canPublish:false,canActivateAffiliates:false,canSpend:false,
  actualTraffic:null,actualEarnings:null,
  publisherIdentityVerified:false,audienceVerified:false,
  editorialClaimsApproved:0,
  programApplicationsSubmitted:0,programsAccepted:0,trackingLinksEnabled:0,
  ownerGates, programCandidates
 };
}
