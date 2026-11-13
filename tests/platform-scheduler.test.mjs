import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateDueWindow} from '../src/platform/orchestration/schedule-policy.mjs';
import {listRoleDispatches,resolveRoleDispatch} from '../src/platform/orchestration/role-dispatch.mjs';
import {openLocalScheduler} from '../src/platform/orchestration/scheduler.mjs';
import {auditLocalControlPlaneExport} from '../src/lib/local-control-plane-export.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {verifySchedulerMigration} from '../src/platform/persistence/migrate.mjs';
import {createAgentRegistry} from '../src/platform/agents/registry.mjs';

test('due windows are half-open, anchored and coalesce without catch-up storms',()=>{
 const spec={anchorMs:60000,cadenceMs:60000};
 assert.equal(evaluateDueWindow(spec,{fromMs:60000,toMs:120000},60000),60000);
 assert.equal(evaluateDueWindow(spec,{fromMs:60000,toMs:180001},60000),180000);
 assert.equal(evaluateDueWindow(spec,{fromMs:0,toMs:60000},60000),null);
 assert.equal(evaluateDueWindow(spec,{fromMs:60000,toMs:120000},120000),null);
});
test('due evaluation rejects invalid clocks, unbounded windows and cadence',()=>{
 for(const cadenceMs of [0,59999,86400001,NaN])assert.throws(()=>evaluateDueWindow({anchorMs:0,cadenceMs},{fromMs:0,toMs:120000},0));
 for(const window of [{fromMs:1,toMs:1},{fromMs:0,toMs:300001},{fromMs:-1,toMs:10},{fromMs:0,toMs:100,force:true}])assert.throws(()=>evaluateDueWindow({anchorMs:0,cadenceMs:60000},window,0));
});
test('41 immutable roles map into three preparation pipelines with explicit opt-in',()=>{
 const all=listRoleDispatches();assert.equal(all.length,41);assert.ok(all.every(x=>x.enabled===false));
 assert.deepEqual([...new Set(all.map(x=>x.pipeline))].sort(),['analysis-editorial-proposal','engineering-verification','research-intake']);
 for(const role of all){assert.throws(()=>resolveRoleDispatch({roleId:role.roleId}));const plan=resolveRoleDispatch({roleId:role.roleId,allowInDisposableScope:true});assert.equal(plan.pipeline,role.pipeline);assert.equal(plan.costInr,0);}
 for(const roleId of ['spend-money','publish-content','merge-protected-pr','unknown-role'])assert.throws(()=>resolveRoleDispatch({roleId,allowInDisposableScope:true}));
});
test('scheduler entry remains unavailable without disposable test selection',async()=>{
 await assert.rejects(openLocalScheduler({}),/unavailable/i);
});
test('fresh-dist rejects schedule, outbox and role execution internals',()=>{
 for(const file of [{path:'assets/code.js',content:'openLocalScheduler'},{path:'scheduled_jobs.json',content:'{}'},{path:'assets/data.json',content:'{"observed_at":"private"}'},{path:'agent_executions.csv',content:'private'},{path:'assets/code.js',content:'resolveRoleDispatch'},{path:'assets/data.json',content:'{"nextDueMs":123,"observedAt":"private"}'},{path:'assets/code.js',content:'export function evaluateDueWindow(){}'},{path:'assets/data.json',content:'{"pipeline":"research-intake","roleId":"market-research-agent"}'}])assert.equal(auditLocalControlPlaneExport([file]).violations.length,1);
});
test('migration five is canonically pinned and released migration four remains byte-identical',()=>{
 const bytes=readFileSync(new URL('../src/platform/persistence/migrations/0005_local_scheduler.sql',import.meta.url));
 const manifest=JSON.parse(readFileSync(new URL('../src/platform/persistence/migrations/scheduler-manifest.json',import.meta.url)));
 assert.equal(verifySchedulerMigration(bytes,manifest),true);
 const changed=Buffer.from(bytes.toString().replace('GRANT SELECT,INSERT ON agent_executions','GRANT SELECT,INSERT,DELETE ON agent_executions'));
 assert.throws(()=>verifySchedulerMigration(changed,{...manifest,sha256:createHash('sha256').update(changed).digest('hex')}));
 const prior=readFileSync(new URL('../src/platform/persistence/migrations/0004_synthetic_runner.sql',import.meta.url));
 assert.equal(createHash('sha256').update(prior.toString().replace(/\r\n/g,'\n')).digest('hex'),'09e9f659c57add3411c5d52f4c1552be03ea1a54137494ef60d5eccb31e9dfaf');
});
test('dispatch plans preserve immutable role execution ceilings',()=>{
 const registry=createAgentRegistry();
 for(const role of listRoleDispatches()){
  const dispatch=resolveRoleDispatch({roleId:role.roleId,allowInDisposableScope:true});
  assert.deepEqual(dispatch.limits,registry.get(role.roleId).limits);
 }
});
