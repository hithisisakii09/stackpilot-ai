import test from 'node:test';
import assert from 'node:assert/strict';
import {auditInternalResearchLeaks} from '../src/lib/internal-research-leak-audit.mjs';

const value='Unverified vendor candidate claim: includes 10 workers & 1000 credits in Tier A';
const pairs=[{
 slug:'example-vs-sample',firstId:'example',secondId:'sample',
 matrix:[{dimension:'Capacity planning',firstValue:value,
 secondValue:'Unreviewed candidate: cloud backup retention varies by product and region',
 buyerContext:'Verify source details directly.'}]
}];
const safe=[
 {path:'index.html',content:'<html><head><title>StackPilot</title></head><body>Evidence: unverified. Verify vendor details.</body></html>'},
 {path:'_astro/app.js',content:'const prompt="Verify current plan pricing with the official vendor."'},
 {path:'robots.txt',content:'User-agent: *\nDisallow: /'}
];
const scan=files=>auditInternalResearchLeaks(files,pairs);

test('safe buyer-facing neutral copy and local assets remain allowed',()=>{
 const before=structuredClone(safe);
 const report=scan(safe);
 assert.equal(report.checkedFiles,safe.length);
 assert.deepEqual(report.violations,[]);
 assert.deepEqual(safe,before);
});

test('unreviewed raw vendor assertions are blocked in any emitted text asset',()=>{
 for(const [path,content] of [
  ['compare/example-vs-sample/index.html',value],
  ['_astro/assets/app.js','const vendor='+JSON.stringify(value)],
  ['assets/catalog.json',JSON.stringify({claim:value})],
  ['other/injected.css','/* '+pairs[0].matrix[0].secondValue+' */'],
  ['other/source.map',JSON.stringify({sourcesContent:[value]})]
 ]){
  const report=scan([...safe,{path,content}]);
  assert.ok(report.violations.some(x=>x.includes(path)&&x.includes('Unreviewed comparison assertion')),path);
  assert.ok(report.violations.every(x=>!x.includes(value)&&!x.includes('10 workers')), 'No sensitive assertion text in audit output');
 }
});

test('HTML and JavaScript escaping cannot trivially hide raw candidate assertions',()=>{
 const html=value.replaceAll('&','&amp;');
 const json=value.replaceAll('&','\\u0026');
 const hex=value.replaceAll('&','\\x26');
 for(const content of [html,json,hex]){
  const report=scan([{path:'index.html',content}]);
  assert.ok(report.violations.length>0,content);
 }
});

test('private editorial and research data files never appear in dist',()=>{
 for(const path of [
  'src/data/editorial-triage.json',
  'data/comparison-source-proposals.json',
  'assets/editorial-review-receipts.json',
  'research-claims.json',
  'comparison-evidence.json',
  'editorial-review-trust-anchors.json',
  'assets/editorial-review-history.json',
  'assets/comparison-evidence-captures.json'
 ]){
  const report=scan([{path,content:'[]'}]);
  assert.ok(report.violations.some(x=>x.includes('Private research data asset')),path);
 }
});

test('serialized reviewer-only fields cannot be embedded in browser assets',()=>{
 for(const content of [
  '{"candidateAssertion":"secret"}',
  'const record={triageReason:"internal only"};',
  '{"publicKeySpkiBase64":"NOT A KEY"}',
  'const x={sourceSnapshotSha256:"deadbeef"};',
  'const item={relevanceNote:"internal candidate"};',
  '{"previousDigest":"private-untrusted-history"}',
  '{"excerptSha256":"private-capture"}',
  '{"captureId":"excerpt-capture-0001"}'
 ]){
  assert.ok(scan([{path:'_astro/app.js',content}]).violations.some(x=>x.includes('Internal review metadata')));
 }
});

test('invalid manifest, duplicate paths, or missing candidate dataset fail closed',()=>{
 assert.throws(()=>auditInternalResearchLeaks(null,pairs),/files/i);
 assert.throws(()=>auditInternalResearchLeaks(safe,[]),/pairs|matrix/i);
 assert.throws(()=>auditInternalResearchLeaks([...safe,safe[0]],pairs),/duplicate/i);
 assert.throws(()=>auditInternalResearchLeaks([{path:'../bad.html',content:'x'}],pairs),/path/i);
 assert.throws(()=>auditInternalResearchLeaks([{path:'index.html',content:null}],pairs),/content/i);
});

test('unrecognized binary assets are not read as text, but filename remains guarded',()=>{
 const files=[{path:'logo.png',content:null},{path:'images/diagram.webp',content:null}];
 const report=scan(files);
 assert.equal(report.checkedFiles,0);
 assert.deepEqual(report.violations,[]);
});

test('unreviewed original SEO comparison metadata is private research, not public page copy',()=>{
 const pairsWithPrivateDescription=pairs.map(p=>({...p,
  metaDescription:'UNREVIEWED SOURCE CLAIM: Cloud stack A provides faster hosting than Cloud stack B.'}));
 const text=pairsWithPrivateDescription[0].metaDescription;
 const report=auditInternalResearchLeaks([{path:'index.html',content:'<meta name="description" content="'+text+'">'}],pairsWithPrivateDescription);
 assert.ok(report.violations.some(v=>v.includes('Unreviewed comparison description')));
 assert.ok(report.violations.every(v=>!v.includes(text)));
});

test('raw manual research excerpts are blocked even without a JSON field name',()=>{
 const excerpt='PRIVATE MANUAL TEST EXCERPT: the vendor page may describe X & Y in some regions, unverified.';
 const records=[{captureId:'excerpt-capture-0001',excerpt}];
 for(const [path,content] of [
  ['compare/example/index.html','<p>'+excerpt+'</p>'],
  ['_astro/app.js','const x='+JSON.stringify(excerpt)],
  ['data/neutral.json',JSON.stringify([excerpt])],
  ['styles/site.css','/* '+excerpt.replaceAll('&','&amp;')+' */'],
 ]){
  const result=auditInternalResearchLeaks([{path,content}],pairs,records);
  assert.ok(result.violations.some(x=>x.includes('Manual research excerpt exposed')),path);
  assert.ok(result.violations.every(x=>!x.includes(excerpt)), 'Leak scanner must not echo private excerpt text');
 }
 assert.deepEqual(auditInternalResearchLeaks(safe,pairs,records).violations,[]);
 assert.throws(()=>auditInternalResearchLeaks(safe,pairs,null),/captures/i);
 assert.throws(()=>auditInternalResearchLeaks(safe,pairs,[{captureId:'x',excerpt:null}]),/excerpt|capture/i);
});
