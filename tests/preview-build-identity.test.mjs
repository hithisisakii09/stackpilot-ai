import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {buildPreviewBuildIdentity} from '../src/lib/preview-build-identity.mjs';
const sha='0123456789abcdef0123456789abcdef01234567';
const good=(more={})=>({
 NETLIFY:'true',CONTEXT:'deploy-preview',PULL_REQUEST:'true',
 REVIEW_ID:'7',COMMIT_REF:sha,...more
});
const flags=result=>{
 assert.deepEqual(
  [result.authenticatedHostedUatPassed,result.anonymousPreviewDenialVerified,
   result.providerAccountVerified,result.publicReleaseAuthorized,
   result.productionPromoted,result.delegatedSpendINR],
  [false,false,false,false,false,0]
 );
};
test('valid Netlify PR build metadata reports an exact source SHA and PR number without granting approval',()=>{
 const info=buildPreviewBuildIdentity(good());
 assert.equal(info.status,'PREVIEW_COMMIT_REPORTED');
 assert.equal(info.sourceCommit,sha);
 assert.equal(info.prNumber,7,'prNumber must be a parsed integer matching REVIEW_ID');
 assert.equal(info.source,'netlify-build-environment');
 assert.deepEqual(Object.keys(info).sort(),[
  'anonymousPreviewDenialVerified','authenticatedHostedUatPassed','delegatedSpendINR',
  'prNumber','productionPromoted','providerAccountVerified','publicReleaseAuthorized',
  'source','sourceCommit','status'
 ].sort());
 flags(info);
});
test('PR number 1 is also accepted (original PR; must not be regressed)',()=>{
 const info=buildPreviewBuildIdentity(good({REVIEW_ID:'1'}));
 assert.equal(info.status,'PREVIEW_COMMIT_REPORTED');
 assert.equal(info.prNumber,1);
 flags(info);
});
test('any positive integer REVIEW_ID string is accepted',()=>{
 for(const id of ['2','10','100','999']){
  const info=buildPreviewBuildIdentity(good({REVIEW_ID:id}));
  assert.equal(info.status,'PREVIEW_COMMIT_REPORTED',`REVIEW_ID ${id} must be accepted`);
  assert.equal(info.prNumber,Number(id));
 }
});
test('missing or invalid Netlify context, non-positive or malformed REVIEW_ID always redact source SHA',()=>{
 for(const attrs of [
  {NETLIFY:undefined},{NETLIFY:'false'},
  {CONTEXT:'production'},{CONTEXT:'branch-deploy'},{CONTEXT:undefined},
  {PULL_REQUEST:'false'},{PULL_REQUEST:undefined},
  // Invalid REVIEW_ID values
  {REVIEW_ID:'0'},{REVIEW_ID:'-1'},{REVIEW_ID:'1.5'},
  {REVIEW_ID:'01'},{REVIEW_ID:''},{REVIEW_ID:undefined},
  {REVIEW_ID:'abc'},{REVIEW_ID:' 7'},{REVIEW_ID:'7 '},
  // Invalid COMMIT_REF values
  {COMMIT_REF:undefined},{COMMIT_REF:''},{COMMIT_REF:'main'},
  {COMMIT_REF:sha.slice(0,39)},{COMMIT_REF:sha.toUpperCase()},
  {COMMIT_REF:sha+'Z'},{COMMIT_REF:'\n'+sha},
 ]){
  const info=buildPreviewBuildIdentity(good(attrs));
  assert.equal(info.status,'UNVERIFIED_CONTEXT',JSON.stringify(attrs));
  assert.equal(info.sourceCommit,null);
  assert.equal(info.prNumber,null);
  assert.equal(info.source,'unavailable');
  flags(info);
 }
});
test('unknown environment values are never copied into report or status',()=>{
 const secret='test_sensitive_string_never_reflect_012';
 const info=buildPreviewBuildIdentity(good({COMMIT_REF:secret}));
 assert.equal(info.status,'UNVERIFIED_CONTEXT');
 assert.doesNotMatch(JSON.stringify(info),new RegExp(secret));
});
test('must not accept extra env data or arbitrary custom origin as trusted commit evidence',()=>{
 const added={...good(),NETLIFY_AUTH_TOKEN:'secret'};
 assert.throws(()=>buildPreviewBuildIdentity(added),/environment|field|metadata/i);
 assert.throws(()=>buildPreviewBuildIdentity({...good(),sourceCommit:sha}),/environment|field|metadata/i);
 for(const value of [null,undefined,{},[],false,42,'preview']){
  assert.throws(()=>buildPreviewBuildIdentity(value),/environment|field|metadata/i);
 }
});
test('untrusted build environment is not mutated by the classifier',()=>{
 const info=good(),copy=structuredClone(info);
 buildPreviewBuildIdentity(info);
 assert.deepEqual(info,copy);
});
test('new private review page and homepage use actual provider metadata, no network or auth data',()=>{
 const path='src/pages/preview-build/index.astro';
 assert.ok(existsSync(path),'Expected static protected review route');
 const page=readFileSync(path,'utf8');
 const home=readFileSync('src/pages/index.astro','utf8');
 assert.match(page,/<meta name="robots" content="noindex, nofollow"/);
 assert.match(page,/<h1>Preview build identity<\/h1>/);
 assert.match(page,/buildPreviewBuildIdentity/);
 for(const field of ['NETLIFY','CONTEXT','PULL_REQUEST','REVIEW_ID','COMMIT_REF'])
  assert.match(page,new RegExp('process\\.env\\.'+field+'\\b'),field);
 assert.match(page,/UNVERIFIED_CONTEXT|Unavailable/);
 assert.match(page,/not.*(proof|authorization|guarantee)/i);
 assert.doesNotMatch(page,/<script|<form|fetch\(|XMLHttpRequest|localStorage|affiliateUrl|NETLIFY_AUTH_TOKEN|cookie/i);
 // Must not contain hardcoded PR number references in display text
 assert.doesNotMatch(page,/draft PR #1\b/i,'page must not hardcode PR #1 in display text');
 assert.match(home,/href="\/preview-build\/"/);
});
test('owner SHA-bound UAT asks for actual authenticated hosted identity match, not a CI approval',()=>{
 const packet=readFileSync('src/lib/preview-uat-packet.mjs','utf8');
 const doc=readFileSync('docs/publisher-readiness/2026-11-01-private-preview-uat-release-decision.md','utf8');
 assert.match(packet,/\'\/preview-build\/\':\[/);
 assert.match(packet,/owner.*SHA|SHA.*owner|match.*PR HEAD/i);
 assert.match(doc,/\/preview-build\//);
 assert.match(doc,/PR HEAD/i);
 assert.match(doc,/signed.in|authenticated/i);
});
