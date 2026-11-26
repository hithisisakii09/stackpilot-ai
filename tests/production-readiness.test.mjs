import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildProductionReadinessReport} from '../src/lib/production-readiness.mjs';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const policy=read('../config/operating-policy.json');
const products=read('../src/data/products.json');
const ledger=read('../src/data/comparison-evidence.json');
const claims=read('../src/data/research-claims.json');
const revocations=read('../src/data/research-source-revocations.json');
const triage=read('../src/data/editorial-triage.json');
const proposals=read('../src/data/comparison-source-proposals.json');
const captures=read('../src/data/comparison-evidence-captures.json');
const trustAnchors=read('../src/data/editorial-review-trust-anchors.json');
const receipts=read('../src/data/editorial-review-receipts.json');
const reviewHistory=read('../src/data/editorial-review-history.json');
const readyInputs={policy,products,ledger,claims,revocations,triage,proposals,captures,trustAnchors,receipts,reviewHistory,today:'2026-11-05'};

test('production report remains NO-GO with all 36 comparison claims unapproved',()=>{
 const report=buildProductionReadinessReport(readyInputs);
 assert.equal(report.status,'NO-GO');
 assert.equal(report.canPublish,false);
 assert.equal(report.canSpend,false);
 assert.equal(report.canActivateAffiliates,false);
 assert.equal(report.comparisonClaimsTotal,ledger.length);
 assert.equal(report.comparisonClaimsApproved,0);
 assert.equal(report.comparisonClaimsNeedingEvidence,ledger.length);
 assert.equal(report.remoteHostedApproval,'UNVERIFIED');
 assert.ok(report.blockers.some(x=>x.id==='editorial-evidence'));
 assert.ok(report.blockers.some(x=>x.id==='production-owner-approval'));
 assert.ok(report.blockers.some(x=>x.id==='authenticated-preview-uat'));
 assert.equal(report.blockers.every(x=>x.status==='BLOCKED'),true);
});

test('readiness report rejects tampered policy and unapproved evidence masquerading as verified',()=>{
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,policy:{...policy,productionLaunchApproved:true}}),/policy|approval|restrictive/i);
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,ledger:ledger.map((r,i)=>i===0?{...r,approved:true}:r)}),/unapproved/i);
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,ledger:ledger.slice(1)}),/incomplete/i);
});

test('production inventory shows candidate source freshness and revocation blockers',()=>{
 const report=buildProductionReadinessReport(readyInputs);
 assert.deepEqual(report.sourceRisk,{total:6,approved:0,unreviewed:6,stale:0,revoked:0});
 assert.ok(report.blockers.some(x=>x.id==='candidate-source-review'&&x.status==='BLOCKED'));
 const stale=buildProductionReadinessReport({...readyInputs,today:'2027-03-15'});
 assert.equal(stale.sourceRisk.stale,6);
 assert.equal(stale.sourceRisk.unreviewed,0);
 assert.equal(stale.status,'NO-GO');
 const item={sourceId:'hubspot-doc-claim-1',revokedOn:'2026-11-04',reason:'Vendor statement withdrawn pending documented independent review.'};
 const revoked=buildProductionReadinessReport({...readyInputs,revocations:[item]});
 assert.equal(revoked.sourceRisk.revoked,1);
 assert.equal(revoked.canPublish,false);
});

test('readiness rejects missing source inventory, invalid revocation and forged research approvals',()=>{
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,claims:undefined}),/claims|array|research/i);
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,revocations:undefined}),/revocation/i);
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,claims:claims.map((x,i)=>i===0?{...x,approved:true}:x)}),/approved/i);
});

test('production readiness includes only unapproved editorial dispositions',()=>{
 const report=buildProductionReadinessReport(readyInputs);
 assert.deepEqual(report.editorialTriage,{records:0,rejected:0,needsEvidence:36,authenticatedApprovals:0});
 assert.ok(report.blockers.some(x=>x.id==='editorial-triage'&&x.status==='BLOCKED'));
 const reject={claimId:'comparison-hubspot-vs-pipedrive-01',productId:'hubspot',decision:'rejected',reason:'The research record does not support this plan and region.',recordedOn:'2026-11-05'};
 const withReject=buildProductionReadinessReport({...readyInputs,triage:[reject]});
 assert.deepEqual(withReject.editorialTriage,{records:1,rejected:1,needsEvidence:35,authenticatedApprovals:0});
 assert.equal(withReject.status,'NO-GO');
 assert.equal(withReject.canPublish,false);
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,triage:[{...reject,decision:'approved'}]}),/unapproved|negative/i);
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,triage:undefined}),/triage/i);
});

test('source-specific candidate research proposals cannot unlock the production gate',()=>{
 const report=buildProductionReadinessReport(readyInputs);
 assert.deepEqual(report.sourceProposals,{unreviewed:0,claimsWithoutProposals:36,authenticatedApprovals:0});
 assert.ok(report.blockers.some(x=>x.id==='source-specific-review'&&x.status==='BLOCKED'));
 const proposal={
  claimId:'comparison-hubspot-vs-pipedrive-01',productId:'hubspot',
  researchLeadId:'hubspot-doc-claim-1',proposedOn:'2026-11-05',
  relevanceNote:'Unreviewed vendor page may relate to this dimension; scope not verified.',
  planScope:null,regionScope:null,status:'candidate',approved:false
 };
 const withLead=buildProductionReadinessReport({...readyInputs,proposals:[proposal]});
 assert.deepEqual(withLead.sourceProposals,{unreviewed:1,claimsWithoutProposals:35,authenticatedApprovals:0});
 assert.equal(withLead.canPublish,false);
 assert.equal(withLead.comparisonClaimsApproved,0);
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,proposals:[{...proposal,approved:true}]}),/approval/i);
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,proposals:undefined}),/array/i);
});

