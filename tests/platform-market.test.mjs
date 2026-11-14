import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareMarketImport,normalizeMarketObservation} from '../src/platform/market/observations.mjs';
import {analyzeMarketObservations} from '../src/platform/market/scoring.mjs';
import {auditLocalControlPlaneExport} from '../src/lib/local-control-plane-export.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {verifyMarketMigration} from '../src/platform/persistence/migrate.mjs';

const observation=(metric='demand-index',value=80,subjectId='product-alpha')=>({seriesId:'series-'+subjectId+'-'+metric,revision:1,supersedesId:null,categoryId:'category-crm',subjectId,sourceId:'source-alpha',sourceUrl:'https://example.com/research',collectedAt:'2026-01-31T00:00:00.000Z',eventAt:'2026-01-30T12:00:00.000Z',metric,value,unit:'index-0-100',region:'IN',periodStart:'2026-01-01T00:00:00.000Z',periodEnd:'2026-01-30T00:00:00.000Z',evidenceDigest:'a'.repeat(64),provenance:{method:'manual',reference:'synthetic-document'},missing:[]});
const batch=observations=>({idempotencyKey:'fixture-import',observations});
const weights={'demand-index':1,'competition-index':1,'feasibility-index':1};
const complete=subject=>[observation('demand-index',80,subject),observation('competition-index',20,subject),observation('feasibility-index',60,subject)];

