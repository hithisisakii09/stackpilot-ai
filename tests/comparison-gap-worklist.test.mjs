import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {COMPARISON_PAIRS} from '../src/lib/comparison-pairs.mjs';
import {hashEvidenceExcerpt} from '../src/lib/comparison-evidence-captures.mjs';
import {
 buildComparisonGapWorklist,serializeComparisonGapCsv
} from '../src/lib/comparison-gap-worklist.mjs';

const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const ledger=read('../src/data/comparison-evidence.json');
const products=read('../src/data/products.json');
const triage=read('../src/data/editorial-triage.json');
const researchClaims=read('../src/data/research-claims.json');
const revocations=read('../src/data/research-source-revocations.json');
const proposals=read('../src/data/comparison-source-proposals.json');
const captures=read('../src/data/comparison-evidence-captures.json');
const base={ledger,products,triage,researchClaims,revocations,proposals,captures,pairs:COMPARISON_PAIRS,today:'2026-11-05'};
const build=(overrides={})=>buildComparisonGapWorklist({...base,...overrides});
const proposal={
 claimId:'comparison-hubspot-vs-pipedrive-01',productId:'hubspot',
 researchLeadId:'hubspot-doc-claim-1',proposedOn:'2026-11-05',
 relevanceNote:'Synthetic proposal for testing manual vendor source validation workflow only.',
 planScope:null,regionScope:null,status:'candidate',approved:false
};
const excerpt='SYNTHETIC TEST EXCERPT: unverified local text for validating a research worksheet, not a vendor quotation.';
function capture(){
 return {
  captureId:'excerpt-capture-0001',claimId:proposal.claimId,productId:proposal.productId,
  researchLeadId:proposal.researchLeadId,
  sourceUrl:researchClaims.find(x=>x.id===proposal.researchLeadId).sourceUrl,
  claimSha256:createHash('sha256').update(COMPARISON_PAIRS[0].matrix[0].firstValue).digest('hex'),
  capturedOn:'2026-11-05',planScope:null,regionScope:null,
  excerpt,excerptSha256:hashEvidenceExcerpt(excerpt),
  captureMethod:'manual',status:'candidate',approved:false
 };
}

test('worklist covers all 36 unverified claim/vendor cells with no fabricated sources',()=>{
 const report=build();
 assert.equal(report.status,'PRIVATE-UNVERIFIED-WORKLIST');
 assert.equal(report.totalClaims,36);
 assert.equal(report.withoutProposals,36);
 assert.equal(report.awaitingManualCapture,0);
 assert.equal(report.awaitingIndependentVerification,0);
 assert.equal(report.requiringSourceRefresh,0);
 assert.equal(report.rejected,0);
 assert.equal(report.manualCaptures,0);
 assert.equal(report.authenticatedApprovals,0);
 assert.equal(report.publicationAllowed,false);
 assert.deepEqual(report.rows.map(x=>x.key),[...report.rows.map(x=>x.key)].sort());
 for(const item of report.rows){
  assert.equal(item.stage,'needs-source-proposal');
  assert.equal(item.evidenceStatus,'UNVERIFIED');
  assert.equal(item.approved,false);
  assert.equal(item.sourceVerified,false);
  assert.equal(item.canPublish,false);
  assert.deepEqual(item.researchLeadIds,[]);
  assert.deepEqual(item.manualCaptureIds,[]);
  assert.match(item.nextAction,/source/i);
  assert.match(item.reviewQuestion,/verify/i);
 }
 assert.deepEqual(build(),report);
});

test('one proposed source advances research task only to manual capture, never verified',()=>{
 const before=structuredClone(proposal);
 const report=build({proposals:[proposal]});
 assert.equal(report.withoutProposals,35);
 assert.equal(report.awaitingManualCapture,1);
 const row=report.rows.find(x=>x.claimId===proposal.claimId&&x.productId===proposal.productId);
 assert.deepEqual(row.researchLeadIds,[proposal.researchLeadId]);
 assert.deepEqual(row.manualCaptureIds,[]);
 assert.equal(row.stage,'needs-manual-capture');
 assert.equal(row.approved,false);
 assert.equal(row.canPublish,false);
 assert.deepEqual(proposal,before);
});

test('synthetic manual excerpt advances only to independently required verification',()=>{
 const c=capture();
 const report=build({proposals:[proposal],captures:[c]});
 assert.equal(report.manualCaptures,1);
 assert.equal(report.awaitingIndependentVerification,1);
 assert.equal(report.authenticatedApprovals,0);
 const row=report.rows.find(x=>x.claimId===proposal.claimId&&x.productId===proposal.productId);
 assert.equal(row.stage,'needs-independent-verification');
 assert.deepEqual(row.manualCaptureIds,[c.captureId]);
 assert.match(row.nextAction,/independent/i);
 assert.equal(row.evidenceStatus,'UNVERIFIED');
 assert.equal(row.canPublish,false);
 assert.equal(report.publicationAllowed,false);
});

