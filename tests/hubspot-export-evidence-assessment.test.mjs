import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {COMPARISON_PAIRS} from '../src/lib/comparison-pairs.mjs';
import {hashEvidenceExcerpt} from '../src/lib/comparison-evidence-captures.mjs';
import {buildHubspotExportAssessment} from '../src/lib/hubspot-export-evidence-assessment.mjs';

const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const researchClaims=read('../src/data/research-claims.json');
const base={
 claimId:'comparison-hubspot-vs-pipedrive-05',productId:'hubspot',
 products:read('../src/data/products.json'),
 ledger:read('../src/data/comparison-evidence.json'),
 triage:read('../src/data/editorial-triage.json'),
 researchClaims,
 revocations:read('../src/data/research-source-revocations.json'),
 proposals:read('../src/data/comparison-source-proposals.json'),
 captures:read('../src/data/comparison-evidence-captures.json'),
 pairs:COMPARISON_PAIRS,today:'2026-11-05'
};
const expectedAssertion='CSV export for deals, contacts, companies; API data sync';
const build=(overrides={})=>buildHubspotExportAssessment({...base,...overrides});
const proposal={
 claimId:base.claimId,productId:base.productId,researchLeadId:'hubspot-doc-claim-1',
 proposedOn:'2026-11-05',
 relevanceNote:'Offline synthetic test proposal for the four independent HubSpot export questions.',
 planScope:null,regionScope:null,status:'candidate',approved:false
};
const excerpt='SYNTHETIC TEST TEXT ONLY: this is not copied from a vendor and proves no features.';
const capture={
 captureId:'excerpt-capture-0001',claimId:proposal.claimId,
 productId:proposal.productId,researchLeadId:proposal.researchLeadId,
 sourceUrl:researchClaims.find(x=>x.id===proposal.researchLeadId).sourceUrl,
 claimSha256:createHash('sha256').update(expectedAssertion).digest('hex'),
 capturedOn:'2026-11-05',planScope:null,regionScope:null,
 excerpt,excerptSha256:hashEvidenceExcerpt(excerpt),
 captureMethod:'manual',status:'candidate',approved:false
};

test('four independent HubSpot export predicates remain unverified and unassigned',()=>{
 const report=build();
 assert.equal(report.status,'PRIVATE-ATOMIC-NEEDS-EVIDENCE');
 assert.equal(report.claimId,base.claimId);
 assert.equal(report.productId,base.productId);
 assert.equal(report.candidateAssertion,expectedAssertion);
 assert.equal(report.stage,'needs-source-proposal');
 assert.equal(report.requiredPredicateCount,4);
 assert.deepEqual(report.predicateIds,[
  'deals-csv-export','contacts-csv-export','companies-csv-export','api-data-sync'
 ]);
 assert.deepEqual(report.unassignedResearchLeadIds,[]);
 assert.deepEqual(report.unassignedCaptureIds,[]);
 assert.equal(report.independentlyVerifiedPredicates,0);
 assert.equal(report.authenticatedApprovals,0);
 assert.equal(report.approved,false);
 assert.equal(report.canPublish,false);
 for(const predicate of report.predicates){
  assert.equal(predicate.status,'NEEDS-EVIDENCE');
  assert.equal(predicate.claimId,base.claimId);
  assert.equal(predicate.productId,'hubspot');
  assert.equal(predicate.manuallySelectedSourceId,null);
  assert.equal(predicate.manuallyAssignedCaptureId,null);
  assert.equal(predicate.independentlyVerified,false);
  assert.equal(predicate.sourceVerified,false);
  assert.equal(predicate.supportsPredicateVerified,false);
  assert.equal(predicate.eligibleForPublication,false);
  assert.equal(predicate.reviewerAuthenticated,false);
  assert.ok(predicate.questions.some(q=>/plan|permission|scope|region|account/i.test(q)));
  assert.ok(predicate.questions.some(q=>/source|document|quotation|excerpt|URL/i.test(q)));
 }
 assert.ok(report.predicates[3].questions.some(q=>/API|sync/i.test(q)));
 assert.ok(report.predicates[3].questions.some(q=>/endpoint|automation|continuous/i.test(q)));
 assert.ok(report.predicates.slice(0,3).every(x=>x.questions.some(q=>/CSV/i.test(q))));
 assert.deepEqual(report,build());
});

test('a candidate vendor documentation lead is never deemed evidence for any predicate',()=>{
 const report=build();
 assert.equal(report.vendorLeads.length,1);
 assert.equal(report.vendorLeads[0].researchLeadId,'hubspot-doc-claim-1');
 assert.equal(report.vendorLeads[0].sourceVerified,false);
 assert.equal(report.vendorLeads[0].proposedForClaim,false);
 assert.equal(report.vendorLeads[0].eligibleForPublication,false);
 assert.equal(report.predicates.every(x=>x.manuallySelectedSourceId===null),true);
});

