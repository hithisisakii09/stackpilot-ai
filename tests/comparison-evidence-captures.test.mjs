import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COMPARISON_PAIRS} from '../src/lib/comparison-pairs.mjs';
import {
 hashEvidenceExcerpt, validateComparisonEvidenceCaptures,
 buildComparisonEvidenceCaptureReport
} from '../src/lib/comparison-evidence-captures.mjs';

const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const products=read('../src/data/products.json');
const ledger=read('../src/data/comparison-evidence.json');
const triage=read('../src/data/editorial-triage.json');
const researchClaims=read('../src/data/research-claims.json');
const revocations=read('../src/data/research-source-revocations.json');
const captures=read('../src/data/comparison-evidence-captures.json');
const today='2026-11-05';
const proposal={
 claimId:'comparison-hubspot-vs-pipedrive-01',productId:'hubspot',
 researchLeadId:'hubspot-doc-claim-1',proposedOn:'2026-11-05',
 relevanceNote:'Unverified synthetic fixture to validate manual excerpt provenance and scope.',
 planScope:null,regionScope:null,status:'candidate',approved:false
};
const excerpt='TEST FIXTURE ONLY: a manual source excerpt with unverified vendor details and no factual assertions.';
const sample={
 captureId:'excerpt-capture-0001',
 claimId:proposal.claimId,productId:proposal.productId,
 researchLeadId:proposal.researchLeadId,
 sourceUrl:researchClaims.find(x=>x.id===proposal.researchLeadId).sourceUrl,
 capturedOn:'2026-11-05',planScope:null,regionScope:null,
 excerpt,excerptSha256:null,
 captureMethod:'manual',status:'candidate',approved:false
};
const base={captures,proposals:[],ledger,triage,researchClaims,revocations,products,pairs:COMPARISON_PAIRS,today};
const captured=()=>({...sample,excerptSha256:hashEvidenceExcerpt(excerpt)});

test('empty repository capture register does not pretend to have captured evidence',()=>{
 assert.deepEqual(captures,[]);
 const report=buildComparisonEvidenceCaptureReport(base);
 assert.equal(validateComparisonEvidenceCaptures(base),0);
 assert.deepEqual({
  status:report.status,total:report.totalCaptures,coverage:report.claimsWithExcerpts,
  missing:report.claimsWithoutExcerpts,approved:report.approvedCaptures,
  independentlyVerified:report.independentlyVerifiedCaptures
 },{status:'INTERNAL-UNVERIFIED',total:0,coverage:0,missing:36,approved:0,independentlyVerified:0});
 assert.deepEqual(report.records,[]);
});

test('valid synthetic manual excerpt remains candidate-only and SHA256-bound',()=>{
 const record=captured();
 const before=structuredClone(record);
 const args={...base,captures:[record],proposals:[proposal]};
 const report=buildComparisonEvidenceCaptureReport(args);
 assert.equal(report.totalCaptures,1);
 assert.equal(report.claimsWithExcerpts,1);
 assert.equal(report.claimsWithoutExcerpts,35);
 assert.equal(report.independentlyVerifiedCaptures,0);
 assert.equal(report.approvedCaptures,0);
 assert.equal(report.records.length,1);
 const entry=report.records[0];
 assert.equal(entry.captureId,record.captureId);
 assert.equal(entry.excerptSha256,hashEvidenceExcerpt(excerpt));
 assert.equal(entry.excerpt,excerpt);
 assert.equal(entry.sourceUrl,record.sourceUrl);
 assert.equal(entry.researchLeadRisk,'unreviewed');
 assert.equal(entry.independentlyVerified,false);
 assert.equal(entry.supportsClaimVerified,false);
 assert.equal(entry.eligibleForPublication,false);
 assert.equal(entry.approved,false);
 assert.equal(entry.sourceReviewedForThisClaim,false);
 assert.deepEqual(record,before);
 assert.deepEqual(report,buildComparisonEvidenceCaptureReport(args));
});

