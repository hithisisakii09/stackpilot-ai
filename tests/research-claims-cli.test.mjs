import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

const run = file=>JSON.parse(execFileSync(process.execPath,[file,'--json'],{encoding:'utf8'}));
test('vendor-doc claim report exposes six candidate records with zero approvals',()=>{
 const r=run('scripts/research-claims-report.mjs');
 assert.equal(r.reportKind,'unapproved-vendor-documentation-intake');
 assert.equal(r.sourcesRecordedForReview,6);
 assert.equal(r.productsAwaitingReview,6);
 assert.equal(r.approvedClaims,0);
 assert.equal(r.reviewedOn,null);
 assert.equal(r.independentTestingCompleted,false);
 assert.equal(r.queue.length,6);
});
test('no recommendation, affiliate, or unsupported price gets enabled',()=>{
 const r=run('scripts/research-claims-report.mjs');
 assert.equal(r.monetizationEnabled,false);
 assert.ok(r.queue.every(p=>p.approvedClaims===0&&p.status==='Unreviewed'));
 const products=JSON.parse(readFileSync('src/data/products.json','utf8'));
 assert.ok(products.every(p=>p.verified===false&&p.affiliateUrl===null&&p.pricing.amount===null));
});
test('operations report includes candidate counts but keeps public/paid gates disabled',()=>{
 const r=run('scripts/ops-report.mjs');
 assert.equal(r.vendorClaimIntake.sourceBackedCandidates,6);
 assert.equal(r.vendorClaimIntake.productsAwaitingEditorialReview,6);
 assert.equal(r.vendorClaimIntake.approvedClaims,0);
 assert.equal(r.vendorClaimIntake.independentTestingCompleted,false);
 assert.equal(r.canPublish,false);
 assert.equal(r.canMonetize,false);
 assert.equal(r.canSpend,false);
});
test('candidate source domains remain scoped to vendor-specific first-party docs',()=>{
 const items=JSON.parse(readFileSync('src/data/research-claims.json','utf8'));
 const hosts={hubspot:'knowledge.hubspot.com',pipedrive:'support.pipedrive.com',ahrefs:'help.ahrefs.com',semrush:'www.semrush.com',kinsta:'kinsta.com',cloudways:'support.cloudways.com'};
 assert.deepEqual(new Set(items.map(x=>x.productId)),new Set(Object.keys(hosts)));
 for(const item of items){
  const u=new URL(item.sourceUrl);
  assert.equal(u.hostname,hosts[item.productId]);
  assert.equal(u.protocol,'https:');
  assert.equal(item.status,'candidate');
  assert.equal(item.approved,false);
  assert.equal(item.reviewer,null);
 }
});
