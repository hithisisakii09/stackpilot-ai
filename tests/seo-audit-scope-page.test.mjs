import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const path='src/pages/tools/seo-audit-scope/index.astro';
const page=()=>existsSync(path)?readFileSync(path,'utf8'):'';
test('SEO scope worksheet is a separate non-indexed private static route',()=>{
 assert.ok(existsSync(path),'Expected /tools/seo-audit-scope/ Astro page');
 assert.match(page(),/<meta name="robots" content="noindex, nofollow"/i);
 assert.match(page(),/<h1[^>]*>SEO (?:site )?audit scope planner/i);
});
test('worksheet exposes six accessible fields with explicit copy and reset actions',()=>{
 for(const name of ['rootPages','folderPages','subdomainPages','pageCap','includeFolders','includeSubdomains']){
  assert.match(page(),new RegExp('name="'+name+'"'),name);
  assert.match(page(),new RegExp('for="seo-'+name+'"'),name+' label');
 }
 for(const id of ['seo-form','seo-report','seo-copy','seo-status'])assert.match(page(),new RegExp('id="'+id+'"'),id);
 assert.match(page(),/type="reset"/);
 assert.match(page(),/aria-live="polite"/);
});
test('tool is local-only and does not endorse vendors or infer crawl credit approval',()=>{
 const html=page();
 assert.match(html,/planSeoAuditScope/);
 assert.match(html,/formatSeoAuditScopeReport/);
 assert.match(html,/provider-specific/i);
 assert.match(html,/not a live crawl/i);
 assert.doesNotMatch(html,/https?:\/\/|<iframe|<form[^>]*action=|affiliateUrl|commission|Semrush|Ahrefs/i);
 assert.match(html,/Netlify Web Analytics is documented as enabled at the hosting layer/);
 assert.match(html,/does not receive the entered counts/);
 assert.doesNotMatch(html,/<script[^>]+src=["']https?:\/\//i);
});
test('homepage links to the tool, and Chromium acceptance covers it',()=>{
 const home=readFileSync('src/pages/index.astro','utf8');
 const qa=readFileSync('scripts/browser-acceptance.mjs','utf8');
 assert.match(home,/href="\/tools\/seo-audit-scope\/"/);
 assert.match(qa,/\/tools\/seo-audit-scope\//);
 assert.match(qa,/seo-report/);
});
