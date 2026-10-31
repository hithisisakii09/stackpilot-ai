import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';

const route='src/pages/guides/hosting-migration-checklist/index.astro';
test('hosting migration guide exists as safely protected static buyer education',()=>{
 assert.ok(existsSync(route),'Hosting migration guide must exist');
 const html=readFileSync(route,'utf8');
 assert.match(html,/<meta name="robots" content="noindex, nofollow"/);
 assert.match(html,/<h1>Hosting migration checklist/);
 assert.match(html,/not a vendor endorsement/i);
 assert.match(html,/not guarantee uninterrupted service/i);
 assert.doesNotMatch(html,/<script|<form|https?:\/\/|affiliateUrl|tracking pixel/i);
});
test('hosting guide covers operational cutover risks and evidence-based checkpoints',()=>{
 const html=readFileSync(route,'utf8');
 for(const topic of ['DNS','MX','SPF','DKIM','backups','restore','TLS','redirects','dependencies','staging','rollback','monitoring','billing','data retention','GO\/NO-GO']){
   assert.match(html,new RegExp(topic,'i'),topic);
 }
 assert.match(html,/href="\/tools\/requirements-checklist\/"/);
 assert.match(html,/href="\/tools\/software-cost-calculator\/"/);
 assert.match(html,/href="\/methodology\/"/);
});
test('hosting guide is findable from the private homepage and supports keyboard accessible mobile checklists',()=>{
 const html=readFileSync(route,'utf8');
 assert.match(readFileSync('src/pages/index.astro','utf8'), /href="\/guides\/hosting-migration-checklist\/"/);
 assert.match(html,/<nav aria-label="Site navigation">/);
 assert.match(html,/<ul[^>]*>/);
 assert.match(html,/aria-labelledby="cutover-gates"/);
 assert.match(html,/<th scope="col">/);
 assert.match(html,/tabindex="0"/);
});