test('revoked and stale vendor leads are flagged before any favorable inference',()=>{
 const revocation={sourceId:proposal.researchLeadId,revokedOn:'2026-11-04',
  reason:'Internal research lead is withdrawn from further candidate verification.'};
 const revoked=build({proposals:[proposal],captures:[capture()],revocations:[revocation]});
 const row=revoked.rows.find(x=>x.claimId===proposal.claimId&&x.productId===proposal.productId);
 assert.equal(revoked.requiringSourceRefresh,1);
 assert.equal(row.stage,'source-refresh-needed');
 assert.equal(row.canPublish,false);
 const stale=build({proposals:[proposal],captures:[capture()],today:'2027-03-15'});
 assert.equal(stale.requiringSourceRefresh,1);
});

test('negative review disposition takes priority, never becomes approval',()=>{
 const rejected={claimId:proposal.claimId,productId:proposal.productId,
  decision:'rejected',recordedOn:'2026-11-05',
  reason:'Evidence is insufficient to substantiate this exact current-plan assertion.'};
 const report=build({triage:[rejected],proposals:[proposal]});
 const row=report.rows.find(x=>x.claimId===proposal.claimId&&x.productId===proposal.productId);
 assert.equal(report.rejected,1);
 assert.equal(row.stage,'rejected-needs-reassessment');
 assert.equal(row.approved,false);
 assert.equal(row.canPublish,false);
});

test('invalid or incomplete evidence inputs never create a benign-looking worklist',()=>{
 assert.throws(()=>build({ledger:ledger.slice(1)}),/incomplete/i);
 assert.throws(()=>build({proposals:[{...proposal,approved:true}]}),/approval/i);
 assert.throws(()=>build({captures:[capture()]}),/proposal/i);
 assert.throws(()=>build({captures:null}),/array/i);
});

test('private CSV provides a complete, stable, unapproved manual worksheet',()=>{
 const report=build();
 const csv=serializeComparisonGapCsv(report);
 assert.equal(csv.split('\r\n').filter(Boolean).length,37);
 assert.match(csv,/^"Claim ID","Vendor","Dimension","UNVERIFIED candidate assertion/);
 assert.ok(csv.includes('"comparison-hubspot-vs-pipedrive-01"'));
 assert.ok(csv.includes('"HubSpot"'));
 assert.ok(csv.includes('"needs-source-proposal"'));
 assert.doesNotMatch(csv,/,"approved",/i);
 assert.equal(serializeComparisonGapCsv(report),csv);
 assert.ok(csv.endsWith('\r\n'));
 assert.throws(()=>serializeComparisonGapCsv({...report,publicationAllowed:true}),/approval|publication/i);
 assert.throws(()=>serializeComparisonGapCsv({...report,rows:[]}),/rows|worklist/i);
});

test('every spreadsheet cell is protected against CSV formula injection and quoted delimiters',()=>{
 const report=build();
 const candidate='=HYPERLINK("https://unsafe.invalid","click")';
 const crafted={...report,rows:report.rows.map((row,i)=>i===0?
  {...row,candidateAssertion:candidate,reviewQuestion:'\u200B+SUM(1,1)',productName:'\t@evil'}:row)};
 const csv=serializeComparisonGapCsv(crafted);
 assert.ok(csv.includes('"\''+'=HYPERLINK(""https://unsafe.invalid"",""click"")"'));
 assert.ok(csv.includes('"\''+'\u200B+SUM(1,1)"'));
 assert.ok(csv.includes('"\''+'\t@evil"'));
 assert.ok(csv.includes('"comparison-hubspot-vs-pipedrive-01"'));
});

test('private worklist is not imported or emitted by public comparison pages',()=>{
 for(const path of ['../src/pages/compare/[slug].astro','../src/pages/compare/index.astro']){
  const page=readFileSync(new URL(path,import.meta.url),'utf8');
  assert.doesNotMatch(page,/comparison-gap-worklist|candidateAssertion|manualCaptureIds/);
 }
});
test('CLI defaults to privacy-preserving summary and exposes raw candidates only for explicit private format',()=>{
 const cli=fileURLToPath(new URL('../scripts/comparison-gap-worklist.mjs',import.meta.url));
 const exec=(...args)=>{
  const x=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
  assert.equal(x.status,0,x.stderr);
  return x.stdout;
 };
 const summary=exec();
 const raw=COMPARISON_PAIRS[0].matrix[0].firstValue;
 assert.match(summary,/PRIVATE RESEARCH ONLY/);
 assert.match(summary,/Vendor-specific claims: 36/);
 assert.equal(summary.includes(raw),false);
 const csv=exec('--csv');
 assert.match(csv,/^"Claim ID","Vendor"/);
 assert.ok(csv.includes(raw));
 const json=JSON.parse(exec('--json'));
 assert.equal(json.totalClaims,36);
 assert.equal(json.authenticatedApprovals,0);
 assert.equal(json.publicationAllowed,false);
 assert.ok(json.rows.some(x=>x.candidateAssertion===raw));
});
