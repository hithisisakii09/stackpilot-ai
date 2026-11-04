import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import policy from '../config/operating-policy.json' with {type:'json'};
import products from '../src/data/products.json' with {type:'json'};
import affiliateCandidates from '../src/data/affiliate-programs.json' with {type:'json'};
import {buildPublisherReadiness} from '../src/lib/publisher-readiness.mjs';
import {buildPrivatePreviewManifest} from '../src/lib/preview-package.mjs';
import {buildPrivatePreviewUatPacket,formatPrivatePreviewUatPacketMarkdown} from '../src/lib/preview-uat-packet.mjs';

const sha='00cc655c812db62ddc684e1609094fe771d705cf';
const entries=()=>[
 ['index.html',1024,'a'],
 ['compare/index.html',512,'b'],
 ['research/index.html',512,'c'],
 ['tools/backup-restore-drill/index.html',300,'f'],
 ['tools/hosting-cutover-gates/index.html',400,'1'],
 ['robots.txt',28,'d'],
 ['_headers',248,'e']
].map(([path,bytes,char])=>({path,bytes,sha256:char.repeat(64)}));
const data=(extra={})=>({
 manifest:buildPrivatePreviewManifest(entries(),policy,sha),
 policy,
 publisher:buildPublisherReadiness({policy,products,affiliateCandidates}),
 ...extra
});
test('packet enumerates exact SHA and every emitted route as UNTESTED',()=>{
 const result=buildPrivatePreviewUatPacket(data());
 assert.equal(result.schemaVersion,1);
 assert.equal(result.source,'generated-private-preview-manifest');
 assert.equal(result.sourceCommit,sha);
 assert.equal(result.routeCount,5);
 assert.deepEqual(result.routes.map(r=>r.path),[
  '/','/compare/','/research/','/tools/backup-restore-drill/','/tools/hosting-cutover-gates/'
 ]);
 assert.ok(result.routes.every(r=>r.status==='UNTESTED'&&r.authenticatedHostedPassed===false));
 assert.ok(result.routes.every(r=>/^[a-f0-9]{64}$/.test(r.buildSha256)));
 assert.equal(result.routes[0].buildSha256,'a'.repeat(64));
});
test('approval controls and all remote gates remain blocked even if static artifacts exist',()=>{
 const result=buildPrivatePreviewUatPacket(data());
 assert.equal(result.releaseVerdict,'NO_GO');
 assert.equal(result.publicReleaseAuthorized,false);
 assert.equal(result.remoteAuthenticatedUatPassed,false);
 assert.equal(result.anonymousPreviewDenialVerified,false);
 assert.equal(result.hostingProviderAccountVerified,false);
 assert.equal(result.editorialClaimsApproved,0);
 assert.equal(result.delegatedSpendINR,0);
 assert.equal(result.remoteGates.length,6);
 assert.ok(result.remoteGates.every(g=>g.status==='UNVERIFIED'&&g.source==='owner-or-provider-observation'));
 assert.equal(result.ownerGates.length,11);
 assert.ok(result.ownerGates.every(g=>g.status==='UNVERIFIED'));
});
test('packet builder is deterministic regardless of manifest file listing order, and nonmutating',()=>{
 const args=data();
 const original=structuredClone(args);
 const expected=buildPrivatePreviewUatPacket(args);
 assert.deepEqual(args,original);
 const shuffled={...args,manifest:buildPrivatePreviewManifest([...entries()].reverse(),policy,sha)};
 assert.deepEqual(buildPrivatePreviewUatPacket(shuffled),expected);
 assert.equal(formatPrivatePreviewUatPacketMarkdown(expected),formatPrivatePreviewUatPacketMarkdown(expected));
});
test('markdown labels evidence as incomplete and offers every route for authenticated review',()=>{
 const packet=buildPrivatePreviewUatPacket(data());
 const md=formatPrivatePreviewUatPacketMarkdown(packet);
 assert.match(md,new RegExp(sha));
 assert.match(md,/RELEASE NO-GO/);
 assert.match(md,/Netlify.*(preview|private)/i);
 assert.match(md,/not.*authenticated/i);
 assert.match(md,/anonymous.*(deny|denial)/i);
 assert.match(md,/no credentials/i);
 assert.match(md,/\/tools\/backup-restore-drill\//);
 assert.match(md,/\/tools\/hosting-cutover-gates\//);
 assert.match(md,/security.headers/i);
 assert.match(md,/UNTESTED/);
 assert.match(md,/UNVERIFIED/);
 assert.doesNotMatch(md,/\bPASS\b|approved for public launch|actual traffic|commission earned|https?:\/\/deploy-preview/i);
});
test('rejects forged or mismatched manifest status, source commit, count, hashes and hidden fields',()=>{
 const args=data();
 for(const change of [
  {sourceCommit:'main'},
  {publicLaunchAuthorized:true},
  {affiliateActivationAuthorized:true},
  {productionPromoted:true},
  {fileCount:999},
  {totalBytes:5},
  {unknownApproval:'yes'},
  {files:args.manifest.files.map((f,i)=>i===0?{...f,sha256:'not-a-real-hash'}:f)},
  {files:args.manifest.files.map((f,i)=>i===0?{...f,path:'../private.env'}:f)}
 ]){
  assert.throws(()=>buildPrivatePreviewUatPacket({...args,manifest:{...args.manifest,...change}}),/invalid|manifest|hash|path|approval|authorization|preview|count|size|source/i);
 }
});
test('rejects publisher owner/provider approval claims or missing evidence gates',()=>{
 const args=data();
 for(const change of [
  {canPublish:true},
  {applicationReady:true},
  {publisherIdentityVerified:true},
  {editorialClaimsApproved:1},
  {remotePreviewEvidence:{...args.publisher.remotePreviewEvidence,status:'APPROVED'}},
  {remotePreviewEvidence:{...args.publisher.remotePreviewEvidence,gates:[]}},
  {ownerGates:args.publisher.ownerGates.map((g,i)=>i===0?{...g,status:'verified'}:g)}
 ]){
  assert.throws(()=>buildPrivatePreviewUatPacket({...args,publisher:{...args.publisher,...change}}),/publisher|invalid|approval|unverified|gate|evidence/i);
 }
});
test('cannot render a forged packet that marks UAT PASS or changes source SHA',()=>{
 const packet=buildPrivatePreviewUatPacket(data());
 for(const forged of [
  {...packet,releaseVerdict:'GO'},
  {...packet,publicReleaseAuthorized:true},
  {...packet,remoteAuthenticatedUatPassed:true},
  {...packet,anonymousPreviewDenialVerified:true},
  {...packet,routes:packet.routes.map((r,i)=>i===0?{...r,status:'PASS'}:r)},
  {...packet,sourceCommit:'main'},
  {...packet,routeCount:99},
  {...packet,extraAuthorization:true}
 ]){
  assert.throws(()=>formatPrivatePreviewUatPacketMarkdown(forged),/invalid|unverified|packet|approval|authorization|route|source/i);
 }
});
test('existing private package pipeline emits exact-SHA JSON and Markdown without deployment authority',()=>{
 const script=readFileSync('scripts/create-private-preview-package.mjs','utf8');
 const workflow=readFileSync('.github/workflows/agent-ops.yml','utf8');
 assert.match(script,/buildPrivatePreviewUatPacket/);
 assert.match(script,/formatPrivatePreviewUatPacketMarkdown/);
 assert.match(script,/artifacts\/private-preview\/uat-packet\.json/);
 assert.match(script,/artifacts\/private-preview\/uat-packet\.md/);
 assert.match(script,/manifest\.sourceCommit/);
 assert.match(workflow,/stackpilot-private-preview-package/);
 assert.match(workflow,/retention-days:\s*3/);
 assert.doesNotMatch(workflow,/netlify deploy|NETLIFY_AUTH_TOKEN|--prod|pull-requests:\s*write/i);
});
