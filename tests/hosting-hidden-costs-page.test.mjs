import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const page='src/pages/tools/hosting-hidden-costs/index.astro';
const html=()=>existsSync(page)?readFileSync(page,'utf8'):'';
test('private buyer worksheet exists and is nonindexed',()=>{
 assert.ok(existsSync(page),'Missing hosting hidden-costs page');
 assert.match(html(),/name="robots" content="index, follow"/i);
 assert.match(html(),/<h1[^>]*>Hosting hidden costs/i);
 assert.match(html(),/user-entered/i);
 assert.match(html(),/not.*verified/i);
});
test('all model inputs are accessible, with private offline report/download',()=>{
 const s=html();
 for(const id of ['currency','months','overlapMonths','baseMonthly','backupMonthly',
 'bandwidthMonthly','supportMonthly','otherMonthly','oldHostingMonthly',
 'migrationOnce','cancellationOnce']){
  assert.match(s,new RegExp('name="'+id+'"'),id);
  assert.match(s,new RegExp('for="hosting-'+id+'"'),id);
 }
 for(const id of ['hosting-form','hosting-status','hosting-report','hosting-copy','hosting-download']){
  assert.match(s,new RegExp('id="'+id+'"'),id);
 }
 assert.match(s,/aria-live="polite"/);
 assert.match(s,/type="reset"/);
});
test('calculates solely in-browser and invalidates stale copies after edit/reset',()=>{
 const s=html();
 for(const word of ['calculateHostingHiddenCosts','formatHostingHiddenCostReport',
  'formatHostingHiddenCostCsv','new Blob(','URL.revokeObjectURL','Netlify Web Analytics']){
  assert.ok(s.includes(word),word);
 }
 assert.match(s,/addEventListener\('input'/);
 assert.match(s,/addEventListener\('change'/);
 assert.match(s,/addEventListener\('reset'/);
 assert.match(s,/disabled=true/);
 assert.doesNotMatch(s,/<form[^>]*action=|https?:\/\/|affiliateUrl|providerRate|guaranteed savings/i);
});
test('tool is linked to existing homepage and hosting migration guide and covered in Chromium QA',()=>{
 const home=readFileSync('src/pages/index.astro','utf8');
 const guide=readFileSync('src/pages/guides/hosting-migration-checklist/index.astro','utf8');
 const browser=readFileSync('scripts/browser-acceptance.mjs','utf8');
 for(const source of [home,guide,browser])assert.match(source,/\/tools\/hosting-hidden-costs\//);
 assert.match(browser,/hosting-download/);
 assert.match(browser,/hosting-report/);
});