test('connection-free intake produces detached candidate records and stable batch digests',()=>{
 const input=batch(complete('product-alpha'));const result=prepareMarketImport(input);
 assert.equal(result.observations.length,3);assert.equal(result.observations[0].status,'candidate');assert.equal(result.observations[0].reviewState,'unreviewed');
 assert.equal(result.sourceDigest,prepareMarketImport(batch([...input.observations].reverse())).sourceDigest);
 input.observations[0].value=2;assert.equal(result.observations.find(x=>x.metric==='demand-index').value,80);assert.ok(Object.isFrozen(result.observations[0]));
});
test('intake rejects malformed and future input, units, values and approval or commercial laundering',()=>{
 for(const patch of [{sourceUrl:'http://example.com'},{sourceUrl:'https://user:pass@example.com'},{sourceUrl:'https://example.com/#private'},{subjectId:'../foreign'},{eventAt:'2999-01-01T00:00:00.000Z'},{collectedAt:'2026-02-30T00:00:00.000Z'},{metric:'profit-forecast'},{unit:'invented-unit'},{unit:'count',value:1.5},{value:NaN},{value:-1},{value:101},{approved:true},{status:'verified'},{affiliateUrl:'https://example.com'},{commission:900},{provenance:{method:'manual',reference:null}}])assert.throws(()=>prepareMarketImport(batch([{...observation(),...patch}])));
 let read=false;const input=Object.defineProperty({},'observations',{enumerable:true,get(){read=true;return [];}});assert.throws(()=>prepareMarketImport(input));assert.equal(read,false);
});
test('explicit missing provenance is retained and opportunity analysis returns UNKNOWN',()=>{
 const incomplete={...observation(),sourceId:null,evidenceDigest:null,provenance:{method:'manual',reference:null},missing:['sourceId','evidenceDigest','sourceReference']};
 const prepared=prepareMarketImport(batch([incomplete]));
 const result=analyzeMarketObservations({observations:prepared.observations,weights,mode:'opportunity'});assert.equal(result.opportunities[0].score,null);assert.equal(result.opportunities[0].status,'UNKNOWN');
});
test('weighted candidate scores reproduce exactly and ties have stable subject ordering',()=>{
 const records=prepareMarketImport(batch([...complete('product-beta'),...complete('product-alpha')])).observations;
 const result=analyzeMarketObservations({observations:records,weights,mode:'opportunity'});
 assert.deepEqual(result.opportunities.map(x=>x.subjectId),['product-alpha','product-beta']);assert.equal(result.opportunities[0].score,73.33);assert.equal(result.opportunities[0].status,'provisional');
 assert.equal(result.opportunities[0].evidenceConfidence,'UNKNOWN');assert.equal(result.opportunities[0].coverage.presentMetrics,3);assert.ok(result.opportunities[0].observationIds.length===3);
 assert.equal(result.inputDigest,analyzeMarketObservations({observations:[...records].reverse(),weights,mode:'opportunity'}).inputDigest);
});
test('weights, contradictory current evidence and incompatible comparisons fail safely',()=>{
 const records=prepareMarketImport(batch(complete('product-alpha'))).observations;
 for(const value of [0,-1,NaN,Infinity])assert.throws(()=>analyzeMarketObservations({observations:records,weights:{...weights,'demand-index':value},mode:'opportunity'}));
 assert.throws(()=>analyzeMarketObservations({observations:records,weights:{...weights,commission:1},mode:'opportunity'}));
 for(const patch of [{unit:'percent'},{periodStart:'2026-01-02T00:00:00.000Z'}]){
  const input=complete('product-alpha');input[0]={...input[0],...patch};const changed=prepareMarketImport(batch(input)).observations;
  assert.equal(analyzeMarketObservations({observations:changed,weights,mode:'opportunity'}).opportunities[0].score,null);
 }
 const conflict=observation('demand-index',20);conflict.seriesId='conflicting-series';
 const changed=prepareMarketImport(batch([...complete('product-alpha'),conflict])).observations;
 assert.equal(analyzeMarketObservations({observations:changed,weights,mode:'opportunity'}).opportunities[0].status,'UNKNOWN');
});
test('seasonal and historical analysis reports insufficient evidence without invented forecasts',()=>{
 const records=prepareMarketImport(batch(complete('product-alpha'))).observations;
 for(const mode of ['seasonal','historical'])assert.equal(analyzeMarketObservations({observations:records,weights,mode}).status,'insufficient-evidence');
});
test('market implementation, private records and score envelopes cannot enter static output',()=>{
 for(const file of [{path:'assets/code.js',content:'prepareMarketImport'},{path:'market_observations.json',content:'{}'},{path:'assets/data.json',content:'{"kind":"manual-market-observation-v1"}'},{path:'platform/market/scoring.mjs',content:'code'},{path:'assets/code.js',content:'openMarketObservationStore'},{path:'assets/code.js',content:'normalizeMarketObservation'},{path:'assets/data.json',content:'{"kind":"manual-market-subject-v1"}'}])assert.equal(auditLocalControlPlaneExport([file]).violations.length,1);
});
test('analysis digests bind normalized weights, mode and formula inputs',()=>{
 const records=prepareMarketImport(batch(complete('product-alpha'))).observations;
 const original=analyzeMarketObservations({observations:records,weights,mode:'opportunity'});
 const changed=analyzeMarketObservations({observations:records,weights:{...weights,'demand-index':2},mode:'opportunity'});
 assert.notEqual(original.inputDigest,changed.inputDigest);assert.notEqual(original.opportunities[0].inputDigest,changed.opportunities[0].inputDigest);
 assert.notEqual(original.inputDigest,analyzeMarketObservations({observations:records,weights,mode:'seasonal'}).inputDigest);
});
test('public normalizer rejects nonfinite and unsupported reference clocks',()=>{
 for(const clock of [Infinity,NaN,'2999',0,Date.UTC(2999,0,1)])assert.throws(()=>normalizeMarketObservation(observation(),clock));
});
test('manual source URLs follow the existing no-query and no-port evidence policy',()=>{
 for(const sourceUrl of ['https://example.com/research?access_token=synthetic-value','https://example.com:8443/research'])assert.throws(()=>prepareMarketImport(batch([{...observation(),sourceUrl}])));
});
test('pure analysis rejects reassigned series identity and conflicting included ancestors',()=>{
 const original=prepareMarketImport(batch(complete('product-alpha'))).observations;
 const parent=original.find(record=>record.metric==='demand-index');
 for(const patch of [{subjectId:'product-beta'},{sourceId:'source-beta'},{metric:'competition-index'},{region:'US'},{supersedesId:'unknown-parent'}]){
  const next={...parent,revision:2,supersedesId:parent.id,...patch};delete next.id;
  assert.throws(()=>analyzeMarketObservations({observations:[...original,next],weights,mode:'opportunity'}));
 }
});
test('migration six binds canonical SQL and preserves released migration five bytes',()=>{
 const bytes=readFileSync(new URL('../src/platform/persistence/migrations/0006_market_observations.sql',import.meta.url));
 const manifest=JSON.parse(readFileSync(new URL('../src/platform/persistence/migrations/market-manifest.json',import.meta.url)));
 assert.equal(verifyMarketMigration(bytes,manifest),true);
 const changed=Buffer.concat([bytes,Buffer.from('-- changed')]);assert.throws(()=>verifyMarketMigration(changed,{...manifest,sha256:createHash('sha256').update(changed).digest('hex')}));
 const prior=readFileSync(new URL('../src/platform/persistence/migrations/0005_local_scheduler.sql',import.meta.url));assert.equal(createHash('sha256').update(prior.toString().replace(/\r\n/g,'\n')).digest('hex'),'f7af6a542fe0645349eb078365437b2b3725adc16365011e0044c6596f5627ec');
});
