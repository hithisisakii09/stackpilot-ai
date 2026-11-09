import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {COMPARISON_PAIRS} from '../src/lib/comparison-pairs.mjs';
import {
 prepareManualSourceProposal,prepareManualEvidenceCapture
} from '../src/lib/manual-research-intake.mjs';
import {
 validateComparisonSourceProposals
} from '../src/lib/comparison-review-packets.mjs';
import {
 validateComparisonEvidenceCaptures,hashEvidenceExcerpt
} from '../src/lib/comparison-evidence-captures.mjs';

const load=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const products=load('../src/data/products.json');
const researchClaims=load('../src/data/research-claims.json');
const revocations=load('../src/data/research-source-revocations.json');
const ledger=load('../src/data/comparison-evidence.json');
const triage=load('../src/data/editorial-triage.json');
const proposals=load('../src/data/comparison-source-proposals.json');
const captures=load('../src/data/comparison-evidence-captures.json');
const today='2026-11-05';
const inputs={products,researchClaims,revocations,ledger,triage,proposals,captures,pairs:COMPARISON_PAIRS,today};
const proposalInput={
 claimId:'comparison-hubspot-vs-pipedrive-01',
 productId:'hubspot',
 researchLeadId:'hubspot-doc-claim-1',
 proposedOn:today,
 relevanceNote:'Human candidate note: this source might concern export capacity; confirm exact relevance.',
 planScope:null,regionScope:null
};
const excerpt='TEST DATA ONLY: a short user-supplied manual excerpt for local integrity checks, not an actual vendor quote.';
const captureInput={
 captureId:'excerpt-capture-0001',
 claimId:proposalInput.claimId,
 productId:proposalInput.productId,
 researchLeadId:proposalInput.researchLeadId,
 capturedOn:today,excerpt
};
const prepared=()=>prepareManualSourceProposal(proposalInput,inputs);
const recordedProposal=()=>prepared().record;
const captured=(overrides={})=>prepareManualEvidenceCapture(captureInput,{
 ...inputs,proposals:[recordedProposal()],...overrides
});

test('manual proposal formatter emits validated unapproved candidate without fetching source',()=>{
 const before=structuredClone(proposalInput);
 const result=prepared();
 assert.deepEqual(result.record,{
  ...proposalInput,status:'candidate',approved:false
 });
 assert.equal(result.status,'DRAFT-UNVERIFIED');
 assert.equal(result.record.approved,false);
 assert.equal(result.sourceInspected,false);
 assert.equal(result.sourceVerified,false);
 assert.equal(result.eligibleForPublication,false);
 assert.equal(result.sourceLeadId,proposalInput.researchLeadId);
 assert.equal(result.candidateSourceUrl,researchClaims[0].sourceUrl);
 assert.equal(validateComparisonSourceProposals({...inputs,proposals:[result.record]}),1);
 assert.deepEqual(proposalInput,before);
 assert.deepEqual(result,prepared());
 assert.deepEqual(proposals,[]);
});

test('manual proposal rejects invented notes, changed vendor IDs, role and authorization claims',()=>{
 const invalid=[
  {...proposalInput,claimId:'comparison-no-such-vendor-01'},
  {...proposalInput,productId:'pipedrive'},
  {...proposalInput,researchLeadId:'pipedrive-doc-claim-1'},
  {...proposalInput,researchLeadId:'untrusted-vendor'},
  {...proposalInput,proposedOn:'2026-11-06'},
  {...proposalInput,proposedOn:'2026-02-30'},
  {...proposalInput,relevanceNote:'short'},
  {...proposalInput,relevanceNote:'<script>pretend proof</script>'},
  {...proposalInput,relevanceNote:'Unsupported\nmultiline description'},
  {...proposalInput,sourceUrl:'https://evil.invalid/proof'},
  {...proposalInput,approved:true},
  {...proposalInput,status:'verified'},
  {...proposalInput,reviewer:'fake reviewer'},
  {...proposalInput,signature:'fake'},
  {...proposalInput,planScope:42}
 ];
 for(const input of invalid)
  assert.throws(()=>prepareManualSourceProposal(input,inputs));
 assert.throws(()=>prepareManualSourceProposal(proposalInput,{...inputs,proposals:[recordedProposal()]}),/duplicate/i);
 assert.throws(()=>prepareManualSourceProposal(proposalInput,{...inputs,ledger:ledger.slice(1)}),/incomplete/i);
 assert.throws(()=>prepareManualSourceProposal(proposalInput,{...inputs,today:'2026-02-30'}),/date/i);
});

