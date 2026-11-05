import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateComparisonEvidence,buildComparisonEvidenceIndex} from '../src/lib/comparison-evidence.mjs';
import {COMPARISON_PAIRS,getComparisonPair} from '../src/lib/comparison-pairs.mjs';
const products=JSON.parse(readFileSync(new URL('../src/data/products.json',import.meta.url),'utf8'));
const ledger=JSON.parse(readFileSync(new URL('../src/data/comparison-evidence.json',import.meta.url),'utf8'));
const today='2026-11-05';
const valid={claimId:'comparison-hubspot-vs-pipedrive-01',productId:'hubspot',sourceId:'hubspot-doc-claim-1',status:'candidate',approved:false,checkedAt:null,expiresAt:null};

test('all comparison claim identifiers are covered by candidate-only evidence ledger',()=>{
 assert.equal(validateComparisonEvidence(ledger,COMPARISON_PAIRS,products,{today}),ledger.length);
 const ids=COMPARISON_PAIRS.flatMap(pair=>pair.matrix.flatMap((_,i)=>[pair.firstId,pair.secondId].map(productId=>`${pair.slug}:${i+1}:${productId}`)));
 assert.equal(ledger.length,ids.length);
 const index=buildComparisonEvidenceIndex(ledger,COMPARISON_PAIRS,products,{today});
 assert.equal(index.size,ids.length);
 for(const record of ledger){
  assert.equal(record.status,'candidate');
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
