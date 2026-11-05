import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {COMPARISON_PAIRS} from '../src/lib/comparison-pairs.mjs';
import {hashEvidenceExcerpt} from '../src/lib/comparison-evidence-captures.mjs';
import {checkOfflineSnapshotConsistency} from '../src/lib/offline-snapshot-consistency.mjs';

const load=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const products=load('../src/data/products.json');
const ledger=load('../src/data/comparison-evidence.json');
const triage=load('../src/data/editorial-triage.json');
const researchClaims=load('../src/data/research-claims.json');
const revocations=load('../src/data/research-source-revocations.json');
const captures=load('../src/data/comparison-evidence-captures.json');
const today='2026-11-05';
const proposal={
 claimId:'comparison-hubspot-vs-pipedrive-01',productId:'hubspot',
 researchLeadId:'hubspot-doc-claim-1',proposedOn:today,
 relevanceNote:'This is a synthetic proposal for testing a local text-matching check only.',
 planScope:null,regionScope:null,status:'candidate',approved:false
};
const excerpt='SYNTHETIC EXCERPT: no real vendor documentation was downloaded or independently verified.';
const capture={
 captureId:'excerpt-capture-0001',claimId:proposal.claimId,
 productId:proposal.productId,researchLeadId:proposal.researchLeadId,
 sourceUrl:researchClaims.find(x=>x.id===proposal.researchLeadId).sourceUrl,
 claimSha256:createHash('sha256').update(COMPARISON_PAIRS[0].matrix[0].firstValue,'utf8').digest('hex'),
 capturedOn:today,planScope:null,regionScope:null,
 excerpt,excerptSha256:hashEvidenceExcerpt(excerpt),captureMethod:'manual',
 status:'candidate',approved:false
};
const text='Private locally supplied example source text.\n'+excerpt+'\nOther synthetic source context.';
const snapshot={sourceUrl:capture.sourceUrl,snapshotOn:today,text};
const base={captures,proposals:[proposal],ledger,triage,researchClaims,revocations,products,pairs:COMPARISON_PAIRS,today,capture,snapshot};
const run=changes=>checkOfflineSnapshotConsistency({...base,...changes});

test('a synthetic exact local text match never verifies vendor source or approves a claim',()=>{
 const before=structuredClone({capture,snapshot});
 const report=run();
 assert.deepEqual(report,{
  status:'LOCAL-TEXT-MATCH-UNVERIFIED',
  captureId:capture.captureId,
  claimId:capture.claimId,
  productId:capture.productId,
  researchLeadId:capture.researchLeadId,
  snapshotSha256:createHash('sha256').update(text,'utf8').digest('hex'),
  sourceRisk:'unreviewed',
  exactExcerptFound:true,
  localCopyAuthenticated:false,
  remoteVendorSourceVerified:false,
  relevanceToClaimVerified:false,
  reviewerAuthenticated:false,
  approved:false,
  canPublish:false
 });
 assert.deepEqual({capture,snapshot},before);
 assert.equal(JSON.stringify(report).includes(excerpt),false);
 assert.equal(JSON.stringify(report).includes(text),false);
 assert.deepEqual(report,run());
});

test('an excerpt absent from a local snapshot fails closed without leaking source text',()=>{
 for(const altered of [
  {text:'Preamble about this local file only; no matching excerpt exists in the text.'},
  {text:text.replace('EXCERPT','excerpt')},
  {text:text.replace('no real','no  real')},
  {text:text.replace('SYNTHETIC','&#83;YNTHETIC')},
 ]){
  const report=run({snapshot:{...snapshot,...altered}});
  assert.equal(report.status,'LOCAL-TEXT-MISMATCH');
  assert.equal(report.exactExcerptFound,false);
  assert.equal(report.approved,false);
  assert.equal(report.canPublish,false);
  assert.equal(JSON.stringify(report).includes(altered.text),false);
 }
});

