import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const path='src/pages/tools/crm-migration-readiness/index.astro';
const page=()=>existsSync(path)?readFileSync(path,'utf8'):'';
test('CRM migration worksheet is private noindex and explicitly never authorizes a cutover',()=>{
 assert.ok(existsSync(path));
 assert.match(page(),/<meta name="robots" content="noindex, nofollow"/);
 assert.match(page(),/CRM migration readiness/);
 assert.match(page(),/not authorization|not a migration authorization/i);
 assert.match(page(),/user-entered|self-reported/i);
});
test('labelled aggregate fields and five select gates require safe inputs',()=>{
 const html=page();
 for(const key of ['sourceRecordCount','targetRecordCount','cutoverWindowMinutes','measuredRollbackMinutes']){
  assert.match(html,new RegExp("id:'"+key+"'"),key+' declared input metadata');
 }
 for(const term of ['numericInputs.map',"for={'crm-'+field.id}","id={'crm-'+field.id}",'CRM_MIGRATION_GATES.map','value="not-assessed"','value="pass"','value="fail"','required']){
  assert.ok(html.includes(term),term);
 }
});
test('browser-only guarded report and CSV do not leak user data via form/network',()=>{
 const html=page();
 for(const term of ['id="crm-form"','id="crm-report"','id="crm-download"','id="crm-copy"','formatCrmMigrationReadinessCsv','assessCrmMigrationReadiness','formatCrmMigrationReadinessReport','new Blob(','URL.revokeObjectURL','type="reset"','aria-live="polite"','Netlify Web Analytics']){
  assert.ok(html.includes(term),term);
 }
 assert.match(html,/download\.disabled=true/);
 assert.doesNotMatch(html,/<form[^>]*action=|<iframe|fetch\(|XMLHttpRequest|localStorage|sessionStorage|affiliateUrl/i);
});
test('CRM guide and homepage navigate to functional route with integrated Chromium interaction',()=>{
 const home=readFileSync('src/pages/index.astro','utf8');
 const guide=readFileSync('src/pages/guides/crm-migration-checklist/index.astro','utf8');
 const qa=readFileSync('scripts/browser-acceptance.mjs','utf8');
 for(const html of [home,guide,qa])assert.match(html,/\/tools\/crm-migration-readiness\//);
 assert.match(qa,/#crm-report/);
 assert.match(qa,/stackpilot-crm-migration-readiness\.csv/);
});
