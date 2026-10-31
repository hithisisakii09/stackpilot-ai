import { readFileSync } from 'node:fs';
import { decideAutonomousActions } from '../src/lib/autonomy-policy.mjs';
import { validateCatalog } from '../src/lib/catalog-validation.mjs';
import { buildEvidenceReviewQueue } from '../src/lib/evidence-ledger.mjs';
import { createAffiliateResearchQueue } from '../src/lib/affiliate-readiness.mjs';
import { buildOperatingBacklog } from '../src/lib/operating-backlog.mjs';
import { buildResearchClaimReviewQueue } from '../src/lib/research-claims.mjs';

const policy = JSON.parse(readFileSync(new URL('../config/operating-policy.json', import.meta.url), 'utf8'));
if (
  policy.policyVersion !== 1 ||
  policy.monthlyBudgetINR !== 0 ||
  policy.delegatedSpendINR !== 0 ||
  policy.hostingCandidate !== 'netlify-free' ||
  policy.commercialHostingApproved !== false ||
  policy.productionLaunchApproved !== false ||
  policy.affiliateActivationApproved !== false ||
  policy.paidServicesApproved !== false
) {
  throw new Error('Zero-budget operating policy mismatch: owner authorization required');
}

const products = JSON.parse(readFileSync(new URL('../src/data/products.json', import.meta.url), 'utf8'));
const evidence = JSON.parse(readFileSync(new URL('../src/data/evidence-leads.json', import.meta.url), 'utf8'));
validateCatalog(products);
const affiliateCandidates = JSON.parse(readFileSync(new URL('../src/data/affiliate-programs.json', import.meta.url), 'utf8'));
const partnerQueue = createAffiliateResearchQueue(affiliateCandidates, products);
const queue = buildEvidenceReviewQueue(evidence, products);
const agentQueue = buildOperatingBacklog({ products, evidenceLeads:evidence, affiliateCandidates, policy });
const vendorClaims = buildResearchClaimReviewQueue(JSON.parse(readFileSync(new URL('../src/data/research-claims.json', import.meta.url),'utf8')), products);
const output = decideAutonomousActions({
  // Only the CI runner may explicitly assert successful unit/build checks.
  ciPassed: process.argv.includes('--ci-passed'),
  // This CLI has no authenticated remote browser evidence: fail closed.
  browserQaPassed: false,
  vendorClaimsApproved: products.length > 0 && products.every(p => p.verified === true),
  // No authenticated approval or billing data comes from this static repository.
  privacyPolicyApproved: false,
  commercialHostingApproved: false,
  productionApproval: false,
  affiliateProgramApproved: false,
  domainsReady: false,
  budgetApproved: false,
  productCount: products.length,
  unreviewedProducts: queue.filter(p => p.editorialStatus !== 'Reviewed').length
});
const report = {
  generatedAt: new Date().toISOString(),
  source: 'repository-static-state',
  operationalStatus: 'preview-only',
  budget: {
    monthlyBudgetINR: policy.monthlyBudgetINR,
    delegatedSpendINR: policy.delegatedSpendINR,
    hostingCandidate: policy.hostingCandidate,
    commercialHostingApproved: policy.commercialHostingApproved,
    productionLaunchApproved: policy.productionLaunchApproved
  },
  automation: 'decision-support-not-unrestricted-agent-execution',
  researchBacklog: {
    execution:agentQueue.execution,
    asOf:agentQueue.asOf,
    automaticTasks:agentQueue.automatic.length,
    ownerApprovalGates:agentQueue.ownerGates.length,
    sourcesNeedingRefresh:agentQueue.metrics.sourcesNeedingRefresh,
    priorityTaskIds:agentQueue.automatic.slice(0,6).map(t=>t.id)
  },
  vendorClaimIntake: {
    sourceBackedCandidates:vendorClaims.reduce((n,p)=>n+p.candidateCount,0),
    productsAwaitingEditorialReview:vendorClaims.filter(p=>p.status==='Unreviewed').length,
    approvedClaims:0,
    independentTestingCompleted:false,
    recordsNeedingRefresh:vendorClaims.filter(p=>p.needsRefresh).length
  },
  reviewedProducts: 0,
  candidateProducts: products.length,
  pendingResearch: queue.filter(p => p.editorialStatus !== 'Reviewed').length,
  affiliatePreparation: {
    candidatePrograms:partnerQueue.filter(p=>p.researchStatus==='candidate').length,
    discoveryGaps:partnerQueue.filter(p=>p.researchStatus==='program-discovery-needed').length,
    applicationsSubmitted:0,
    programsAccepted:0,
    trackingLinksEnabled:0,
    verifiedEarnings:null,
    nextResearchActions:partnerQueue.map(p=>({productId:p.productId,action:p.nextAction}))
  },
  ...output
};
if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} else {
  console.log('StackPilot AI — autonomous operating decision report');
  console.log('Mode:', report.mode, '| Public launch ready:', report.canPublish,
    '| Affiliate revenue ready:', report.canMonetize, '| Spend allowed:', report.canSpend);
  console.log('Blockers:', report.blockers.join(', '));
  for (const item of report.tasks) console.log('-', item.autonomy.toUpperCase(), item.action, '—', item.reason);
  console.log('No production changes, affiliate activation, legal approvals or spending occur in this command.');
}
