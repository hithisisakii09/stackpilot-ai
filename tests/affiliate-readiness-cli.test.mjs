import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const run = script => JSON.parse(execFileSync(process.execPath,[script,'--json'],{encoding:'utf8'}));
test('affiliate queue represents all catalog products without invented partners', () => {
 const result=run('scripts/affiliate-readiness-report.mjs');
 assert.equal(result.reviewedPrograms,6);
 assert.equal(result.awaitingOfficialProgramDiscovery,0);
 assert.equal(result.queue.find(x=>x.productId==='ahrefs').researchStatus,'no-public-program-found');
 assert.equal(result.queue.find(x=>x.productId==='ahrefs').nextAction,'recheck-program-status');
 assert.deepEqual(result.queue.map(x=>x.productId), ['ahrefs','cloudways','hubspot','kinsta','pipedrive','semrush']);
 assert.ok(result.queue.every(x=>!x.affiliateReady && x.applicationStatus==='not-applied'));
});
test('partner research reporting does not imply earnings, approvals or tracked links', () => {
 const x=run('scripts/affiliate-readiness-report.mjs');
 assert.equal(x.applicationsSubmitted,0);
 assert.equal(x.programsAccepted,0);
 assert.equal(x.trackedLinksEnabled,0);
 assert.equal(x.verifiedEarnings,null);
 assert.equal(x.delegatedSpendINR,0);
 assert.equal(x.queue[0].sourceUrl,null);
});
test('autonomous ops report includes partner research yet keeps all launch gates closed', () => {
 const x=run('scripts/ops-report.mjs');
 assert.equal(x.affiliatePreparation.candidatePrograms,5);
 assert.equal(x.affiliatePreparation.discoveryGaps,0);
 assert.equal(x.affiliatePreparation.programsWithoutPublicAffiliateProgram,1);
 assert.equal(x.affiliatePreparation.reviewsDue,0);
 assert.equal(x.affiliatePreparation.applicationsSubmitted,0);
 assert.equal(x.affiliatePreparation.programsAccepted,0);
 assert.equal(x.affiliatePreparation.trackingLinksEnabled,0);
 assert.equal(x.affiliatePreparation.verifiedEarnings,null);
 assert.equal(x.canPublish,false);assert.equal(x.canMonetize,false);assert.equal(x.canSpend,false);
});
test('affiliate URLs in product catalog must remain null', () => {
 const products=JSON.parse(readFileSync('src/data/products.json','utf8'));
 assert.ok(products.every(p=>p.affiliateUrl===null));
 const partners=JSON.parse(readFileSync('src/data/affiliate-programs.json','utf8'));
 assert.ok(partners.every(x=>x.trackingUrl===null&&x.acceptedByProgram===false&&x.acceptedTerms===false));
});
