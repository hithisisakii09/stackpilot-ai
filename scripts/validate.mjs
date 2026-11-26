import { readFileSync } from 'node:fs';
import { validateCatalog } from '../src/lib/catalog-validation.mjs';
import { validateEvidenceLeads } from '../src/lib/evidence-ledger.mjs';
import { validateAffiliateCandidates } from '../src/lib/affiliate-readiness.mjs';
import { validateResearchClaims } from '../src/lib/research-claims.mjs';
import { buildCandidateSourceRiskReport } from '../src/lib/candidate-source-risk.mjs';
import { validateEditorialTriage } from '../src/lib/editorial-triage.mjs';
import { COMPARISON_PAIRS } from '../src/lib/comparison-pairs.mjs';
import { validateComparisonSourceProposals } from '../src/lib/comparison-review-packets.mjs';
import { validateComparisonEvidenceCaptures } from '../src/lib/comparison-evidence-captures.mjs';
import { assertEditorialReceiptsLocked } from '../src/lib/editorial-receipt-integrity.mjs';
import { validateEditorialReviewHistory } from '../src/lib/editorial-review-history.mjs';
import { auditCurrentEditorialRuntimeSurface } from './editorial-runtime-source.mjs';
import { auditCurrentPrivateResearchMaterials } from './private-research-material-guard.mjs';
import { EDITORIAL_ACTIONS,evaluateEditorialAuthorization } from '../src/lib/editorial-authorization.mjs';

const products = JSON.parse(readFileSync(new URL('../src/data/products.json', import.meta.url), 'utf8'));
const count = validateCatalog(products);
console.log(`Validated ${count} products; unapproved affiliate links remain prohibited`);
const leads = JSON.parse(readFileSync(new URL('../src/data/evidence-leads.json', import.meta.url), 'utf8'));
console.log(`Validated ${validateEvidenceLeads(leads, products)} unreviewed source leads; approval remains disabled`);
const programs = JSON.parse(readFileSync(new URL('../src/data/affiliate-programs.json', import.meta.url), 'utf8'));
console.log(`Validated ${validateAffiliateCandidates(programs, products)} candidate partner records; no applications or tracking authorized`);
const claimCandidates = JSON.parse(readFileSync(new URL('../src/data/research-claims.json', import.meta.url), 'utf8'));
console.log(`Validated ${validateResearchClaims(claimCandidates, products)} vendor-source statements as unapproved research candidates`);

const revocations = JSON.parse(readFileSync(new URL('../src/data/research-source-revocations.json', import.meta.url), 'utf8'));
const risk = buildCandidateSourceRiskReport({ claims: claimCandidates, products, revocations });
console.log(`Validated ${risk.totalSources} unapproved research sources; ${risk.staleSources} stale; ${risk.revokedSources} revoked`);

const comparisons=JSON.parse(readFileSync(new URL('../src/data/comparison-evidence.json',import.meta.url),'utf8'));
const triage=JSON.parse(readFileSync(new URL('../src/data/editorial-triage.json',import.meta.url),'utf8'));
console.log(`Validated ${validateEditorialTriage(triage,comparisons,COMPARISON_PAIRS,products)} negative-only editorial triage records; approval disabled`);

const proposals=JSON.parse(readFileSync(new URL('../src/data/comparison-source-proposals.json',import.meta.url),'utf8'));
console.log(`Validated ${validateComparisonSourceProposals({proposals,ledger:comparisons,triage,researchClaims:claimCandidates,revocations,products,pairs:COMPARISON_PAIRS})} unapproved source-specific comparison research proposals`);

const manualCaptures=JSON.parse(readFileSync(new URL('../src/data/comparison-evidence-captures.json',import.meta.url),'utf8'));
console.log(`Validated ${validateComparisonEvidenceCaptures({captures:manualCaptures,proposals,ledger:comparisons,triage,researchClaims:claimCandidates,revocations,products,pairs:COMPARISON_PAIRS})} unverified manual evidence excerpts; source authentication and approval disabled`);

const trustAnchors=JSON.parse(readFileSync(new URL('../src/data/editorial-review-trust-anchors.json',import.meta.url),'utf8'));
const reviewReceipts=JSON.parse(readFileSync(new URL('../src/data/editorial-review-receipts.json',import.meta.url),'utf8'));
const signing=assertEditorialReceiptsLocked(trustAnchors,reviewReceipts);
console.log(`Locked editorial signing: ${signing.trustedKeys} trusted keys, ${signing.acceptedReceipts} signed receipts, ${signing.authenticatedApprovals} authenticated approvals`);

const reviewHistory=JSON.parse(readFileSync(new URL('../src/data/editorial-review-history.json',import.meta.url),'utf8'));
const localHistory=validateEditorialReviewHistory({history:reviewHistory,ledger:comparisons,pairs:COMPARISON_PAIRS,products});
console.log(`Validated ${localHistory.events} local negative-only editorial history events; externally anchored: ${localHistory.externallyAnchored}; reviewer authenticated: ${localHistory.reviewerAuthenticated}`);

const runtimeSurface=auditCurrentEditorialRuntimeSurface();
if(runtimeSurface.violations.length){
 for(const issue of runtimeSurface.violations)console.error('Editorial runtime blocker:',issue);
 throw new Error('Static-only editorial source authorization boundary violated');
}
for(const action of EDITORIAL_ACTIONS){
 if(evaluateEditorialAuthorization({action,policy:JSON.parse(readFileSync(new URL('../config/operating-policy.json',import.meta.url),'utf8'))}).decision!=='DENY')
  throw new Error('Unsafe editorial authorization: '+action);
}
console.log(`Validated static-only source: ${runtimeSurface.checkedPaths} paths; ${EDITORIAL_ACTIONS.length} editorial actions denied; no reviewer API or publisher`);

const privateGitMaterials=auditCurrentPrivateResearchMaterials();
console.log(`Validated private research Git materials: ${privateGitMaterials.checkedPaths} tracked paths, ${privateGitMaterials.protectedIgnorePatterns} protected ignore patterns; no local source copies in Git`);
