import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const path='src/pages/tools/hosting-cutover-gates/index.astro';
const page=()=>existsSync(path)?readFileSync(path,'utf8'):'';
test('private hosting cutover gate assessor route exists and opts out of search',()=>{
 assert.ok(existsSync(path),'Expected /tools/hosting-cutover-gates/ private route');
 assert.match(page(),/<meta name="robots" content="noindex, nofollow"/);
 assert.match(page(),/<h1[^>]*>Hosting cutover gate assessor/i);
 assert.match(page(),/not an authorization/i);
});
test('all five gates require labelled selectors with unknown as default',()=>{
 for(const key of ['dnsEmail','backupRestore','tlsDependencies','rollbackAuthority','retentionBilling']){
  assert.match(page(),new RegExp('id="gate-'+key+'"'),key);
  assert.match(page(),new RegExp('for="gate-'+key+'"'),key+' label');
  assert.match(page(),new RegExp('name="'+key+'"'),key+' name');
 }
 assert.match(page(),/value="not-assessed"/);
 assert.match(page(),/value="pass"/);
 assert.match(page(),/value="fail"/);
});
test('local-only export, stale-state reset and hosting-layer privacy are disclosed',()=>{
 const html=page();
 for(const id of ['gate-form','gate-status','gate-report','gate-download','gate-copy']){
  assert.match(html,new RegExp('id="'+id+'"'),id);
 }
 assert.match(html,/assessHostingCutover/);
 assert.match(html,/formatHostingCutoverReport/);
 assert.match(html,/formatHostingCutoverCsv/);
 assert.match(html,/download\.disabled=true/);
 assert.match(html,/type="reset"/);
 assert.match(html,/aria-live="polite"/);
 assert.match(html,/new Blob\(/);
 assert.match(html,/URL\.revokeObjectURL/);
 assert.match(html,/Netlify Web Analytics/i);
 assert.match(html,/does not receive these selections/i);
 assert.doesNotMatch(html,/https?:\/\/|<iframe|<form[^>]*action=|affiliateUrl|commission|approved for cutover/i);
});
test('homepage and hosting guide link the tool and Chromium QA exercises it',()=>{
 const home=readFileSync('src/pages/index.astro','utf8');
 const guide=readFileSync('src/pages/guides/hosting-migration-checklist/index.astro','utf8');
 const qa=readFileSync('scripts/browser-acceptance.mjs','utf8');
 for(const html of [home,guide,qa])assert.match(html,/\/tools\/hosting-cutover-gates\//);
 assert.match(qa,/gate-report/);
 assert.match(qa,/gate-download/);
});
