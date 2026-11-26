import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateComparisonEvidence,buildComparisonEvidenceIndex} from '../src/lib/comparison-evidence.mjs';
import {COMPARISON_PAIRS,getComparisonPair} from '../src/lib/comparison-pairs.mjs';
const products=JSON.parse(readFileSync(new URL('../src/data/products.json',import.meta.url),'utf8'));
const ledger=JSON.parse(readFileSync(new URL('../src/data/comparison-evidence.json',import.meta.url),'utf8'));
const today='2026-11-05';
const valid={claimId:'comparison-hubspot-vs-pipedrive-01',productId:'hubspot',sourceId:null,status:'candidate',approved:false,checkedAt:null,expiresAt:null};

test('all comparison claim identifiers are covered by candidate-only evidence ledger',()=>{
 assert.equal(validateComparisonEvidence(ledger,COMPARISON_PAIRS,products,{today}),ledger.length);
 const ids=COMPARISON_PAIRS.flatMap(pair=>pair.matrix.flatMap((_,i)=>[pair.firstId,pair.secondId].map(productId=>`${pair.slug}:${i+1}:${productId}`)));
 assert.equal(ledger.length,ids.length);
 const index=buildComparisonEvidenceIndex(ledger,COMPARISON_PAIRS,products,{today});
 assert.equal(index.size,ids.length);
 for(const record of ledger){
  assert.equal(record.status,'candidate');
  assert.equal(record.sourceId,null);
  assert.equal(record.approved,false);
  assert.equal(record.checkedAt,null);
  assert.equal(record.expiresAt,null);
 }
});

test('claim evidence validator rejects approval, unknown IDs, unknown sources and malformed dates',()=>{
 const cases=[
  {...valid,approved:true},
  {...valid,status:'verified'},
  {...valid,claimId:'comparison-nonexistent-01'},
  {...valid,sourceId:'unknown-source'},
  {...valid,sourceId:'hubspot-doc-claim-1'},
  {...valid,checkedAt:'2026-11-06'},
  {...valid,expiresAt:'2026-12-01'},
  {...valid,productId:'pipedrive',sourceId:'hubspot-doc-claim-1'},
  {...valid,extra:'injected'}
 ];
 for(const entry of cases)assert.throws(()=>validateComparisonEvidence([entry],COMPARISON_PAIRS,products,{today}));
 assert.throws(()=>validateComparisonEvidence([valid,valid],COMPARISON_PAIRS,products,{today}),/duplicate/i);
});

test('unapproved evidence cannot change displayed claim status or reveal raw assertions',()=>{
 const result=getComparisonPair('hubspot-vs-pipedrive',products);
 for(const row of result.matrix){
  assert.equal(row.evidenceStatus,'unverified');
  assert.equal(row.approved,false);
  assert.match(row.firstValue,/unverified/i);
  assert.match(row.secondValue,/unverified/i);
 }
});

test('missing, duplicate, or injected ledger records fail closed',()=>{
 assert.throws(()=>validateComparisonEvidence(ledger.slice(1),COMPARISON_PAIRS,products,{today}),/incomplete/i);
 assert.throws(()=>validateComparisonEvidence([...ledger,ledger[0]],COMPARISON_PAIRS,products,{today}),/duplicate/i);
 assert.throws(()=>validateComparisonEvidence(ledger.map((r,i)=>i===0?{...r,approved:true}:r),COMPARISON_PAIRS,products,{today}),/unapproved/i);
 assert.throws(()=>validateComparisonEvidence(ledger,COMPARISON_PAIRS,products,{today:'2026-02-30'}),/date/i);
});

test('review queue is complete, deterministic, and never claims approval',async()=>{
 const {buildComparisonReviewQueue}=await import('../src/lib/comparison-evidence.mjs');
 const queue=buildComparisonReviewQueue(ledger,COMPARISON_PAIRS,products,{today});
 assert.equal(queue.length,ledger.length);
 assert.deepEqual(queue.map(x=>x.key),[...queue.map(x=>x.key)].sort());
 for(const item of queue){
  assert.equal(item.status,'needs-evidence');
  assert.equal(item.approved,false);
  assert.equal(item.sourceId,null);
  assert.equal(item.sourceUrl,null);
  assert.equal(item.checkedAt,null);
  assert.equal(item.expiresAt,null);
  assert.match(item.reviewQuestion,/verify|confirm/i);
 }
 assert.deepEqual(queue,buildComparisonReviewQueue(ledger,COMPARISON_PAIRS,products,{today}));
});

test('review queue cannot silently include invalid or incomplete evidence',async()=>{
 const {buildComparisonReviewQueue}=await import('../src/lib/comparison-evidence.mjs');
 assert.throws(()=>buildComparisonReviewQueue(ledger.slice(1),COMPARISON_PAIRS,products,{today}),/incomplete/i);
 assert.throws(()=>buildComparisonReviewQueue(ledger.map((x,i)=>i===0?{...x,approved:true}:x),COMPARISON_PAIRS,products,{today}),/unapproved/i);
});
