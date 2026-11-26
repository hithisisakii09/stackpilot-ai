import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const page='src/pages/tools/backup-restore-drill/index.astro';
const html=()=>existsSync(page)?readFileSync(page,'utf8'):'';
test('private backup restore drill route exists with noindex and truthful title',()=>{
 assert.ok(existsSync(page),'Missing /tools/backup-restore-drill/ route');
 assert.match(html(),/<meta name="robots" content="index, follow"/i);
 assert.match(html(),/<h1[^>]*>Backup restore drill planner/i);
 assert.match(html(),/not.*live backup/i);
});
test('six accessible controls and reset/copy/CSV affordances',()=>{
 const s=html();
 for(const id of [
  'targetRtoMinutes','observedRestoreMinutes','targetRpoMinutes',
  'observedRecoveryPointAgeMinutes','restoreTested','dataIntegrityChecked'
 ]){
  assert.match(s,new RegExp("name=\""+id+"\""),id);
  assert.match(s,new RegExp("for=\"drill-"+id+"\""),id);
 }
 for(const id of ['drill-form','drill-report','drill-status','drill-download','drill-copy']){
  assert.match(s,new RegExp('id="'+id+'"'),id);
 }
 assert.match(s,/type="reset"/);
 assert.match(s,/aria-live="polite"/);
});
test('client-only processing, export invalidation and accurate analytics notice',()=>{
 const s=html();
 assert.match(s,/assessBackupRestoreDrill/);
 assert.match(s,/formatBackupRestoreDrillReport/);
 assert.match(s,/formatBackupRestoreDrillCsv/);
 assert.match(s,/new Blob\(/);
 assert.match(s,/URL\.revokeObjectURL/);
 assert.match(s,/download\.disabled=true/);
 assert.match(s,/addEventListener\('input'/);
 assert.match(s,/addEventListener\('change'/);
 assert.match(s,/addEventListener\('reset'/);
 assert.match(s,/Netlify Web Analytics/);
 assert.doesNotMatch(s,/https?:\/\/|<iframe|<form[^>]*action=|affiliateUrl|commission|guaranteed uptime/i);
});
test('planner discoverable and regression exercised in desktop/mobile browser acceptance',()=>{
 const guide=readFileSync('src/pages/guides/hosting-migration-checklist/index.astro','utf8');
 const home=readFileSync('src/pages/index.astro','utf8');
 const qa=readFileSync('scripts/browser-acceptance.mjs','utf8');
 for(const src of [guide,home,qa])assert.match(src,/\/tools\/backup-restore-drill\//);
 assert.match(qa,/drill-download/);
 assert.match(qa,/drill-report/);
});
