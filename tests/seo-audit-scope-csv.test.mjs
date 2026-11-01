import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as scope from '../src/lib/seo-audit-scope.mjs';

const input=(other={})=>({
 rootPages:'80',folderPages:'20',subdomainPages:'40',pageCap:'90',
 includeFolders:true,includeSubdomains:false,...other
});
const exportCsv=entered=>scope.formatSeoAuditScopeCsv(scope.planSeoAuditScope(entered));

test('SEO scope CSV is deterministic and contains true count boundaries only',()=>{
 assert.equal(typeof scope.formatSeoAuditScopeCsv,'function');
 const csv=exportCsv(input());
 assert.equal(csv,exportCsv(input()));
 assert.match(csv,/^metric,value,verification_status\r\n/);
 assert.match(csv,/"planned_included_urls","100","User-entered only"\r\n/);
 assert.match(csv,/"excluded_inventory_urls","40","User-entered only"\r\n/);
 assert.match(csv,/"excess_above_user_cap","10","Not a vendor allowance"\r\n/);
 assert.match(csv,/"provider_allowance","UNVERIFIED","UNVERIFIED"\r\n/);
 assert.match(csv,/"provider_crawl_credits","","UNKNOWN"\r\n/);
 assert.ok(csv.endsWith('\r\n'));
 assert.ok(csv.split('\r\n').filter(Boolean).every(line=>line==='metric,value,verification_status'||line.split(',').length===3));
});

test('excluded subdomains can become included, and all rows remain neutral',()=>{
 assert.equal(typeof scope.formatSeoAuditScopeCsv,'function');
 const csv=exportCsv(input({includeSubdomains:true}));
 assert.match(csv,/"planned_included_urls","140","User-entered only"/);
 assert.match(csv,/"excluded_inventory_urls","0","User-entered only"/);
 assert.match(csv,/"excess_above_user_cap","50","Not a vendor allowance"/);
 assert.doesNotMatch(csv,/https?:|Semrush|Ahrefs|affiliate|guaranteed|approved plan|=HYPERLINK|@SUM/i);
});

test('empty inventory remains EMPTY_SCOPE rather than vendor-cap approval',()=>{
 assert.equal(typeof scope.formatSeoAuditScopeCsv,'function');
 const csv=exportCsv(input({rootPages:'0',folderPages:'0',subdomainPages:'0'}));
 assert.match(csv,/"scope_status","EMPTY_SCOPE","Unverified estimate"/);
 assert.match(csv,/"provider_allowance","UNVERIFIED","UNVERIFIED"/);
});

test('reject forged audit outputs, imported claims and inconsistent arithmetic',()=>{
 assert.equal(typeof scope.formatSeoAuditScopeCsv,'function');
 const valid=scope.planSeoAuditScope(input());
 for(const changed of [
  {...valid,includedPages:1},
  {...valid,excessPages:0},
  {...valid,status:'WITHIN_USER_CAP'},
  {...valid,providerAllowanceVerified:true},
  {...valid,verified:true},
  {...valid,crawlCredits:99},
  {...valid,extraVendorClaim:'approved'},
  {...valid,rootPages:100},
  {...valid,pageCap:-1},
  null
 ]){
  assert.throws(()=>scope.formatSeoAuditScopeCsv(changed),/invalid|unverified|result|field|count/i);
 }
});

test('private UI offers local CSV download and disables stale export',()=>{
 const page=readFileSync('src/pages/tools/seo-audit-scope/index.astro','utf8');
 assert.match(page,/id="seo-download"[^>]*disabled/);
 assert.match(page,/formatSeoAuditScopeCsv/);
 assert.match(page,/new Blob\(/);
 assert.match(page,/URL\.createObjectURL/);
 assert.match(page,/URL\.revokeObjectURL/);
 assert.match(page,/stackpilot-seo-audit-scope\.csv/);
 assert.match(page,/download\.disabled=true/);
 assert.match(page,/form\.addEventListener\('input'/);
 assert.match(page,/form\.addEventListener\('change'/);
 assert.match(page,/form\.addEventListener\('reset'/);
 assert.match(page,/Netlify Web Analytics/i);
 assert.match(page,/does not receive the entered counts/i);
 assert.doesNotMatch(page,/There is no .*third-party tracking|No analytics are enabled/i);
});
