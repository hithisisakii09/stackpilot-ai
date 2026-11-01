import test from 'node:test';
import assert from 'node:assert/strict';
import {planSeoAuditScope,formatSeoAuditScopeReport} from '../src/lib/seo-audit-scope.mjs';
const sample=(overrides={})=>({
 rootPages:'80',folderPages:'20',subdomainPages:'40',pageCap:'90',
 includeFolders:true,includeSubdomains:false,...overrides
});
test('counts mutually exclusive selected URL groups and flags an over-cap plan',()=>{
 const r=planSeoAuditScope(sample());
 assert.equal(r.includedPages,100);
 assert.equal(r.excludedPages,40);
 assert.equal(r.excessPages,10);
 assert.equal(r.remainingPages,0);
 assert.equal(r.status,'ABOVE_USER_CAP');
 assert.equal(r.pageCap,90);
});
test('opt-in subdomains add selected URLs without double counting',()=>{
 const r=planSeoAuditScope(sample({includeSubdomains:true}));
 assert.equal(r.includedPages,140);
 assert.equal(r.excludedPages,0);
 assert.equal(r.excessPages,50);
});
test('under user-entered cap remains planning-only, not a vendor allowance assertion',()=>{
 const r=planSeoAuditScope(sample({pageCap:'200'}));
 assert.equal(r.status,'WITHIN_USER_CAP');
 assert.equal(r.remainingPages,100);
 assert.equal(r.excessPages,0);
 assert.equal(r.providerAllowanceVerified,false);
 assert.equal(r.crawlCredits,null);
 assert.equal(r.verified,false);
});
test('zero selected URLs never produces a misleading within-cap result',()=>{
 const r=planSeoAuditScope(sample({rootPages:'0',folderPages:'0',subdomainPages:'0'}));
 assert.equal(r.status,'EMPTY_SCOPE');
 assert.equal(r.includedPages,0);
 assert.equal(r.remainingPages,90);
});
test('optional categories remain excluded if toggles are unchecked',()=>{
 const r=planSeoAuditScope(sample({includeFolders:false,includeSubdomains:false,pageCap:'80'}));
 assert.equal(r.includedPages,80);
 assert.equal(r.excludedPages,60);
 assert.equal(r.status,'WITHIN_USER_CAP');
});
test('strict counts reject numbers with commas, leading zeros, signs or unsafe precision',()=>{
 for(const value of ['', '01',' 1 ','-1','1.1','1e4','1,000','1000001',null,1.5,Number.MAX_SAFE_INTEGER,Infinity]){
  assert.throws(()=>planSeoAuditScope(sample({rootPages:value})),/invalid|count|range|integer/i,String(value));
 }
});
test('strict schema rejects missing fields, extra vendor fields and string booleans',()=>{
 const missing=sample();delete missing.folderPages;
 assert.throws(()=>planSeoAuditScope(missing),/field|invalid|schema/i);
 assert.throws(()=>planSeoAuditScope({...sample(),vendorName:'Semrush'}),/field|invalid|schema/i);
 assert.throws(()=>planSeoAuditScope(sample({includeSubdomains:'true'})),/boolean|invalid/i);
 assert.throws(()=>planSeoAuditScope(null),/invalid|field|schema/i);
});
test('report stays explicitly unverified and free of provider or crawl-credit promises',()=>{
 const input=sample();const original=structuredClone(input);
 const result=planSeoAuditScope(input);
 const report=formatSeoAuditScopeReport(result);
 assert.deepEqual(input,original);
 assert.match(report,/100/);
 assert.match(report,/40/);
 assert.match(report,/10/);
 assert.match(report,/user.entered/i);
 assert.match(report,/not (?:a )?crawl/i);
 assert.match(report,/unknown|unverified/i);
 assert.doesNotMatch(report,/Semrush|Ahrefs|HubSpot|commission|guaranteed|verified allowance|https?:\/\//i);
});
test('report rejects unsourced status or invented vendor confirmation',()=>{
 const r=planSeoAuditScope(sample());
 assert.throws(()=>formatSeoAuditScopeReport({...r,providerAllowanceVerified:true}),/unverified|invalid|report/i);
 assert.throws(()=>formatSeoAuditScopeReport({...r,crawlCredits:200}),/unverified|invalid|report/i);
});
