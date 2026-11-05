import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {COMPARISON_PAIRS} from '../src/lib/comparison-pairs.mjs';
import {buildClaimResearchStarter} from '../src/lib/claim-research-starter.mjs';
import {validateComparisonSourceProposals} from '../src/lib/comparison-review-packets.mjs';

const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const products=read('../src/data/products.json');
const ledger=read('../src/data/comparison-evidence.json');
const triage=read('../src/data/editorial-triage.json');
const researchClaims=read('../src/data/research-claims.json');
const revocations=read('../src/data/research-source-revocations.json');
const proposals=read('../src/data/comparison-source-proposals.json');
const captures=read('../src/data/comparison-evidence-captures.json');
const base={ledger,products,triage,researchClaims,revocations,proposals,captures,pairs:COMPARISON_PAIRS,today:'2026-11-05'};
const id='comparison-hubspot-vs-pipedrive-01',vendor='hubspot';
const build=(overrides={})=>buildClaimResearchStarter({...base,claimId:id,productId:vendor,...overrides});
const lead='hubspot-doc-claim-1';
const proposed={
 claimId:id,productId:vendor,researchLeadId:lead,proposedOn:'2026-11-05',
 relevanceNote:'Test candidate only: independently inspect this vendor document for the exact claim.',
 planScope:null,regionScope:null,status:'candidate',approved:false
};

test('starter identifies exact private claim, with no attached or approved source',()=>{
 const result=build();
 assert.equal(result.status,'PRIVATE-UNVERIFIED-STARTER');
 assert.equal(result.claimId,id);
 assert.equal(result.productId,vendor);
 assert.equal(result.productName,'HubSpot');
 assert.equal(result.stage,'needs-source-proposal');
 assert.equal(result.evidenceStatus,'UNVERIFIED');
 assert.equal(result.approved,false);
 assert.equal(result.sourceVerified,false);
 assert.equal(result.canPublish,false);
 assert.equal(result.authenticatedApprovals,0);
 assert.equal(result.sourceInspectedBySystem,false);
 assert.match(result.reviewQuestion,/verify/i);
 assert.equal(result.candidateAssertion,COMPARISON_PAIRS[0].matrix[0].firstValue);
 assert.equal(result.candidateAssertion.includes('UNVERIFIED'),false);
 assert.deepEqual(result.existingProposedLeadIds,[]);
 assert.deepEqual(result.existingManualCaptureIds,[]);
 assert.equal(result.vendorLeads.length,1);
 const source=result.vendorLeads[0];
 assert.equal(source.researchLeadId,lead);
 assert.equal(source.sourceUrl,researchClaims.find(x=>x.id===lead).sourceUrl);
 assert.equal(source.risk,'unreviewed');
 assert.equal(source.proposedForClaim,false);
 assert.equal(source.sourceVerified,false);
 assert.equal(source.eligibleForPublication,false);
 assert.equal(result.vendorLeads.some(x=>x.researchLeadId.startsWith('pipedrive')),false);
 assert.deepEqual(result.proposalTemplate,{
  claimId:id,productId:vendor,researchLeadId:null,proposedOn:null,
  relevanceNote:null,planScope:null,regionScope:null
 });
 assert.deepEqual(result.captureTemplates,[]);
 assert.throws(()=>validateComparisonSourceProposals({...base,proposals:[result.proposalTemplate]}));
 assert.deepEqual(result,build());
});

test('all 36 claim/vendor cells are selectable without cross-vendor leads',()=>{
 const ids=[];
 for(const pair of COMPARISON_PAIRS){
  pair.matrix.forEach((_,i)=>{
   const claimId='comparison-'+pair.slug+'-'+String(i+1).padStart(2,'0');
   for(const productId of [pair.firstId,pair.secondId]){
    const result=build({claimId,productId});
    ids.push(result.claimId+':'+result.productId);
    assert.equal(result.vendorLeads.every(x=>researchClaims.find(c=>c.id===x.researchLeadId).productId===productId),true);
    assert.equal(result.approved,false);
    assert.equal(result.canPublish,false);
   }
  });
 }
 assert.equal(ids.length,36);
 assert.equal(new Set(ids).size,36);
});

