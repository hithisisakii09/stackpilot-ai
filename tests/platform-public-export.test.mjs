import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildPublicCatalog} from '../src/platform/growth/public-export.mjs';

const catalog=[
  {id:'alpha-tool',name:'Alpha Tool',category:'CRM',bestFor:['sales'],affiliateUrl:null,
    description:'Candidate overview',website:'https://example.test/',sources:[{url:'https://example.test/source',claim:'Unreviewed claim'}],pricing:{status:'unverified'}}
];

test('public catalog projection is deterministic and excludes source, pricing, claim and commercial material',()=>{
  const result=buildPublicCatalog(catalog);
  assert.deepEqual(result,{schema:'stackpilot-public-catalog-v1',products:[{id:'alpha-tool',name:'Alpha Tool',category:'CRM',workflowTags:['sales'],suitabilityStatus:'CANDIDATE_UNVERIFIED'}]});
  assert.throws(()=>buildPublicCatalog([{...catalog[0],affiliateUrl:'https://affiliate.example.test'}]),/Public catalog operation failed/);
  assert.throws(()=>buildPublicCatalog([{...catalog[0],internalTenantId:'tenant'}]),/Public catalog operation failed/);
  assert.throws(()=>buildPublicCatalog([{...catalog[0],sources:undefined,description:undefined,website:undefined,pricing:undefined,bestFor:['<img src=x>']}]),/Public catalog operation failed/);
});

test('export CLI is dry-run by default and writes only after explicit --write',()=>{
  const directory=mkdtempSync(join(tmpdir(),'stackpilot-public-export-'));
  const output=join(directory,'catalog.json');
  const script=fileURLToPath(new URL('../scripts/export-public-catalog.mjs',import.meta.url));
  try {
    const dry=spawnSync(process.execPath,[script],{encoding:'utf8'});
    assert.equal(dry.status,0,dry.stderr);
    assert.equal(existsSync(output),false);
    assert.match(dry.stdout,/\"schema\": \"stackpilot-public-catalog-v1\"/);
    const write=spawnSync(process.execPath,[script,'--write',output],{encoding:'utf8'});
    assert.equal(write.status,0,write.stderr);
    assert.equal(JSON.parse(readFileSync(output,'utf8')).schema,'stackpilot-public-catalog-v1');
  } finally { rmSync(directory,{recursive:true,force:true}); }
});
