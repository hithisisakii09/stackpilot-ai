import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const route='src/pages/guides/crm-migration-checklist/index.astro';
test('CRM migration guide is protected prelaunch content',()=>{
 assert.ok(existsSync(route));
 const html=readFileSync(route,'utf8');
 assert.match(html,/<meta name="robots" content="noindex, nofollow"/);
 assert.match(html,/<h1>CRM migration checklist/);
 assert.match(html,/not a verified feature comparison/i);
 assert.doesNotMatch(html,/<script|<form|https?:\/\/|affiliateUrl|tracking pixel/i);
});
test('CRM migration guide contains actionable safe steps and existing tools',()=>{
 const html=readFileSync(route,'utf8');
 for(const item of ['export','custom field','permissions','deduplication','encoding','attachments','activity history','rollback','staff hours','retention','privacy','sample import']){
  assert.match(html,new RegExp(item,'i'),item);
 }
 assert.match(html,/href="\/tools\/requirements-checklist\/"/);
 assert.match(html,/href="\/tools\/software-cost-calculator\/"/);
 assert.match(html,/href="\/methodology\/"/);
});

test('CRM migration guide contains a measurable synthetic-data acceptance matrix',()=>{
 const html=readFileSync(route,'utf8');
 for(const item of ['Acceptance matrix','Source count','Target count','Owner or role','Association integrity','Pass or fail','Cutover approval']){
  assert.match(html,new RegExp(item,'i'),item);
 }
 assert.match(html,/synthetic/i);
 assert.match(html,/no real customer data/i);
});
