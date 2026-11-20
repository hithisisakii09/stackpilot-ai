import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizePricingObservation, pricingClaimStatement} from '../src/platform/products/pricing-history.mjs';
import {projectPricingHistory} from '../src/platform/products/projection.mjs';
import * as migrations from '../src/platform/persistence/migrate.mjs';
import {auditLocalControlPlaneExport} from '../src/lib/local-control-plane-export.mjs';

const nowMs=Date.UTC(2026,10,15);
const observation=(patch={})=>({id:'price-alpha',productId:'product-test',claimId:'claim-alpha',agentId:'qa-agent',sourceId:'source-alpha',sourceUrl:'https://example.com/pricing',sourceDigest:'a'.repeat(64),observedAt:'2026-11-13T00:00:00.000Z',collectedAt:'2026-11-14T00:00:00.000Z',expiresAt:'2026-11-20T00:00:00.000Z',plan:'Professional',region:'IN',currency:'INR',amountMinor:10000,billingPeriod:'month',unit:'seat',taxTreatment:'excluded',manualReference:'synthetic-only',...patch});
const project=(observations,eligibleIds=observations.map(row=>row.id))=>projectPricingHistory({observations,eligibleIds,nowMs});

test('manual pricing retains all context and is immutable candidate data',()=>{
  const record=normalizePricingObservation(observation(),{nowMs});
  assert.equal(record.amountMinor,10000);assert.equal(record.status,'candidate');assert.equal(record.reviewState,'unreviewed');
  assert.equal(Object.isFrozen(record),true);
  assert.match(pricingClaimStatement(observation(),{nowMs}),/^Pricing observation v1 /);
  assert.notEqual(pricingClaimStatement(observation(),{nowMs}),pricingClaimStatement(observation({amountMinor:20000}),{nowMs}));
});

test('pricing rejects invalid money, currencies, context and commercial authority injection',()=>{
  for(const patch of [{amountMinor:-1},{amountMinor:0.1},{amountMinor:Number.MAX_SAFE_INTEGER},{currency:'usd'},{currency:'ZZZ'},{region:'India'},{billingPeriod:'weekly'},{unit:'user'},{taxTreatment:'calculated'},{approved:true},{affiliateUrl:'https://example.com/track'},{commission:30}]) assert.throws(()=>normalizePricingObservation(observation(patch),{nowMs}));
});

test('source chronology, expiry, digest and hostile descriptors fail closed',()=>{
  for(const patch of [{collectedAt:'2099-01-01T00:00:00.000Z'},{observedAt:'2026-11-15T00:00:00.000Z'},{expiresAt:'2026-11-13T00:00:00.000Z'},{expiresAt:'2027-11-20T00:00:00.000Z'},{sourceDigest:'invalid'},{sourceUrl:'https://127.0.0.1/'}]) assert.throws(()=>normalizePricingObservation(observation(patch),{nowMs}));
  const hostile=observation();Object.defineProperty(hostile,'plan',{enumerable:true,get(){throw new Error('getter');}});
  assert.throws(()=>normalizePricingObservation(hostile,{nowMs}),/Invalid platform contract/);
});

test('fresh collection cannot renew the validity of an ancient observed price',()=>{
  assert.throws(()=>normalizePricingObservation(observation({observedAt:'2000-01-01T00:00:00.000Z'}),{nowMs}));
});

test('latest unreviewed observations suppress older eligible prices in the same exact context',()=>{
  const old=observation(),latest=observation({id:'price-beta',claimId:'claim-beta',observedAt:'2026-11-14T00:00:00.000Z',amountMinor:20000});
  const result=project([old,latest],['price-alpha']);
  assert.equal(result[0].status,'UNKNOWN');assert.equal(result[0].amountMinor,null);assert.equal(result[0].reason,'unreviewed-latest-observation');
});

test('expired, ambiguous and incomplete context always yields UNKNOWN',()=>{
  assert.equal(project([observation({expiresAt:'2026-11-14T12:00:00.000Z'})])[0].status,'UNKNOWN');
  assert.equal(project([observation(),observation({id:'price-beta',claimId:'claim-beta'})])[0].reason,'ambiguous-latest-observation');
  for(const patch of [{amountMinor:null},{currency:null},{billingPeriod:'unknown'},{unit:'unknown'},{taxTreatment:'unknown'}]) assert.equal(project([observation(patch)])[0].amountMinor,null);
});

test('free prices are explicit and currencies, periods and regions stay separate',()=>{
  const rows=[observation({amountMinor:0}),observation({id:'price-usd',claimId:'claim-usd',region:'US',currency:'USD',billingPeriod:'year'})];
  const result=project(rows);
  assert.equal(result.length,2);assert.equal(result.find(row=>row.currency==='INR').amountMinor,0);
  assert.equal(result.find(row=>row.currency==='USD').amountMinor,10000);
  assert.ok(result.every(row=>row.status==='reviewed-observation'));
  assert.deepEqual(result,project([...rows].reverse()));
});

test('projection validates bounds, duplicate identities and unknown eligibility IDs',()=>{
  assert.throws(()=>project([observation(),observation()]));
  assert.throws(()=>project([observation()],['price-foreign']));
  assert.throws(()=>project(Array(101).fill(observation())));
});

test('migration ten and static export bind canonical private implementation',()=>{
  assert.equal(typeof migrations.verifyPricingMigration,'function');
  const bytes=readFileSync(new URL('../src/platform/persistence/migrations/0010_pricing_observations.sql',import.meta.url));
  const manifest=JSON.parse(readFileSync(new URL('../src/platform/persistence/migrations/pricing-manifest.json',import.meta.url)));
  assert.equal(migrations.verifyPricingMigration(bytes,manifest),true);
  assert.throws(()=>migrations.verifyPricingMigration(Buffer.concat([bytes,Buffer.from('-- drift')]),manifest));
  for(const file of [{path:'pricing_observations.json',content:''},{path:'assets/app.js',content:'createProductProjectionService createPricingHistoryService inspectClaimLifecycle manual-pricing-observation-v1'}]) assert.equal(auditLocalControlPlaneExport([file]).violations.length,1);
});
