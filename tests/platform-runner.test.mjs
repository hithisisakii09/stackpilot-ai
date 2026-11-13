import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateDag,preparationWorkflow,digest} from '../src/platform/orchestration/dag.mjs';
import {openSyntheticRunner} from '../src/platform/orchestration/runner.mjs';
import {auditLocalControlPlaneExport} from '../src/lib/local-control-plane-export.mjs';
import {verifyRunnerMigration} from '../src/platform/persistence/migrate.mjs';
import {buildRunnerMigrationSql} from '../src/platform/persistence/runner-schema.mjs';
import {createHash} from 'node:crypto';

test('bounded DAG validates dependencies and detaches immutable definitions',()=>{
  const graph={organizationId:'org-alpha',tasks:[{id:'task-one',dependencies:[]},{id:'task-two',dependencies:['task-one']}]};
  const result=validateDag(graph); graph.tasks[1].dependencies.length=0;
  assert.deepEqual(result.tasks[1].dependencies,['task-one']);assert.ok(Object.isFrozen(result.tasks[1].dependencies));
  assert.equal(preparationWorkflow.version,1); assert.equal(preparationWorkflow.tasks.length,3);
});
test('DAG rejects cycles, missing/duplicate/cross-tenant dependencies and hostile bounds',()=>{
  for(const tasks of [[],[{id:'task-one',dependencies:['task-one']}],[{id:'task-one',dependencies:['missing-task']}],[{id:'task-one',dependencies:['task-two']},{id:'task-two',dependencies:['task-one']}],[{id:'task-one',dependencies:[],organizationId:'org-beta'}],Array.from({length:21},(_,i)=>({id:'task-'+i,dependencies:[]})),[{id:'task-one',dependencies:[]},{id:'task-one',dependencies:[]}]]) assert.throws(()=>validateDag({organizationId:'org-alpha',tasks}));
  let invoked=false; const hostile={get tasks(){invoked=true;return [];},organizationId:'org-alpha'};
  assert.throws(()=>validateDag(hostile));assert.equal(invoked,false);
});
test('runner is unavailable without explicit disposable harness selection',async()=>{
  await assert.rejects(openSyntheticRunner({}),/Synthetic runner unavailable/);
});
test('static export rejects runner implementation and persisted execution data',()=>{
  for(const file of [{path:'assets/runner.js',content:'openSyntheticRunner'}, {path:'workflow_executions.json',content:'{}'}, {path:'assets/results.json',content:'{"leaseUntil":"private","attemptId":"private"}'}, {path:'platform/orchestration/handler-worker.mjs',content:'code'}, {path:'assets/data.json',content:'{"execution_id":"execution-private","lease_until":"private","attempt_id":"private"}'}, {path:'workflow_versions.json',content:'{}'}]) assert.equal(auditLocalControlPlaneExport([file]).violations.length,1);
  assert.equal(auditLocalControlPlaneExport([{path:'index.html',content:'<p>Compare software</p>'}]).violations.length,0);
});
test('prior migrations retain exact manifest hashes',()=>{
  const expected=['5ceb6615e0f98bf6ede5104e64623500749e185f96a7cd06b150cae821dfd93d','b5b97a95509fbbc855612dfe23bf2a930710799966cd98ba2b63ad40eb6d0aa5','3895800206a62817705a29df91e0bf315d8b8ff8b370b129274e98db42048a27'];
  for(const [i,name] of ['manifest','control-manifest','approval-manifest'].entries()) assert.equal(JSON.parse(readFileSync(new URL('../src/platform/persistence/migrations/'+name+'.json',import.meta.url))).sha256,expected[i]);
});
test('runner migration pins exact SQL even if an altered manifest is supplied',()=>{
 const bytes=readFileSync(new URL('../src/platform/persistence/migrations/0004_synthetic_runner.sql',import.meta.url));
 const manifest=JSON.parse(readFileSync(new URL('../src/platform/persistence/migrations/runner-manifest.json',import.meta.url)));
 assert.equal(verifyRunnerMigration(bytes,manifest),true);
 assert.equal(bytes.toString().replace(/\r\n/g,'\n'),buildRunnerMigrationSql());
 const changed=Buffer.from(bytes.toString().replace('(status, retries, lease_until)','(status, retries, lease_until, input)'));
 assert.throws(()=>verifyRunnerMigration(changed,{...manifest,sha256:createHash('sha256').update(changed).digest('hex')}));
 assert.equal(verifyRunnerMigration(Buffer.from(bytes.toString().replace(/\r?\n/g,'\r\n')),manifest),true);
});
test('canonical digests survive PostgreSQL jsonb key ordering and bind array order',()=>{
 assert.equal(digest({version:1,tasks:[{handler:'summarize',id:'task-one'}]}),digest({tasks:[{id:'task-one',handler:'summarize'}],version:1}));
 assert.notEqual(digest([1,2]),digest([2,1]));
});