test('owner-controlled signing anchors and editorial receipts cannot activate via repository changes',()=>{
 const report=buildProductionReadinessReport(readyInputs);
 assert.deepEqual(report.editorialSignatureLock,{trustedKeys:0,acceptedReceipts:0,authenticatedApprovals:0,canPublish:false});
 assert.ok(report.blockers.some(x=>x.id==='authenticated-editorial-signoff'&&x.status==='BLOCKED'));
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,trustAnchors:[{fake:'key'}]}),/locked/i);
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,receipts:[{fake:'receipt'}]}),/locked/i);
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,trustAnchors:undefined}),/locked/i);
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,receipts:undefined}),/locked/i);
});

test('local history integrity remains a blocked, unauthenticated release gate',async()=>{
 const {computeReviewEventDigest}=await import('../src/lib/editorial-review-history.mjs');
 const report=buildProductionReadinessReport(readyInputs);
 assert.equal(report.reviewHistory.events,0);
 assert.equal(report.reviewHistory.localChainConsistent,true);
 assert.equal(report.reviewHistory.externallyAnchored,false);
 assert.equal(report.reviewHistory.reviewerAuthenticated,false);
 assert.equal(report.reviewHistory.authenticatedApprovals,0);
 assert.equal(report.reviewHistory.canPublish,false);
 assert.ok(report.blockers.some(b=>b.id==='independent-review-audit'&&b.status==='BLOCKED'));
 const payload={
  sequence:1,eventId:'local-review-0001',
  claimId:'comparison-hubspot-vs-pipedrive-01',productId:'hubspot',
  action:'needs-evidence',
  reason:'Vendor-specific supporting evidence has not yet been independently inspected.',
  recordedOn:'2026-11-05',previousDigest:'0'.repeat(64)
 };
 const event={...payload,digest:computeReviewEventDigest(payload)};
 const withHistory=buildProductionReadinessReport({...readyInputs,reviewHistory:[event]});
 assert.equal(withHistory.reviewHistory.events,1);
 assert.equal(withHistory.canPublish,false);
 assert.equal(withHistory.status,'NO-GO');
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,reviewHistory:[{...event,approved:true}]}),/field|unauthorized/i);
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,reviewHistory:undefined}),/array/i);
});

test('production readiness explicitly denies every editorial action without a trusted reviewer service',()=>{
 const report=buildProductionReadinessReport(readyInputs);
 assert.deepEqual(report.editorialAuthorization,{
  action:'approve-claim',decision:'DENY',
  reviewerAuthenticated:false,verifiedReviewerRole:false,
  trustedSigningAuthority:false,independentAuditAvailable:false,
  sourceVerified:false,canPublish:false,
  reason:'No independently authenticated reviewer or approval authority is configured'
 });
 assert.ok(report.blockers.some(x=>x.id==='reviewer-authorization-service'&&x.status==='BLOCKED'));
 assert.equal(report.status,'NO-GO');
 assert.equal(report.comparisonClaimsApproved,0);
});

test('claim-specific manual captures cannot unlock release or authenticate sources',async()=>{
 const {hashEvidenceExcerpt}=await import('../src/lib/comparison-evidence-captures.mjs');
 const report=buildProductionReadinessReport(readyInputs);
 assert.deepEqual(report.manualEvidenceCaptures,{
  total:0,claimsWithExcerpts:0,claimsWithoutExcerpts:36,
  approved:0,independentlyVerified:0
 });
 assert.ok(report.blockers.some(x=>x.id==='source-excerpt-verification'&&x.status==='BLOCKED'));
 const excerpt='TEST FIXTURE: a manually copied snippet, not independently retrieved or proven by the system.';
 const candidate={
  claimId:'comparison-hubspot-vs-pipedrive-01',productId:'hubspot',
  researchLeadId:'hubspot-doc-claim-1',proposedOn:'2026-11-05',
  relevanceNote:'This vendor-source proposal is synthetic for offline validation testing only.',
  planScope:null,regionScope:null,status:'candidate',approved:false
 };
 const {COMPARISON_PAIRS}=await import('../src/lib/comparison-pairs.mjs');
 const {createHash}=await import('node:crypto');
 const capture={
  captureId:'excerpt-capture-0001',claimId:candidate.claimId,
  productId:candidate.productId,researchLeadId:candidate.researchLeadId,
  sourceUrl:claims.find(x=>x.id===candidate.researchLeadId).sourceUrl,
  claimSha256:createHash('sha256').update(COMPARISON_PAIRS[0].matrix[0].firstValue).digest('hex'),
  capturedOn:'2026-11-05',planScope:null,regionScope:null,
  excerpt,excerptSha256:hashEvidenceExcerpt(excerpt),captureMethod:'manual',status:'candidate',approved:false
 };
 const withCapture=buildProductionReadinessReport({...readyInputs,proposals:[candidate],captures:[capture]});
 assert.equal(withCapture.manualEvidenceCaptures.total,1);
 assert.equal(withCapture.manualEvidenceCaptures.independentlyVerified,0);
 assert.equal(withCapture.status,'NO-GO');
 assert.equal(withCapture.canPublish,false);
 assert.equal(withCapture.comparisonClaimsApproved,0);
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,proposals:[candidate],captures:[{...capture,approved:true}]}),/approval/i);
 assert.throws(()=>buildProductionReadinessReport({...readyInputs,captures:undefined}),/array/i);
});
