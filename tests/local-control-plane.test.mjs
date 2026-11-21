import test from 'node:test';
import assert from 'node:assert/strict';
import {auditLocalControlPlaneExport} from '../src/lib/local-control-plane-export.mjs';
import {auditEditorialRuntimeSurface} from '../src/lib/editorial-authorization.mjs';
import {readFileSync} from 'node:fs';
import {isReviewedLocalControlSource,reviewedLocalControlSources} from '../scripts/local-control-plane-source.mjs';
import {parseSessionCookie,sessionCookie} from '../src/control-plane/csrf.mjs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('static export rejects control modules, trust data and TLS material',()=>{
 for(const file of [
  {path:'control-plane/server.mjs',content:'synthetic'},
  {path:'server.key',content:'synthetic'},
  {path:'assets/app.js',content:'createIdentityService({})'},
  {path:'assets/app.js',content:'buildPublicCatalog({})'},
  {path:'trust.json',content:'{"publicKeySpkiBase64":"synthetic"}'},
  {path:'dump.json',content:'{"requester_user_id":"synthetic"}'},
  {path:'tls.txt',content:'-----BEGIN CERTIFICATE----- synthetic'},
  {path:'generic.json',content:'{"deciderUserId":"synthetic","requestDigest":"synthetic"}'}
 ]) assert.equal(auditLocalControlPlaneExport([file]).violations.length,1);
 assert.equal(auditLocalControlPlaneExport([{path:'index.html',content:'<h1>Buyer application</h1>'}]).violations.length,0);
});

test('reviewed source pins accept CRLF only and reject unknown or altered sources',()=>{
 assert.equal(Object.keys(reviewedLocalControlSources).length,5);
 for(const path of Object.keys(reviewedLocalControlSources)) {
  const bytes=readFileSync(new URL('../'+path,import.meta.url));
  assert.equal(isReviewedLocalControlSource(path,bytes),true);
  assert.equal(isReviewedLocalControlSource(path,Buffer.from(bytes.toString().replace(/\r?\n/g,'\r\n'))),true);
  assert.equal(isReviewedLocalControlSource(path,Buffer.concat([bytes,Buffer.from(' ')])),false);
  assert.equal(isReviewedLocalControlSource(path,Buffer.concat([Buffer.from([239,187,191]),bytes])),false);
  assert.equal(isReviewedLocalControlSource('src/control-plane/unknown.mjs',bytes),false);
 }
});

test('session cookie parsing rejects ambiguity and header injection',()=>{
 const value='a'.repeat(43);
 const cookie=sessionCookie('owner-key',value).split(';')[0];
 assert.equal(parseSessionCookie(cookie).keyId,'owner-key');
 for(const input of [undefined,'',cookie+'; '+cookie,cookie.replace('owner-key','owner.key'),cookie+'\r\nInjected: true',cookie+'; invalid']) assert.throws(()=>parseSessionCookie(input));
});

test('CLI imports are inert and missing explicit startup configuration exits safely',()=>{
 const path=fileURLToPath(new URL('../scripts/platform-control-plane.mjs',import.meta.url));
 const imported=spawnSync(process.execPath,['--input-type=module','-e',"await import("+JSON.stringify(new URL('../scripts/platform-control-plane.mjs',import.meta.url).href)+")"],{encoding:'utf8',timeout:20000});
 assert.equal(imported.status,0);
 assert.equal(imported.stdout,'');
 assert.equal(imported.stderr,'');
 for(const args of [[],['--start'],['--start','--force']]) {
  const result=spawnSync(process.execPath,[path,...args],{encoding:'utf8',timeout:10000,env:{...process.env,STACKPILOT_CONTROL_CONFIG:''}});
  assert.equal(result.status,1);
  assert.equal(result.stdout,'');
  assert.equal(result.stderr.trim(),'Local HTTPS startup failed');
 }
});

test('unreviewed local control entry points are blocked by the source contract',()=>{
 const astroConfig=readFileSync(new URL('../astro.config.mjs',import.meta.url),'utf8');
 const netlifyConfig=readFileSync(new URL('../netlify.toml',import.meta.url),'utf8');
 for(const path of ['src/control-plane/server.mjs','src/control-plane/unreviewed.mjs','scripts/platform-control-plane.mjs']) {
  assert.equal(auditEditorialRuntimeSurface({paths:['astro.config.mjs','netlify.toml',path],astroConfig,netlifyConfig}).status,'BLOCKED');
 }
});
