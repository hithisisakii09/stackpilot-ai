import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPrivatePreviewManifest } from '../src/lib/preview-package.mjs';
import { readFileSync } from 'node:fs';

const policy = () => JSON.parse(readFileSync(new URL('../config/operating-policy.json', import.meta.url)));
const sha = '00cc655c812db62ddc684e1609094fe771d705cf';
const files = () => [
 { path:'index.html', bytes:1024, sha256:'a'.repeat(64) },
 { path:'compare/index.html', bytes:512, sha256:'b'.repeat(64) },
 { path:'research/index.html', bytes:512, sha256:'c'.repeat(64) },
 { path:'robots.txt', bytes:28, sha256:'d'.repeat(64) },
 { path:'_headers', bytes:248, sha256:'e'.repeat(64) }
];

test('private preview manifest always reports nonpublication', () => {
 const out = buildPrivatePreviewManifest(files(), policy(), sha);
 assert.equal(out.sourceCommit, sha);
 assert.equal(out.mode,'private-preview-build-package');
 assert.equal(out.productionPromoted, false);
 assert.equal(out.publicLaunchAuthorized, false);
 assert.equal(out.affiliateActivationAuthorized, false);
 assert.equal(out.delegatedSpendINR, 0);
 assert.equal(out.files.length, files().length);
});
test('private preview manifest sorts content and never mutates inputs', () => {
 const original = files().reverse(); const before=structuredClone(original);
 const out=buildPrivatePreviewManifest(original,policy(),sha);
 assert.deepEqual(original,before);
 assert.deepEqual(out.files.map(f=>f.path), [...out.files.map(f=>f.path)].sort());
});
test('requires important published static assets', () => {
 for (const required of ['index.html','robots.txt','_headers','compare/index.html','research/index.html']) {
   assert.throws(()=>buildPrivatePreviewManifest(files().filter(f=>f.path!==required),policy(),sha),/missing/i);
 }
});
test('rejects unsafe path and duplicate content', () => {
 const bad=files();
 bad.push({path:'../private.env',bytes:4,sha256:'f'.repeat(64)});
 assert.throws(()=>buildPrivatePreviewManifest(bad,policy(),sha),/path/i);
 const double=files(); double.push({...double[0]});
 assert.throws(()=>buildPrivatePreviewManifest(double,policy(),sha),/duplicate/i);
});
test('rejects disallowed file types and invalid hashes', () => {
 const bad=files(); bad[0].path='.env';
 assert.throws(()=>buildPrivatePreviewManifest(bad,policy(),sha),/path/i);
 const invalid=files(); invalid[0].sha256='bogus';
 assert.throws(()=>buildPrivatePreviewManifest(invalid,policy(),sha),/hash/i);
});
test('rejects non-zero spending and unapproved public launch', () => {
 for (const [key,value] of Object.entries({
   monthlyBudgetINR:100, delegatedSpendINR:10, productionLaunchApproved:false,
   affiliateActivationApproved:true, paidServicesApproved:true,
   commercialHostingApproved:true
 })) {
   const updated={...policy(),[key]:value};
   assert.throws(()=>buildPrivatePreviewManifest(files(),updated,sha),/policy|authorization|budget/i,key);
 }
});
test('invalid source commit is not accepted', () => {
 assert.throws(()=>buildPrivatePreviewManifest(files(),policy(),'main'),/commit/i);
 assert.throws(()=>buildPrivatePreviewManifest(files(),policy(),'../a'),/commit/i);
});
test('deployment workflow cannot push production or spend money', () => {
 const w=readFileSync(new URL('../.github/workflows/agent-ops.yml',import.meta.url),'utf8');
 assert.match(w,/permissions:\s*\n\s*contents:\s*read/);
 assert.match(w,/stackpilot-private-preview-package/);
 assert.match(w,/retention-days:\s*3/);
 assert.match(w,/create-private-preview-package\.mjs/);
 assert.doesNotMatch(w,/NETLIFY_AUTH_TOKEN|netlify deploy|netlify-cli|--prod|NETLIFY_SITE_ID|pull-requests:\s*write/);
});

test('private preview packaging admits the CRM guide while retaining baseline and noindex guards', () => {
 const script=readFileSync(new URL('../scripts/create-private-preview-package.mjs',import.meta.url),'utf8');
 assert.match(script,/htmlCount >= 15/);
 assert.match(script,/guides\/crm-migration-checklist\/index\.html/);
 assert.match(script,/Missing page noindex/);
 assert.match(script,/Unapproved affiliate URLs or editorial claims found/);
 assert.doesNotMatch(script,/assert\.equal\(htmlCount,\s*15/);
});