test('source revocation and age never make a captured excerpt valid publication evidence',()=>{
 const record=captured();
 const revocation={
  sourceId:record.researchLeadId,revokedOn:'2026-11-04',
  reason:'This vendor research lead was explicitly rejected from consideration.'
 };
 const revoked=buildComparisonEvidenceCaptureReport({...base,captures:[record],proposals:[proposal],revocations:[revocation]});
 assert.equal(revoked.records[0].researchLeadRisk,'revoked');
 assert.equal(revoked.records[0].eligibleForPublication,false);
 const stale=buildComparisonEvidenceCaptureReport({...base,captures:[record],proposals:[proposal],today:'2027-03-15'});
 assert.equal(stale.records[0].researchLeadRisk,'stale');
 assert.equal(stale.approvedCaptures,0);
});

test('record cannot link to a source without an exact claim/product proposal',()=>{
 const record=captured();
 assert.throws(()=>validateComparisonEvidenceCaptures({...base,captures:[record]}),/proposal/i);
 const mismatched={...proposal,claimId:'comparison-hubspot-vs-pipedrive-02'};
 assert.throws(()=>validateComparisonEvidenceCaptures({...base,proposals:[mismatched],captures:[record]}),/proposal/i);
 const otherLead={...record,researchLeadId:'pipedrive-doc-claim-1'};
 assert.throws(()=>validateComparisonEvidenceCaptures({...base,proposals:[proposal],captures:[otherLead]}),/proposal|vendor/i);
});

test('tampered excerpts, forged URL, mismatched scope and bad dates fail closed',()=>{
 const record=captured();
 const bad=[
  {...record,excerpt:'An altered excerpt without a new digest.'},
  {...record,excerptSha256:'f'.repeat(64)},
  {...record,excerptSha256:'BAD'},
  {...record,sourceUrl:'https://example.com/fake'},
  {...record,sourceUrl:record.sourceUrl+'?ref=unreviewed'},
  {...record,planScope:'Enterprise'},
  {...record,regionScope:'Europe'},
  {...record,capturedOn:'2026-11-04'},
  {...record,capturedOn:'2026-11-06'},
  {...record,capturedOn:'2026-02-30'},
  {...record,excerpt:'short'},
  {...record,excerpt:'<script>This would be private, not safe.</script>'},
  {...record,excerpt:'Untrusted source text contains a newline\nand must fail parsing.'},
  {...record,captureMethod:'automated-crawl'},
  {...record,status:'verified'},
  {...record,approved:true},
  {...record,reviewer:'unverified-owner'},
  {...record,signature:'fake'},
  {...record,sourceVerified:true}
 ];
 for(const entry of bad)assert.throws(()=>validateComparisonEvidenceCaptures({...base,captures:[entry],proposals:[proposal]}));
 assert.throws(()=>validateComparisonEvidenceCaptures({...base,captures:[record],proposals:[proposal],today:'2026-02-30'}),/date/i);
});

test('duplicate IDs and same-day claim/source captures reject ambiguity',()=>{
 const first=captured();
 const second={...first,captureId:'excerpt-capture-0002'};
 assert.throws(()=>validateComparisonEvidenceCaptures({...base,captures:[first,first],proposals:[proposal]}),/duplicate/i);
 assert.throws(()=>validateComparisonEvidenceCaptures({...base,captures:[first,second],proposals:[proposal]}),/duplicate/i);
 assert.throws(()=>validateComparisonEvidenceCaptures({...base,captures:null,proposals:[proposal]}),/array/i);
});

test('private captures must never be used as public comparison data or pages',()=>{
 const page=readFileSync(new URL('../src/pages/compare/[slug].astro',import.meta.url),'utf8');
 assert.doesNotMatch(page,/comparison-evidence-captures|excerptSha256|captureId|capturedExcerpts/);
 const script=readFileSync(new URL('../src/pages/compare/index.astro',import.meta.url),'utf8');
 assert.doesNotMatch(script,/comparison-evidence-captures|capturedExcerpts/);
});