import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildCandidateSourceRiskReport} from '../src/lib/candidate-source-risk.mjs';

const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const products=read('../src/data/products.json');
const claims=read('../src/data/research-claims.json');
const revocations=read('../src/data/research-source-revocations.json');
const baseline={claims,products,revocations,today:'2026-11-05',staleAfterDays:90};

test('candidate-source risk report is deterministic, read-only and never grants approval',()=>{
 const before=structuredClone({claims,products,revocations});
 const report=buildCandidateSourceRiskReport(baseline);
 assert.equal(report.status,'UNVERIFIED');
 assert.equal(report.totalSources,6);
 assert.equal(report.unreviewedSources,6);
 assert.equal(report.staleSources,0);
 assert.equal(report.revokedSources,0);
 assert.equal(report.approvedSources,0);
 assert.equal(report.entries.length,6);
 assert.deepEqual(report.entries.map(x=>x.sourceId),[...report.entries.map(x=>x.sourceId)].sort());
 for(const row of report.entries){
  assert.equal(row.risk,'unreviewed');
  assert.equal(row.approved,false);
  assert.equal(row.eligibleForPublication,false);
  assert.equal(row.reviewRequired,true);
  assert.equal(row.daysSinceRecorded,5);
 }
 assert.deepEqual({claims,products,revocations},before);
 assert.deepEqual(report,buildCandidateSourceRiskReport(baseline));
});

test('age threshold is UTC-date based and never treats recency as approval',()=>{
 const atBoundary=buildCandidateSourceRiskReport({...baseline,staleAfterDays:5});
 assert.equal(atBoundary.staleSources,0);
 const beyond=buildCandidateSourceRiskReport({...baseline,today:'2026-11-06',staleAfterDays:5});
 assert.equal(beyond.staleSources,6);
 assert.equal(beyond.unreviewedSources,0);
 assert.ok(beyond.entries.every(x=>x.risk==='stale' && x.approved===false));
});

test('explicit source revocation takes priority over freshness and remains unapproved',()=>{
 const revocation={sourceId:'hubspot-doc-claim-1',revokedOn:'2026-11-04',reason:'Previously recorded vendor page cannot substantiate the intended assertion.'};
 const report=buildCandidateSourceRiskReport({...baseline,revocations:[revocation]});
 assert.equal(report.revokedSources,1);
 assert.equal(report.unreviewedSources,5);
 const row=report.entries.find(x=>x.sourceId===revocation.sourceId);
 assert.equal(row.risk,'revoked');
 assert.equal(row.revokedOn,revocation.revokedOn);
 assert.equal(row.revocationReason,revocation.reason);
 assert.equal(row.approved,false);
});

test('revocation intake rejects duplicates, unknown IDs, future dates and unsafe data',()=>{
 const base={sourceId:'hubspot-doc-claim-1',revokedOn:'2026-11-04',reason:'Source has been withdrawn from the internal research intake.'};
 const variants=[
  {...base,sourceId:'missing-doc'},
  {...base,revokedOn:'2026-11-06'},
  {...base,revokedOn:'2026-02-30'},
  {...base,revokedOn:'2026-10-30'},
  {...base,reason:'<script>alert(1)</script>'},
  {...base,reason:'short'},
  {...base,approved:true}
 ];
 for(const entry of variants){
  assert.throws(()=>buildCandidateSourceRiskReport({...baseline,revocations:[entry]}));
 }
 assert.throws(()=>buildCandidateSourceRiskReport({...baseline,revocations:[base,base]}),/duplicate/i);
 assert.throws(()=>buildCandidateSourceRiskReport({...baseline,revocations:'not-an-array'}),/revocation/i);
});

test('source risk rejects forged editorial approval, wrong dates and unsafe thresholds',()=>{
 assert.throws(()=>buildCandidateSourceRiskReport({...baseline,claims:claims.map((x,i)=>i===0?{...x,approved:true}:x)}),/approved/i);
 assert.throws(()=>buildCandidateSourceRiskReport({...baseline,today:'2026-02-30'}),/date/i);
 assert.throws(()=>buildCandidateSourceRiskReport({...baseline,staleAfterDays:0}),/threshold/i);
});
