import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessAnonymousHttpStatus,probeAnonymousPreview} from '../src/lib/anonymous-preview-probe.mjs';

const sha='ab'.repeat(20);
const previewOrigin='https://deploy-preview-1--inspiring-chaja-cfb85f.netlify.app';
const response=status=>({status,body:{cancel:async()=>undefined}});
const runner=results=>{
 const seen=[];
 const fetchImpl=async(url,options)=>{
  seen.push({url,options});
  const next=results.shift();
  if(next instanceof Error)throw next;
  return response(next);
 };
 return {seen,fetchImpl};
};

test('401 and 403 distinguish GitHub runner denial without making a release claim',()=>{
 assert.equal(assessAnonymousHttpStatus(401),'DENIED_FROM_CI_RUNNER');
 assert.equal(assessAnonymousHttpStatus(403),'DENIED_FROM_CI_RUNNER');
 for(const status of [200,201,206,299])assert.equal(assessAnonymousHttpStatus(status),'POTENTIAL_ANONYMOUS_RESPONSE');
 for(const status of [301,302,303,307,308,404,429,500,503,0])assert.equal(assessAnonymousHttpStatus(status),'INCONCLUSIVE');
});

test('fixed origin, exactly two known paths, no credentials or redirects, no response body',async()=>{
 const r=runner([401,403]);
 const report=await probeAnonymousPreview({fetchImpl:r.fetchImpl,requestedCommit:sha});
 assert.equal(r.seen.length,2);
 assert.deepEqual(r.seen.map(x=>x.url),[previewOrigin+'/',previewOrigin+'/compare/']);
 for(const {options} of r.seen){
  assert.equal(options.method,'GET');
  assert.equal(options.redirect,'manual');
  assert.equal(options.credentials,'omit');
  assert.equal(options.cache,'no-store');
  assert.ok(options.signal,'Timeout guard absent');
  assert.deepEqual(Object.keys(options.headers),['Accept']);
  assert.equal(options.headers.Accept,'text/html');
  assert.ok(!JSON.stringify(options).includes('Authorization'));
 }
 assert.equal(report.source,'anonymous-ci-runner-sample');
 assert.equal(report.requestedCommit,sha);
 assert.equal(report.currentDeployShaVerified,false);
 assert.equal(report.remoteAuthenticatedUatPassed,false);
 assert.equal(report.publicReleaseAuthorized,false);
 assert.equal(report.canMonetize,false);
 assert.equal(report.canSpend,false);
 assert.equal(report.sampleCount,2);
 assert.equal(report.overallStatus,'DENIED_FROM_CI_RUNNER');
 assert.ok(report.samples.every(x=>x.status==='DENIED_FROM_CI_RUNNER'));
 assert.match(report.limitations.join(' '),/not.*proof/i);
});

test('200 is a suspicious anonymous response, never silently green or called verified content exposure',async()=>{
 const r=runner([401,200]);
 const report=await probeAnonymousPreview({fetchImpl:r.fetchImpl,requestedCommit:sha});
 assert.equal(report.overallStatus,'POTENTIAL_ANONYMOUS_RESPONSE');
 assert.equal(report.samples[1].httpStatus,200);
 assert.equal(report.samples[1].status,'POTENTIAL_ANONYMOUS_RESPONSE');
 assert.equal(report.publicReleaseAuthorized,false);
 assert.equal(report.currentDeployShaVerified,false);
 assert.doesNotMatch(JSON.stringify(report),/LOGIN_URL|cookie|password|auth-token|Netlify-Access/i);
});

test('redirects, 404, 5xx and network failures are inconclusive, not proof of secured access',async()=>{
 for(const mix of [[302,403],[404,401],[500,401],[new Error('network offline'),401]]){
  const r=runner(mix);
  const report=await probeAnonymousPreview({fetchImpl:r.fetchImpl,requestedCommit:sha});
  assert.equal(report.overallStatus,'INCONCLUSIVE');
  assert.equal(report.samples.length,2);
  assert.equal(report.publicReleaseAuthorized,false);
  assert.ok(report.samples.some(x=>x.status==='INCONCLUSIVE'));
 }
});

test('never reveal injected network error or secret text and never read response body',async()=>{
 const secret='my-test-bearer-secret';
 const fetchImpl=async()=>{throw new Error('Bearer '+secret);};
 const report=await probeAnonymousPreview({fetchImpl,requestedCommit:sha});
 assert.equal(report.overallStatus,'INCONCLUSIVE');
 assert.doesNotMatch(JSON.stringify(report),new RegExp(secret));
 assert.doesNotMatch(JSON.stringify(report),/Bearer/i);
 assert.ok(report.samples.every(x=>x.httpStatus===null));
});

test('invalid or missing commit/timeout is refused before any network access',async()=>{
 for(const requestedCommit of ['main','',null,'0'.repeat(39),'G'.repeat(40)]){
  let called=false;
  await assert.rejects(probeAnonymousPreview({requestedCommit,fetchImpl:async()=>{called=true;return response(401);}}),/commit|SHA/i);
  assert.equal(called,false);
 }
 for(const timeoutMs of [0,4001,-1,1.5,'100']){
  await assert.rejects(probeAnonymousPreview({requestedCommit:sha,timeoutMs,fetchImpl:async()=>response(401)}),/timeout/i);
 }
});

test('one test at exact approved host; no custom URL, no extra fields allowed',async()=>{
 const r=runner([401,401]);
 await assert.rejects(probeAnonymousPreview({fetchImpl:r.fetchImpl,requestedCommit:sha,origin:'https://evil.example/'}),/option|field|origin|invalid/i);
 assert.equal(r.seen.length,0);
});

test('GitHub ops pipeline stores safe JSON artifact then fails on 2xx while preserving UNVERIFIED UAT',()=>{
 const script=readFileSync('scripts/anonymous-preview-probe.mjs','utf8');
 const workflow=readFileSync('.github/workflows/agent-ops.yml','utf8');
 assert.match(script,/probeAnonymousPreview/);
 assert.match(script,/artifacts\/ops\/anonymous-preview-probe\.json/);
 assert.match(workflow,/node scripts\/anonymous-preview-probe\.mjs/);
 assert.match(workflow,/PREVIEW_SOURCE_COMMIT:/);
 assert.ok(workflow.indexOf('node scripts/anonymous-preview-probe.mjs')<workflow.indexOf('name: Archive short-lived'));
 assert.match(workflow,/POTENTIAL_ANONYMOUS_RESPONSE/);
 assert.ok(workflow.indexOf('POTENTIAL_ANONYMOUS_RESPONSE')>workflow.indexOf('name: Archive short-lived'));
 assert.match(workflow,/retention-days: 7/);
 assert.doesNotMatch(workflow,/NETLIFY_AUTH_TOKEN|--prod|netlify deploy|secrets\.NETLIFY/i);
});