test('existing registered capture is accepted only when the supplied record is identical',()=>{
 const report=run({captures:[capture]});
 assert.equal(report.exactExcerptFound,true);
 assert.throws(()=>run({captures:[capture],capture:{...capture,excerpt:'A fabricated replacement excerpt that is structurally large enough to pass shape validation.'}}),/record|registered|mismatch/i);
});

test('unregistered capture requires its exact validated claim/source proposal',()=>{
 assert.throws(()=>run({proposals:[]}),/proposal/i);
 assert.throws(()=>run({capture:{...capture,productId:'pipedrive'}}),/proposal/i);
 assert.throws(()=>run({capture:{...capture,claimId:'comparison-hubspot-vs-pipedrive-02'}}),/proposal/i);
 assert.throws(()=>run({capture:{...capture,approved:true}}),/approval/i);
 assert.throws(()=>run({capture:{...capture,excerptSha256:'f'.repeat(64)}}),/sha|digest/i);
 assert.throws(()=>run({ledger:ledger.slice(1)}),/incomplete/i);
});

test('snapshot origin, date and shape are strict even with matching excerpt bytes',()=>{
 const invalid=[
  {...snapshot,sourceUrl:'https://example.invalid/vendor'},
  {...snapshot,sourceUrl:snapshot.sourceUrl+'?ref=wrong'},
  {...snapshot,snapshotOn:'2026-11-04'},
  {...snapshot,snapshotOn:'2026-11-06'},
  {...snapshot,snapshotOn:'2026-02-30'},
  {...snapshot,text:''},
  {...snapshot,text:'short'},
  {...snapshot,text:'\u0000'+text},
  {...snapshot,text:'a'.repeat(300000)},
  {...snapshot,approved:true},
  {...snapshot,reviewer:'fake'},
  {...snapshot,sourceVerified:true}
 ];
 for(const wrong of invalid)assert.throws(()=>run({snapshot:wrong}));
 assert.throws(()=>run({snapshot:null}),/snapshot/i);
 assert.throws(()=>run({today:'2026-02-30'}),/date/i);
});

test('stale/revoked source remains unapproved even if excerpt bytes match',()=>{
 const revoke={sourceId:proposal.researchLeadId,revokedOn:'2026-11-04',
  reason:'Vendor research source was explicitly revoked for further private inspection.'};
 const revoked=run({revocations:[revoke]});
 assert.equal(revoked.sourceRisk,'revoked');
 assert.equal(revoked.status,'LOCAL-TEXT-MATCH-REFRESH-REQUIRED');
 assert.equal(revoked.canPublish,false);
 const stale=run({today:'2027-03-15'});
 assert.equal(stale.sourceRisk,'stale');
 assert.equal(stale.status,'LOCAL-TEXT-MATCH-REFRESH-REQUIRED');
 assert.equal(stale.remoteVendorSourceVerified,false);
});

test('CLI denies invented local source checks with no matching recorded proposal',()=>{
 const cli=new URL('../scripts/offline-snapshot-consistency.mjs',import.meta.url).pathname;
 const result=spawnSync(process.execPath,[cli],{encoding:'utf8',
  input:JSON.stringify({capture,snapshot})});
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/proposal|rejected|source/i);
 assert.equal(result.stderr.includes(excerpt),false);
 assert.equal(result.stdout.includes(text),false);
 const invalid=spawnSync(process.execPath,[cli,'--approve'],{encoding:'utf8',
  input:JSON.stringify({capture,snapshot})});
 assert.notEqual(invalid.status,0);
 assert.equal(invalid.stdout.includes(excerpt),false);
});

test('public Astro pages never reference private offline-snapshot inspection',()=>{
 for(const path of ['../src/pages/compare/[slug].astro','../src/pages/compare/index.astro']){
  const page=readFileSync(new URL(path,import.meta.url),'utf8');
  assert.doesNotMatch(page,/offline-snapshot-consistency|snapshotSha256|exactExcerptFound/);
 }
});
