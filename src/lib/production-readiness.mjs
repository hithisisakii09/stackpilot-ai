import {COMPARISON_PAIRS} from './comparison-pairs.mjs';
import {validateComparisonEvidence} from './comparison-evidence.mjs';
import {buildCandidateSourceRiskReport} from './candidate-source-risk.mjs';
import {buildEditorialTriageQueue} from './editorial-triage.mjs';
import {buildComparisonReviewPackets} from './comparison-review-packets.mjs';
import {assertEditorialReceiptsLocked} from './editorial-receipt-integrity.mjs';

/**
 * Repository-only prelaunch inventory. Never grants production authorization.
 * Remote account controls, legal review and owner consent are outside CI.
 */
export function buildProductionReadinessReport({policy,products,ledger,claims,revocations,triage,proposals,trustAnchors,receipts,today=new Date().toISOString().slice(0,10)}={}){
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
 const total=validateComparisonEvidence(ledger,COMPARISON_PAIRS,products,{today});
 const sourceReport=buildCandidateSourceRiskReport({claims,products,revocations,today});
 const sourceRisk={total:sourceReport.totalSources,approved:sourceReport.approvedSources,
  unreviewed:sourceReport.unreviewedSources,stale:sourceReport.staleSources,
  revoked:sourceReport.revokedSources};
 const dispositions=buildEditorialTriageQueue(triage,ledger,COMPARISON_PAIRS,products,{today});
 const rejected=dispositions.filter(x=>x.triageDecision==='rejected').length;
 const editorialTriage={records:triage.length,rejected,needsEvidence:dispositions.length-rejected,authenticatedApprovals:0};
 const reviewPackets=buildComparisonReviewPackets({proposals,ledger,triage,researchClaims:claims,revocations,products,pairs:COMPARISON_PAIRS,today});
 const sourceProposals={unreviewed:reviewPackets.proposedSources,claimsWithoutProposals:reviewPackets.claimsWithoutProposals,authenticatedApprovals:0};
 const editorialSignatureLock=assertEditorialReceiptsLocked(trustAnchors,receipts);
 const blockers=[
  ['editorial-evidence','All comparison dimensions lack source-specific human-approved evidence'],
  ['authenticated-editorial-signoff','No owner-pinned signing keys, authenticated reviewer session, or trusted approval audit trail has been provisioned'],
  ['editorial-triage','Offline dispositions are unauthenticated and cannot approve or publish vendor assertions'],
  ['source-specific-review','Research proposals, even when scoped to a claim, are not verified evidence or authenticated human approval'],
  ['candidate-source-review',
   sourceRisk.total+' vendor documentation leads need editorial review: '+
   sourceRisk.unreviewed+' unreviewed, '+sourceRisk.stale+' stale, '+sourceRisk.revoked+' revoked'],
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
  sourceRisk,editorialTriage,sourceProposals,editorialSignatureLock,
  remoteHostedApproval:'UNVERIFIED',
  blockers
 };
}
