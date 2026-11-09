import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  auditTrackedPrivateResearchPaths,
  validatePrivateResearchIgnorePolicy,
  PROTECTED_PRIVATE_RESEARCH_DIRS,
  PROTECTED_PRIVATE_RESEARCH_WORKBOOK_GLOBS
} from '../src/lib/private-research-material-guard.mjs';

test('client and prospect directories are protected in Git index policy',()=>{
  for(const folder of ['client-research','prospect-research','lead-research']){
    assert.ok(PROTECTED_PRIVATE_RESEARCH_DIRS.includes(folder));
    const result=auditTrackedPrivateResearchPaths([
      'README.md','docs/'+folder+'/private-contacts.csv'
    ]);
    assert.equal(result.status,'BLOCKED');
    assert.equal(result.violations.length,1);
    assert.doesNotMatch(JSON.stringify(result),/private-contacts\.csv/);
  }
});

test('the versioned StackPilot client research workbook is always private',()=>{
  for(const filename of [
    'StackPilot_Client_Research_Architecture.xlsx',
    'StackPilot_Client_Research_Architecture_v2.xlsx',
    'StackPilot_Client_Research_Architecture_v4.xlsx',
    'stackpilot_client_research_architecture_v45.xlsx'
  ]){
    const result=auditTrackedPrivateResearchPaths(['README.md','docs/manual/'+filename]);
    assert.equal(result.status,'BLOCKED',filename);
    assert.equal(result.violations.length,1);
    assert.doesNotMatch(JSON.stringify(result),/StackPilot_Client_Research_Architecture|stackpilot_client_research_architecture/);
  }
});

test('normal source and synthetic test fixtures are not blocked',()=>{
  const result=auditTrackedPrivateResearchPaths([
    'README.md','tests/prospect-research-material-guard.test.mjs',
    'docs/phase-2-product-readiness/client-research-protocol.md'
  ]);
  assert.equal(result.status,'PRIVATE-RESEARCH-MATERIALS-LOCKED');
  assert.deepEqual(result.violations,[]);
});

test('client workbook ignore glob required alongside existing research patterns',()=>{
  const ignore=readFileSync(new URL('../.gitignore',import.meta.url),'utf8');
  assert.ok(PROTECTED_PRIVATE_RESEARCH_WORKBOOK_GLOBS.includes(
    'StackPilot_Client_Research_Architecture*.xlsx'
  ));
  assert.doesNotThrow(()=>validatePrivateResearchIgnorePolicy(ignore));
  assert.throws(()=>validatePrivateResearchIgnorePolicy(
    ignore.split(/\r?\n/).filter(line=>!PROTECTED_PRIVATE_RESEARCH_WORKBOOK_GLOBS.includes(line.trim())).join('\n')
  ),/Missing required private research/);
});