test('manual candidate source association is shown as proposed, not verified',()=>{
 const result=build({proposals:[proposed]});
 assert.equal(result.stage,'needs-manual-capture');
 assert.deepEqual(result.existingProposedLeadIds,[lead]);
 assert.equal(result.vendorLeads[0].proposedForClaim,true);
 assert.equal(result.vendorLeads[0].sourceVerified,false);
 assert.equal(result.approved,false);
 assert.deepEqual(result.captureTemplates,[{
  captureId:null,claimId:id,productId:vendor,researchLeadId:lead,
  capturedOn:null,excerpt:null
 }]);
 assert.equal(result.captureTemplates[0].excerpt,null);
 assert.equal(result.canPublish,false);
});

test('revoked and stale leads require refresh, and do not unlock anything',()=>{
 const revoked={sourceId:lead,revokedOn:'2026-11-04',
  reason:'This candidate document reference is withdrawn for private research verification.'};
 const r=build({proposals:[proposed],revocations:[revoked]});
 assert.equal(r.vendorLeads[0].risk,'revoked');
 assert.equal(r.stage,'source-refresh-needed');
 assert.equal(r.vendorLeads[0].eligibleForPublication,false);
 const stale=build({proposals:[proposed],today:'2027-03-15'});
 assert.equal(stale.vendorLeads[0].risk,'stale');
 assert.equal(stale.stage,'source-refresh-needed');
 assert.equal(stale.approved,false);
});

test('unknown vendor, mismatched claim, and malformed research fail closed',()=>{
 for(const value of [
  {claimId:'comparison-not-a-claim-01'},
  {productId:'wrong-vendor'},
  {productId:'pipedrive'},
  {claimId:null},
  {claimId:'comparison-hubspot-vs-pipedrive-01',productId:null},
  {proposals:[{...proposed,approved:true}]},
  {captures:null},
  {ledger:ledger.slice(1)},
  {today:'2026-02-30'}
 ]){
  assert.throws(()=>build(value));
 }
 assert.throws(()=>buildClaimResearchStarter({...base,claimId:id}),/vendor|product/i);
});

test('private CLI shows safe default, explicit --json full report, invalid flags denied',()=>{
 const cli=new URL('../scripts/claim-research-starter.mjs',import.meta.url).pathname;
 const exec=(...args)=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
 const args=['--claim',id,'--vendor',vendor];
 const safe=exec(...args);
 assert.equal(safe.status,0,safe.stderr);
 assert.match(safe.stdout,/PRIVATE|UNVERIFIED/i);
 assert.match(safe.stdout,/hubspot-doc-claim-1/);
 assert.equal(safe.stdout.includes(COMPARISON_PAIRS[0].matrix[0].firstValue),false);
 const detailed=exec(...args,'--json');
 assert.equal(detailed.status,0,detailed.stderr);
 const output=JSON.parse(detailed.stdout);
 assert.equal(output.candidateAssertion,COMPARISON_PAIRS[0].matrix[0].firstValue);
 assert.equal(output.canPublish,false);
 assert.equal(output.proposalTemplate.researchLeadId,null);
 for(const invalid of [
  ['--claim',id],['--vendor',vendor],
  [...args,'--approve'],[...args,'--json','--json'],
  ['--claim','comparison-not-a-claim-01','--vendor',vendor,'--json']
 ]){
  const res=exec(...invalid);
  assert.notEqual(res.status,0);
  assert.equal(res.stdout.includes(COMPARISON_PAIRS[0].matrix[0].firstValue),false);
 }
});

test('private starter is never imported by Astro comparison or index routes',()=>{
 for(const path of ['../src/pages/compare/index.astro','../src/pages/compare/[slug].astro']){
  const source=readFileSync(new URL(path,import.meta.url),'utf8');
  assert.doesNotMatch(source,/claim-research-starter|buildClaimResearchStarter/);
 }
});
