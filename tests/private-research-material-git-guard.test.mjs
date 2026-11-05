import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 auditTrackedPrivateResearchPaths,validatePrivateResearchIgnorePolicy,
 PROTECTED_PRIVATE_RESEARCH_DIRS,PROTECTED_PRIVATE_RESEARCH_FILES
} from '../src/lib/private-research-material-guard.mjs';
import {auditCurrentPrivateResearchMaterials} from '../scripts/private-research-material-guard.mjs';

const safe=[
 '.gitignore','AGENTS.md','src/data/comparison-source-proposals.json',
 'src/data/comparison-evidence-captures.json',
 'src/lib/offline-snapshot-consistency.mjs',
 'src/lib/private-source-text-file.mjs',
 'docs/superpowers/plans/2026-11-05-local-research-material-git-guard.md'
];

test('tracked source tree can retain legitimate EMPTY private review registers and code',()=>{
 assert.deepEqual(auditTrackedPrivateResearchPaths(safe),{
  status:'PRIVATE-RESEARCH-MATERIALS-LOCKED',
  checkedPaths:safe.length,violations:[]
 });
});

test('force-added local research directories are rejected regardless of nesting or case',()=>{
 for(const folder of PROTECTED_PRIVATE_RESEARCH_DIRS){
  for(const path of [
   folder+'/vendor.txt',
   'docs/'+folder+'/vendor.txt',
   'src/data/'+folder.toUpperCase()+'/candidate.txt'
  ]){
   const audit=auditTrackedPrivateResearchPaths([...safe,path]);
   assert.equal(audit.status,'BLOCKED',path);
   assert.equal(audit.violations.length,1,path);
   assert.equal(audit.violations[0].includes(path),false,'Do not echo private paths');
  }
 }
});

test('force-added local source files, worksheet exports and raw snapshots are rejected',()=>{
 for(const filename of PROTECTED_PRIVATE_RESEARCH_FILES){
  for(const path of [filename,'docs/manual/'+filename,'src/data/'+filename.toUpperCase()]){
   const audit=auditTrackedPrivateResearchPaths([...safe,path]);
   assert.equal(audit.status,'BLOCKED',path);
   assert.equal(audit.violations.length,1,path);
  }
 }
});

test('path audit rejects missing, invalid, traversing and duplicate path inventories',()=>{
 for(const paths of [
  [],null,'src/private-research/document.txt',
  ['../private-research/source.txt'],
  ['/private-research/source.txt'],
  ['docs//source.txt'],['./docs/file.txt'],['docs\\private-research\\x.txt'],
  ['docs/file.txt','DOCS/FILE.TXT'],['docs/file.txt\nprivate'],
  ['docs/file.txt','docs/file.txt']
 ]){
  assert.throws(()=>auditTrackedPrivateResearchPaths(paths),/paths|path|duplicate/i);
 }
});

test('ignore policy requires every protected directory and filename with no silent exemptions',()=>{
 const ignored=readFileSync(new URL('../.gitignore',import.meta.url),'utf8');
 assert.equal(validatePrivateResearchIgnorePolicy(ignored).protectedPatterns,
  PROTECTED_PRIVATE_RESEARCH_DIRS.length+PROTECTED_PRIVATE_RESEARCH_FILES.length);
 for(const rule of [
  PROTECTED_PRIVATE_RESEARCH_DIRS[0]+'/',
  PROTECTED_PRIVATE_RESEARCH_FILES[0]
 ]){
  const tampered=ignored.split('\n').filter(line=>line.trim()!==rule).join('\n');
  assert.throws(()=>validatePrivateResearchIgnorePolicy(tampered),/ignore|pattern/i);
 }
 assert.throws(()=>validatePrivateResearchIgnorePolicy(''),/ignore|pattern/i);
});

test('Git-tracked repository inventory and real gitignore semantics are enforced in CI',()=>{
 const audit=auditCurrentPrivateResearchMaterials();
 assert.equal(audit.status,'PRIVATE-RESEARCH-MATERIALS-LOCKED');
 assert.ok(audit.checkedPaths>300);
 assert.equal(audit.missingIgnoreRules,0);
 assert.deepEqual(audit.violations,[]);
 assert.equal(audit.gitRulesVerified,true);
});

test('public Astro comparison routes never import private research material guard',()=>{
 for(const p of ['../src/pages/compare/index.astro','../src/pages/compare/[slug].astro']){
  const text=readFileSync(new URL(p,import.meta.url),'utf8');
  assert.doesNotMatch(text,/private-research-material-guard/);
 }
});