test('synthetic proposed source and matching snippet still leave ALL four predicates needing evidence',()=>{
 const inputs={proposals:[proposal],captures:[capture]};
 const before=structuredClone(inputs);
 const report=build(inputs);
 assert.equal(report.stage,'needs-independent-verification');
 assert.deepEqual(report.unassignedResearchLeadIds,[proposal.researchLeadId]);
 assert.deepEqual(report.unassignedCaptureIds,[capture.captureId]);
 assert.equal(report.vendorLeads[0].proposedForClaim,true);
 assert.equal(report.vendorLeads[0].sourceVerified,false);
 assert.equal(report.independentlyVerifiedPredicates,0);
 assert.equal(report.predicates.filter(x=>x.status==='NEEDS-EVIDENCE').length,4);
 assert.equal(report.predicates.every(x=>!x.supportsPredicateVerified),true);
 assert.equal(report.canPublish,false);
 assert.equal(JSON.stringify(report).includes(excerpt),false);
 assert.deepEqual(inputs,before);
});

test('revoked and stale source leads are visible but never eligible to satisfy predicates',()=>{
 const revoked={sourceId:proposal.researchLeadId,revokedOn:'2026-11-04',
  reason:'Synthetic candidate source revoked for subsequent independent checking.'};
 const report=build({proposals:[proposal],captures:[capture],revocations:[revoked]});
 assert.equal(report.stage,'source-refresh-needed');
 assert.equal(report.vendorLeads[0].risk,'revoked');
 assert.equal(report.predicates.every(x=>x.status==='NEEDS-EVIDENCE'),true);
 const stale=build({proposals:[proposal],captures:[capture],today:'2027-03-15'});
 assert.equal(stale.vendorLeads[0].risk,'stale');
 assert.equal(stale.stage,'source-refresh-needed');
 assert.equal(stale.approved,false);
});

test('wrong claim/vendor, changed raw assertion and invalid evidence registers fail closed',()=>{
 for(const changes of [
  {claimId:'comparison-hubspot-vs-pipedrive-04'},
  {productId:'pipedrive'},
  {productId:'ahrefs'},
  {claimId:null},
  {approved:true},
  {sourceVerified:true},
  {canPublish:true},
  {proposals:[{...proposal,approved:true}]},
  {captures:[capture]},
  {captures:null},
  {ledger:base.ledger.slice(1)}
 ])assert.throws(()=>build(changes));
 const edited=base.pairs.map(pair=>({...pair,matrix:pair.matrix.map((row,i)=>({
  ...row,firstValue:pair.slug==='hubspot-vs-pipedrive'&&i===4?
    row.firstValue+' (edited)':row.firstValue
 }))}));
 assert.throws(()=>build({pairs:edited}),/assertion|changed|checklist|drift/i);
});

test('CLI summary omits raw candidate research while --json outputs private assessment only',()=>{
 const path=new URL('../scripts/hubspot-export-evidence-assessment.mjs',import.meta.url).pathname;
 const run=(...args)=>spawnSync(process.execPath,[path,...args],{encoding:'utf8'});
 const summary=run();
 assert.equal(summary.status,0,summary.stderr);
 assert.match(summary.stdout,/PRIVATE|UNVERIFIED/);
 assert.match(summary.stdout,/deals-csv-export/);
 assert.match(summary.stdout,/api-data-sync/);
 assert.equal(summary.stdout.includes(expectedAssertion),false);
 const detailed=run('--json');
 assert.equal(detailed.status,0,detailed.stderr);
 const result=JSON.parse(detailed.stdout);
 assert.equal(result.candidateAssertion,expectedAssertion);
 assert.equal(result.approved,false);
 assert.equal(result.canPublish,false);
 assert.equal(result.predicates.length,4);
 for(const flags of [['--approve'],['--json','--json'],['--publish'],['--claim','different']]){
  const invalid=run(...flags);
  assert.notEqual(invalid.status,0);
  assert.equal(invalid.stdout.includes(expectedAssertion),false);
 }
});

test('the source and CLI are never imported by public pages',()=>{
 for(const path of ['../src/pages/compare/index.astro','../src/pages/compare/[slug].astro']){
  const code=readFileSync(new URL(path,import.meta.url),'utf8');
  assert.doesNotMatch(code,/hubspot-export-evidence-assessment|buildHubspotExportAssessment/);
 }
});
