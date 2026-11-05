import {COMPARISON_PAIRS} from './comparison-pairs.mjs';
import {validateComparisonEvidence} from './comparison-evidence.mjs';

/**
 * Repository-only prelaunch inventory. Never grants production authorization.
 * Remote account controls, legal review and owner consent are outside CI.
 */
export function buildProductionReadinessReport({policy,products,ledger}={}){
 const expected={
  policyVersion:1,monthlyBudgetINR:0,delegatedSpendINR:0,
  hostingCandidate:'netlify-free',commercialHostingApproved:false,
  productionLaunchApproved:false,affiliateActivationApproved:false,
  paidServicesApproved:false
 };
 if(!policy||Object.entries(expected).some(([k,v])=>policy[k]!==v))
  throw new Error('Restrictive operating policy required for production readiness report');
 if(!Array.isArray(products)||products.length===0||products.some(p=>p.verified!==false||p.affiliateUrl!==null))
  throw new Error('Unverified product catalog and inactive affiliates required');
 const total=validateComparisonEvidence(ledger,COMPARISON_PAIRS,products);
 const blockers=[
  ['editorial-evidence','All comparison dimensions lack source-specific human-approved evidence'],
  ['production-owner-approval','Production publication remains locked until separate explicit owner authorization'],
  ['authenticated-preview-uat','Current SHA authenticated private-preview acceptance not established by repository CI'],
  ['hosting-commercial-review','Netlify plan, billing and commercial use require owner/provider confirmation'],
  ['legal-privacy-review','Public legal, privacy and disclosure review requires owner sign-off'],
  ['security-release-review','Final security, rollback and public release rehearsal require independent review']
 ].map(([id,reason])=>({id,reason,status:'BLOCKED',actor:'owner-or-reviewer'}));
 return {
  schemaVersion:1,status:'NO-GO',source:'repository-only',
  canPublish:false,canSpend:false,canActivateAffiliates:false,
  comparisonClaimsTotal:total,comparisonClaimsApproved:0,
  comparisonClaimsNeedingEvidence:total,
  remoteHostedApproval:'UNVERIFIED',
  blockers
 };
}
