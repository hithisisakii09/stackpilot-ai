import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 EDITORIAL_ACTIONS,evaluateEditorialAuthorization,auditEditorialRuntimeSurface
} from '../src/lib/editorial-authorization.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const policy=JSON.parse(read('../config/operating-policy.json'));
const astro=read('../astro.config.mjs');
const netlify=read('../netlify.toml');
const paths=['src/pages/index.astro','src/pages/compare/[slug].astro',
 'src/pages/research/index.astro','src/lib/editorial-triage.mjs',
 'src/lib/editorial-receipt-integrity.mjs','scripts/validate.mjs',
 'public/_headers','netlify.toml'];

test('all future reviewer actions explicitly deny authorization until trusted auth exists',()=>{
 const expected=[
  'read-internal-packets','propose-source','record-needs-evidence',
  'record-rejection','verify-source','approve-claim','revoke-claim',
  'publish-comparison'
 ];
 assert.deepEqual(EDITORIAL_ACTIONS,expected);
 for(const action of EDITORIAL_ACTIONS){
  assert.deepEqual(evaluateEditorialAuthorization({action,policy}),{
   action,decision:'DENY',
   reviewerAuthenticated:false,verifiedReviewerRole:false,
   trustedSigningAuthority:false,independentAuditAvailable:false,
   sourceVerified:false,canPublish:false,
   reason:'No independently authenticated reviewer or approval authority is configured'
  });
 }
});

test('caller-controlled identities, roles, signatures and bypass flags cannot grant reviewer authority',()=>{
 const invalid=[
  {action:'approve-claim',policy,role:'admin'},
  {action:'approve-claim',policy,principal:'owner'},
  {action:'approve-claim',policy,authenticated:true},
  {action:'approve-claim',policy,signature:'fake'},
  {action:'approve-claim',policy,allow:true},
  {action:'approve-claim',policy,verified:true},
  {action:'approve-claim',policy,claims:[]},
  {action:'approve-claim',policy,session:{role:'reviewer'}}
 ];
 for(const request of invalid)assert.throws(()=>evaluateEditorialAuthorization(request),/unauthorized|fields|identity/i);
 assert.throws(()=>evaluateEditorialAuthorization({action:'approve-claim',policy:{...policy,productionLaunchApproved:true}}),/policy|restricted/i);
 assert.throws(()=>evaluateEditorialAuthorization({action:'publish-comparison',policy:{...policy,delegatedSpendINR:1}}),/policy|restricted/i);
 assert.throws(()=>evaluateEditorialAuthorization({action:'grant-owner-role',policy}),/action/i);
 assert.throws(()=>evaluateEditorialAuthorization({action:null,policy}),/action/i);
 assert.throws(()=>evaluateEditorialAuthorization({action:'approve-claim'}),/policy/i);
});

test('static source surface passes without any editorial API, middleware or serverless functions',()=>{
 assert.deepEqual(auditEditorialRuntimeSurface({paths,astroConfig:astro,netlifyConfig:netlify}),{
  status:'STATIC-ONLY-LOCKED',checkedPaths:paths.length,
  reviewerApiEnabled:false,authenticatedReviewerService:false,
  publisherEnabled:false,violations:[]
 });
});

test('reject accidental authenticated admin UI, backend endpoints and dynamic Astro pages',()=>{
 const cases=[
  'src/pages/api/approve.ts','src/pages/api/reviews.js',
  'src/pages/editorial/index.astro','src/pages/admin/index.astro',
  'src/pages/review/[id].astro','src/pages/compare/approve.ts',
  'src/pages/api/reviews.json','src/actions/index.ts',
  'src/middleware.ts','src/middleware.mjs',
  'netlify/functions/approve.js','netlify/edge-functions/reviewer.ts',
  'functions/review.js','api/editorial.mjs',
  'server/index.mjs','supabase/functions/approve/index.ts',
  'cloudflare/functions/approval.js',
  '.netlify/functions/internal-review.js'
 ];
 for(const path of cases){
  const result=auditEditorialRuntimeSurface({
   paths:[...paths,path],astroConfig:astro,netlifyConfig:netlify
  });
  assert.equal(result.status,'BLOCKED',path);
  assert.ok(result.violations.some(x=>x.includes(path)),path);
  assert.equal(result.reviewerApiEnabled,false);
  assert.equal(result.publisherEnabled,false);
 }
});

test('dynamic server output, adapters and Netlify function rewrites fail closed',()=>{
 const changes=[
  {astroConfig:"import { defineConfig } from 'astro/config';\nexport default defineConfig({ output: 'server' });\n"},
  {astroConfig:"import { defineConfig } from 'astro/config';\nexport default defineConfig({ output: 'static', adapter: fake() });\n"},
  {netlifyConfig:netlify+'\n[functions]\n  directory = "netlify/functions"\n'},
  {netlifyConfig:netlify+'\n[[edge_functions]]\n  path = "/api/*"\n'},
  {netlifyConfig:netlify+'\n[[redirects]]\n  from = "/api/*"\n  to = "/.netlify/functions/reviews"\n'},
  {netlifyConfig:netlify+'\n[[redirects]]\n  from = "/review"\n  to = "https://example.com/approve"\n'}
 ];
 for(const change of changes){
  const report=auditEditorialRuntimeSurface({paths,astroConfig:astro,netlifyConfig:netlify,...change});
  assert.equal(report.status,'BLOCKED');
  assert.ok(report.violations.length>0);
 }
});

test('no ambiguous paths, duplicates or malformed source inventory',()=>{
 for(const candidate of [
  [...paths,paths[0]],[...paths,'../server/approve.ts'],
  [...paths,'/absolute/server.ts'],[...paths,'src\\pages\\admin\\index.astro']
 ]){
  assert.throws(()=>auditEditorialRuntimeSurface({paths:candidate,astroConfig:astro,netlifyConfig:netlify}),/path|duplicate/i);
 }
 assert.throws(()=>auditEditorialRuntimeSurface({paths:null,astroConfig:astro,netlifyConfig:netlify}),/paths/i);
 assert.throws(()=>auditEditorialRuntimeSurface({paths,astroConfig:null,netlifyConfig:netlify}),/config/i);
});
