import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COMPARISON_PAIRS,getComparisonPair} from '../src/lib/comparison-pairs.mjs';
import {validateComparisonSourceProposals,buildComparisonReviewPackets} from '../src/lib/comparison-review-packets.mjs';

const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const products=read('../src/data/products.json');
const ledger=read('../src/data/comparison-evidence.json');
const triage=read('../src/data/editorial-triage.json');
const researchClaims=read('../src/data/research-claims.json');
const revocations=read('../src/data/research-source-revocations.json');
const proposals=read('../src/data/comparison-source-proposals.json');
const today='2026-11-05';
const base={proposals,ledger,triage,researchClaims,revocations,products,pairs:COMPARISON_PAIRS,today};
const sample={
 claimId:'comparison-hubspot-vs-pipedrive-01',
 productId:'hubspot',
 researchLeadId:'hubspot-doc-claim-1',
 proposedOn:'2026-11-05',
 relevanceNote:'This is an unverified research lead; compare the source text against the precise assertion.',
 planScope:null,
 regionScope:null,
 status:'candidate',
 approved:false
};
const run=(overrides={})=>buildComparisonReviewPackets({...base,...overrides});

test('empty research proposals yield 36 deterministic private unverified review packets',()=>{
 assert.equal(validateComparisonSourceProposals(base),0);
 const report=run();
 assert.equal(report.status,'INTERNAL-UNVERIFIED');
 assert.equal(report.totalClaims,36);
 assert.equal(report.claimsWithoutProposals,36);
 assert.equal(report.proposedSources,0);
 assert.equal(report.authenticatedApprovals,0);
 assert.equal(report.publicationAllowed,false);
 assert.equal(report.packets.length,36);
 assert.deepEqual(report.packets.map(x=>x.key),[...report.packets.map(x=>x.key)].sort());
 assert.ok(report.packets.every(x=>x.unverified===true&&x.approved===false&&x.canPublish===false));
 assert.ok(report.packets.every(x=>x.proposedSources.length===0));
 const first=report.packets.find(x=>x.claimId===sample.claimId&&x.productId===sample.productId);
 assert.equal(first.candidateAssertion,COMPARISON_PAIRS[0].matrix[0].firstValue);
 assert.notEqual(first.candidateAssertion,getComparisonPair('hubspot-vs-pipedrive',products).matrix[0].firstValue);
 assert.deepEqual(report,run());
});

test('a vendor-specific research lead remains only a candidate, even with a relevance note',()=>{
 const before=structuredClone(sample);
 const report=run({proposals:[sample]});
 assert.equal(report.proposedSources,1);
 assert.equal(report.claimsWithoutProposals,35);
 const row=report.packets.find(x=>x.claimId===sample.claimId&&x.productId===sample.productId);
 assert.equal(row.proposedSources.length,1);
 const source=row.proposedSources[0];
 assert.equal(source.researchLeadId,sample.researchLeadId);
 assert.equal(source.relevanceNote,sample.relevanceNote);
 assert.equal(source.risk,'unreviewed');
 assert.equal(source.sourceReviewedForThisClaim,false);
 assert.equal(source.eligibleAsEvidence,false);
 assert.equal(row.canPublish,false);
 assert.equal(report.authenticatedApprovals,0);
 assert.deepEqual(sample,before);
});

test('source risk and negative triage cannot approve, revive or publish a claim',()=>{
 const revoke={sourceId:sample.researchLeadId,revokedOn:'2026-11-04',
  reason:'Vendor source is no longer considered suitable for editorial research.'};
 const report=run({proposals:[sample],revocations:[revoke]});
 const item=report.packets.find(x=>x.claimId===sample.claimId&&x.productId===sample.productId);
 assert.equal(item.proposedSources[0].risk,'revoked');
 assert.equal(item.proposedSources[0].eligibleAsEvidence,false);
 assert.equal(item.approved,false);
 assert.equal(run({proposals:[sample],today:'2027-03-15'}).packets.find(x=>x.claimId===sample.claimId&&x.productId===sample.productId).proposedSources[0].risk,'stale');
 const rejected={claimId:sample.claimId,productId:sample.productId,decision:'rejected',
  reason:'Existing sources do not substantiate the intended assertion.',recordedOn:today};
 const withReject=run({proposals:[sample],triage:[rejected]});
 assert.equal(withReject.packets.find(x=>x.claimId===sample.claimId&&x.productId===sample.productId).triageDecision,'rejected');
 assert.equal(withReject.publicationAllowed,false);
});

test('strict candidate proposal validator rejects forged authority, mismatched sources and bad input',()=>{
 const invalid=[
  {...sample,productId:'pipedrive'},
  {...sample,researchLeadId:'pipedrive-doc-claim-1'},
  {...sample,claimId:'comparison-unknown-01'},
  {...sample,proposedOn:'2026-10-30'},
  {...sample,proposedOn:'2026-11-06'},
  {...sample,proposedOn:'2026-02-30'},
  {...sample,approved:true},
  {...sample,status:'verified'},
  {...sample,reviewer:'owner'},
  {...sample,reviewedAt:today},
  {...sample,sourceIsVerified:true},
  {...sample,relevanceNote:'short'},
  {...sample,relevanceNote:'This is <img src=x onerror=alert(1)> proof.'},
  {...sample,planScope:'<script>'},
  {...sample,regionScope:42}
 ];
 for(const proposal of invalid)assert.throws(()=>validateComparisonSourceProposals({...base,proposals:[proposal]}));
 assert.throws(()=>validateComparisonSourceProposals({...base,proposals:[sample,sample]}),/duplicate/i);
 assert.throws(()=>validateComparisonSourceProposals({...base,ledger:ledger.slice(1),proposals:[sample]}),/incomplete/i);
 assert.throws(()=>validateComparisonSourceProposals({...base,proposals:null}),/array/i);
 assert.throws(()=>validateComparisonSourceProposals({...base,today:'2026-02-30'}),/date/i);
});

test('only internal CLI can access raw candidates and source proposals, not Astro comparison',()=>{
 const page=readFileSync(new URL('../src/pages/compare/[slug].astro',import.meta.url),'utf8');
 assert.doesNotMatch(page,/comparison-review-packets|comparison-source-proposals|candidateAssertion|proposedSources/);
 const publicRow=getComparisonPair('hubspot-vs-pipedrive',products).matrix[0];
 assert.equal(publicRow.approved,false);
 assert.equal(publicRow.sourceId,null);
 assert.match(publicRow.firstValue,/unverified/i);
});