test('manual capture requires a recorded proposal and derives both exact SHA256 digests',()=>{
 const result=captured();
 assert.equal(result.status,'DRAFT-UNVERIFIED');
 assert.equal(result.sourceInspectedBySystem,false);
 assert.equal(result.sourceVerified,false);
 assert.equal(result.independentlyVerified,false);
 assert.equal(result.canPublish,false);
 assert.deepEqual(result.record,{
  ...captureInput,
  sourceUrl:researchClaims[0].sourceUrl,
  claimSha256:createHash('sha256').update(COMPARISON_PAIRS[0].matrix[0].firstValue,'utf8').digest('hex'),
  planScope:null,regionScope:null,
  excerptSha256:hashEvidenceExcerpt(excerpt),
  captureMethod:'manual',status:'candidate',approved:false
 });
 assert.equal(validateComparisonEvidenceCaptures({...inputs,
  proposals:[recordedProposal()],captures:[result.record]}),1);
 assert.deepEqual(captureInput,{
  captureId:'excerpt-capture-0001',claimId:proposalInput.claimId,
  productId:proposalInput.productId,researchLeadId:proposalInput.researchLeadId,
  capturedOn:today,excerpt
 });
 assert.deepEqual(captures,[]);
});

test('manual capture fails until proposal is recorded and cannot cross vendor/claim boundaries',()=>{
 assert.throws(()=>prepareManualEvidenceCapture(captureInput,inputs),/proposal/i);
 const invalid=[
  {...captureInput,claimId:'comparison-hubspot-vs-pipedrive-02'},
  {...captureInput,productId:'pipedrive'},
  {...captureInput,researchLeadId:'pipedrive-doc-claim-1'},
  {...captureInput,excerpt:'not enough'},
  {...captureInput,excerpt:'<script>wrong</script>'},
  {...captureInput,capturedOn:'2026-10-30'},
  {...captureInput,capturedOn:'2026-11-06'},
  {...captureInput,capturedOn:'2026-02-30'},
  {...captureInput,sourceUrl:researchClaims[0].sourceUrl},
  {...captureInput,approved:true},
  {...captureInput,signature:'forged'},
  {...captureInput,captureMethod:'robot'}
 ];
 for(const value of invalid)
  assert.throws(()=>prepareManualEvidenceCapture(value,{...inputs,proposals:[recordedProposal()]}));
});

test('manual capture rejects duplicate IDs, same-day sources and changed candidate assertions',()=>{
 const valid=captured().record;
 assert.throws(()=>captured({captures:[valid]}),/duplicate/i);
 const otherId={...valid,captureId:'excerpt-capture-0002'};
 assert.throws(()=>captured({captures:[otherId]}),/duplicate/i);
 const changed=COMPARISON_PAIRS.map(pair=>({
  ...pair,matrix:pair.matrix.map((row,i)=>({...row,
   firstValue:pair.slug==='hubspot-vs-pipedrive'&&i===0?
    'This candidate assertion changed during source inspection':row.firstValue
  }))
 }));
 const revised=captured({pairs:changed});
 assert.notEqual(revised.record.claimSha256,valid.claimSha256);
 assert.equal(revised.record.approved,false);
 assert.equal(revised.canPublish,false);
});

test('manual intake CLI accepts private stdin proposal only, rejects unauthorized flags and capture without recorded proposal',()=>{
 const script=new URL('../scripts/manual-research-intake.mjs',import.meta.url).pathname;
 const run=(option,value)=>spawnSync(process.execPath,[script,option],{
  input:JSON.stringify(value),encoding:'utf8'
 });
 const result=run('--proposal',proposalInput);
 assert.equal(result.status,0,result.stderr);
 const output=JSON.parse(result.stdout);
 assert.deepEqual(output.record,recordedProposal());
 assert.equal(output.sourceVerified,false);
 assert.equal(output.eligibleForPublication,false);
 const impossible=run('--capture',captureInput);
 assert.notEqual(impossible.status,0);
 assert.match(impossible.stderr,/proposal/i);
 const bad=run('--proposal',{...proposalInput,approved:true});
 assert.notEqual(bad.status,0);
 assert.doesNotMatch(bad.stdout,/approved/);
 const bypass=run('--enable-approval',proposalInput);
 assert.notEqual(bypass.status,0);
 assert.doesNotMatch(bypass.stdout,/approved/);
});

test('private intake source is never referenced by public comparison routes',()=>{
 for(const path of ['../src/pages/compare/index.astro','../src/pages/compare/[slug].astro']){
  const page=readFileSync(new URL(path,import.meta.url),'utf8');
  assert.doesNotMatch(page,/manual-research-intake|prepareManualEvidenceCapture|prepareManualSourceProposal/);
 }
});