import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COMPARISON_PAIRS,getComparisonPair} from '../src/lib/comparison-pairs.mjs';
import {validateEditorialTriage,buildEditorialTriageQueue} from '../src/lib/editorial-triage.mjs';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const products=read('../src/data/products.json');
const ledger=read('../src/data/comparison-evidence.json');
const triage=read('../src/data/editorial-triage.json');
const options={today:'2026-11-05'};
const base={claimId:'comparison-hubspot-vs-pipedrive-01',productId:'hubspot',decision:'rejected',
 reason:'No source supports this exact plan and region assertion.',recordedOn:'2026-11-05'};

test('empty editorial register is valid; all 36 claims remain unpublished and awaiting evidence',()=>{
 assert.equal(validateEditorialTriage(triage,ledger,COMPARISON_PAIRS,products,options),0);
 const rows=buildEditorialTriageQueue(triage,ledger,COMPARISON_PAIRS,products,options);
 assert.equal(rows.length,36);
 assert.deepEqual(rows.map(x=>x.key),[...rows.map(x=>x.key)].sort());
 assert.ok(rows.every(x=>x.triageDecision==='needs-evidence'&&x.triageReason===null));
 assert.ok(rows.every(x=>x.approved===false&&x.approvalAuthenticated===false&&x.publicationAllowed===false));
 assert.deepEqual(rows,buildEditorialTriageQueue(triage,ledger,COMPARISON_PAIRS,products,options));
 assert.equal(getComparisonPair('hubspot-vs-pipedrive',products).matrix[0].approved,false);
});

test('specific negative disposition is tracked without changing claim approval or rendering',()=>{
 const before=structuredClone(base);
 const rows=buildEditorialTriageQueue([base],ledger,COMPARISON_PAIRS,products,options);
 const matching=rows.filter(x=>x.claimId===base.claimId&&x.productId===base.productId);
 assert.equal(matching.length,1);
 assert.equal(matching[0].triageDecision,'rejected');
 assert.equal(matching[0].triageReason,base.reason);
 assert.equal(matching[0].triageRecordedOn,base.recordedOn);
 assert.equal(matching[0].approved,false);
 assert.equal(matching[0].approvalAuthenticated,false);
 assert.equal(matching[0].publicationAllowed,false);
 assert.equal(rows.filter(x=>x.triageDecision==='rejected').length,1);
 assert.deepEqual(base,before);
 const display=getComparisonPair('hubspot-vs-pipedrive',products).matrix[0];
 assert.equal(display.approved,false);
 assert.equal(display.evidenceStatus,'unverified');
});

test('approval, reviewer identity, source claims, and undeclared fields are disallowed',()=>{
 const forbidden=[
  {...base,decision:'approved'}, {...base,decision:'verified'},
  {...base,approved:true},{...base,reviewer:'owner'},
  {...base,sourceUrl:'https://example.com/proof'},
  {...base,sourceId:'hubspot-doc-claim-1'},
  {...base,status:'verified'},
  {...base,signature:'fake-signature'},
  {...base,expiresAt:'2027-01-01'}
 ];
 for(const item of forbidden)assert.throws(()=>validateEditorialTriage([item],ledger,COMPARISON_PAIRS,products,options));
});

test('malformed, duplicate, unknown or future-dated decisions fail closed',()=>{
 const bad=[
  {...base,claimId:'comparison-nonexistent-01'},
  {...base,productId:'not-a-vendor'},
  {...base,decision:'withdrawn'},
  {...base,recordedOn:'2026-11-06'},
  {...base,recordedOn:'2026-02-30'},
  {...base,reason:'short'},
  {...base,reason:'This assertion has no proof <img onerror=alert(1)>.'},
  {...base,reason:'This assertion has no proof.\nAnother line.'},
  {...base,reason:23},
 ];
 for(const item of bad)assert.throws(()=>validateEditorialTriage([item],ledger,COMPARISON_PAIRS,products,options));
 assert.throws(()=>validateEditorialTriage([base,base],ledger,COMPARISON_PAIRS,products,options),/duplicate/i);
 assert.throws(()=>validateEditorialTriage([base],ledger.slice(1),COMPARISON_PAIRS,products,options),/incomplete/i);
 assert.throws(()=>validateEditorialTriage([base],ledger,COMPARISON_PAIRS,products,{today:'2026-02-30'}),/date/i);
});

test('review notes are untrusted and never escape into public comparison rendering',()=>{
 const report=buildEditorialTriageQueue([base],ledger,COMPARISON_PAIRS,products,options);
 assert.equal(report[0].publicationAllowed,false);
 const page=readFileSync(new URL('../src/pages/compare/[slug].astro',import.meta.url),'utf8');
 assert.doesNotMatch(page,/editorial-triage\.json|triageReason|triageRecordedOn/);
});
