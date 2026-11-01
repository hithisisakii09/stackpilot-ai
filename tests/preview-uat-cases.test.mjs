import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import policy from '../config/operating-policy.json' with {type:'json'};
import products from '../src/data/products.json' with {type:'json'};
import affiliateCandidates from '../src/data/affiliate-programs.json' with {type:'json'};
import {buildPublisherReadiness} from '../src/lib/publisher-readiness.mjs';
import {buildPrivatePreviewManifest} from '../src/lib/preview-package.mjs';
import {buildPrivatePreviewUatPacket,buildPrivatePreviewUatCases,formatPrivatePreviewUatWorksheetCsv} from '../src/lib/preview-uat-packet.mjs';

const sha='00cc655c812db62ddc684e1609094fe771d705cf';
const hashes=[['index.html','a'],['compare/index.html','b'],['research/index.html','c'],
 ['tools/backup-restore-drill/index.html','d'],['tools/hosting-cutover-gates/index.html','e'],
 ['robots.txt','f'],['_headers','1']];
const files=()=>hashes.map(([path,letter])=>({path,bytes:450,sha256:letter.repeat(64)}));
const packet=()=>buildPrivatePreviewUatPacket({
 manifest:buildPrivatePreviewManifest(files(),policy,sha),policy,
 publisher:buildPublisherReadiness({policy,products,affiliateCandidates})
});
test('one baseline signed-in route case per exact emitted HTML route, plus six remote gates',()=>{
 const p=packet();const result=buildPrivatePreviewUatCases(p);
 assert.equal(result.schemaVersion,1);
 assert.equal(result.sourceCommit,sha);
 assert.equal(result.releaseVerdict,'NO_GO');
 assert.equal(result.releaseAuthorized,false);
 assert.equal(result.caseCount,result.cases.length);
 for(const row of p.routes){
  const matching=result.cases.filter(c=>c.route===row.path&&c.id.startsWith('route-smoke-'));
  assert.equal(matching.length,1,'Missing or duplicate smoke case '+row.path);
  assert.equal(matching[0].buildSha256,row.buildSha256,'Case hash must match route asset');
  assert.equal(matching[0].sourceCommit,sha);
  assert.match(matching[0].expected,/authenticated/i);
 }
 for(const gate of p.remoteGates)assert.equal(result.cases.filter(c=>c.id==='remote-'+gate.id).length,1);
});
test('user-focused scenarios cover advisor, neutral comparison, and both recovery gates',()=>{
 const result=buildPrivatePreviewUatCases(packet());
 for(const [path,word] of [
  ['/','advisor'],['/compare/','same vendor'],
  ['/tools/backup-restore-drill/','NO_GO'],
  ['/tools/backup-restore-drill/','READY_FOR_HUMAN_REVIEW'],
  ['/tools/hosting-cutover-gates/','NO_GO'],
  ['/tools/hosting-cutover-gates/','READY_FOR_HUMAN_REVIEW']
 ]){
  const rows=result.cases.filter(r=>r.route===path);
  assert.ok(rows.some(r=>(r.objective+' '+r.expected).toLowerCase().includes(word.toLowerCase())),path+' '+word);
 }
 const external=result.cases.filter(r=>r.id.startsWith('remote-')).map(r=>r.expected).join(' ');
 for(const word of ['anonymous','security headers','Netlify','billing','legal'])assert.match(external,new RegExp(word,'i'));
});
test('every result is UNTESTED and NOT_COLLECTED, no test can mark release passed or approved',()=>{
 const result=buildPrivatePreviewUatCases(packet());
 assert.ok(result.cases.length>=17);
 const unique=new Set(result.cases.map(x=>x.id));
 assert.equal(unique.size,result.cases.length);
 assert.ok(result.cases.every(c=>c.result==='UNTESTED'&&c.evidence==='NOT_COLLECTED'&&c.releaseAuthorized===false));
 assert.ok(result.cases.every(c=>typeof c.expected==='string'&&c.expected.length>10));
 assert.doesNotMatch(JSON.stringify(result),/"result":"PASS"|"releaseAuthorized":true|credential|cookie|token|password/i);
});
test('CSV can be filled offline by human; exact SHA and safe source-fixed cells',()=>{
 const p=packet();const csv=formatPrivatePreviewUatWorksheetCsv(p);
 const r=buildPrivatePreviewUatCases(p);
 assert.match(csv,/^case_id,source_commit,route,build_sha256,scenario,expected,result,evidence\r\n/);
 assert.ok(csv.endsWith('\r\n'));
 assert.match(csv,new RegExp(sha));
 assert.match(csv,/"route-smoke-root"/);
 assert.match(csv,/"remote-unauthenticated-preview-denial"/);
 assert.match(csv,/"UNTESTED","NOT_COLLECTED"/);
 assert.equal(csv.split('\r\n').filter(x=>x.trim()).length,r.caseCount+1);
 assert.doesNotMatch(csv,/\bPASS\b|=HYPERLINK|@SUM|https?:\/\/|NETLIFY_AUTH_TOKEN/i);
 assert.equal(csv,formatPrivatePreviewUatWorksheetCsv(p));
});
test('no changes to input packet, deterministic even after repeat runs',()=>{
 const p=packet(),before=structuredClone(p);
 const r=buildPrivatePreviewUatCases(p);
 assert.deepEqual(p,before);
 assert.deepEqual(r,buildPrivatePreviewUatCases(p));
 assert.deepEqual(r.cases.map(x=>x.id),[...r.cases.map(x=>x.id)].sort((a,b)=>a.localeCompare(b,'en')));
});
test('forged route PASS, tampered source, missing gates, and extra publisher approvals are refused',()=>{
 const p=packet();
 for(const altered of [
  {...p,sourceCommit:'main'},
  {...p,releaseVerdict:'GO'},
  {...p,remoteAuthenticatedUatPassed:true},
  {...p,publicReleaseAuthorized:true},
  {...p,routes:p.routes.map((r,i)=>i===0?{...r,status:'PASS'}:r)},
  {...p,routes:p.routes.map((r,i)=>i===0?{...r,path:'/=HYPERLINK()'}:r)},
  {...p,routes:p.routes.map((r,i)=>i===0?{...r,buildSha256:'fake'}:r)},
  {...p,remoteGates:[]},
  {...p,ownerGates:[]},
  {...p,extraApproval:true}
 ]){
  assert.throws(()=>buildPrivatePreviewUatCases(altered),/invalid|approval|packet|gate|route|source/i);
  assert.throws(()=>formatPrivatePreviewUatWorksheetCsv(altered),/invalid|approval|packet|gate|route|source/i);
 }
});
test('packet packaging emits a private CSV beside JSON/Markdown, no new deployment permissions',()=>{
 const script=readFileSync('scripts/create-private-preview-package.mjs','utf8');
 const workflow=readFileSync('.github/workflows/agent-ops.yml','utf8');
 assert.match(script,/formatPrivatePreviewUatWorksheetCsv/);
 assert.match(script,/artifacts\/private-preview\/uat-cases\.csv/);
 assert.match(script,/packet.sourceCommit,manifest.sourceCommit/);
 assert.match(workflow,/stackpilot-private-preview-package/);
 assert.match(workflow,/retention-days:\s*3/);
 assert.doesNotMatch(workflow,/netlify deploy|NETLIFY_AUTH_TOKEN|--prod|pull-requests:\s*write/i);
});
