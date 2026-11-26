import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {spawnSync} from 'node:child_process';
import {openLocalPool} from '../../src/platform/persistence/connection.mjs';
import {applyMigrations} from '../../src/platform/persistence/migrate.mjs';
import {createStore} from '../../src/platform/persistence/repositories.mjs';
import {openLocalScheduler} from '../../src/platform/orchestration/scheduler.mjs';
import {openLocalObservability} from '../../src/platform/orchestration/observability.mjs';
import {listRoleDispatches} from '../../src/platform/orchestration/role-dispatch.mjs';
import {resolveRoleDispatch} from '../../src/platform/orchestration/role-dispatch.mjs';
import {agentExecutions} from '../../src/platform/persistence/scheduler-schema.mjs';
import {getTableConfig} from 'drizzle-orm/pg-core';

const config=JSON.parse(process.env.STACKPILOT_TEST_DB??'null');
if(config?.database!=='stackpilot_scheduler_test')throw new Error('Use the disposable scheduler harness');
const admin=await openLocalPool(config);
const roles=listRoleDispatches();
let scheduler,telemetry;
const anchor=()=>Math.floor((Date.now()-2000)/60000)*60000;
const windowFor=at=>({fromMs:at,toMs:at+1000});
const registration=(id,roleId=roles[0].roleId)=>({id,roleId,anchorMs:anchor(),cadenceMs:60000,items:[1,2,3]});

test('bounded scheduler, role preparation and outbox observability',async t=>{
 try{
  await t.test('migration 5 is explicit and scoped defaults keep scheduling and role execution disabled',async()=>{
   assert.deepEqual(await applyMigrations(admin,{targetVersion:5}),{version:5,applied:true});
   assert.deepEqual(await applyMigrations(admin,{targetVersion:5}),{version:5,applied:false});
   const actualColumns=(await admin.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='agent_executions' ORDER BY ordinal_position")).rows.map(row=>row.column_name);
   assert.deepEqual(actualColumns,getTableConfig(agentExecutions).columns.map(column=>column.name));
   const flags=(await admin.query("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid='agent_executions'::regclass")).rows[0];assert.deepEqual(flags,{relrowsecurity:true,relforcerowsecurity:true});
   const app=await openLocalPool({...config,user:'stackpilot_app'});
   try{
    for(const organizationId of ['org-alpha','org-beta'])await createStore(app).transaction({organizationId,actorId:'fixture-owner',requestId:'fixture-request'},r=>r.identity.createOrganization({name:organizationId}));
    const grants=(await app.query("SELECT has_column_privilege(current_user,'outbox_events','payload','UPDATE') AS payload,has_table_privilege(current_user,'audit_events','DELETE') AS audit_delete,has_table_privilege(current_user,'agent_executions','UPDATE') AS execution_update")).rows[0];
    assert.deepEqual(grants,{payload:false,audit_delete:false,execution_update:false});
   }finally{await app.end();}
   const disabled=await openLocalScheduler(config);
   try{await assert.rejects(disabled.scope('org-alpha').register(registration('disabled-job')));}finally{await disabled.close();}
   scheduler=await openLocalScheduler(config,{enabledRoles:roles.map(r=>r.roleId)});
   telemetry=await openLocalObservability(config);
  });
  await t.test('paused default, half-open windows, concurrent ticks and replay enqueue only once',async()=>{
   const a=scheduler.scope('org-alpha'),job=registration('schedule-one');await a.register(job);
   assert.equal((await a.tick({window:windowFor(job.anchorMs)})).executions.length,0);
   await a.resume(job.id);
   const ticks=await Promise.all(Array.from({length:5},()=>a.tick({window:windowFor(job.anchorMs)})));
   const executions=ticks.flatMap(x=>x.executions);assert.equal(executions.length,1);
   assert.equal((await a.tick({window:windowFor(job.anchorMs)})).executions.length,0);
   assert.equal((await admin.query('SELECT enabled FROM scheduled_jobs WHERE id=$1',[job.id])).rows[0].enabled,false);
   const inspect=await scheduler.runner.scope('org-alpha').inspect(executions[0].id);assert.equal(inspect.status,'QUEUED');
   await a.cancel(job.id);assert.equal((await scheduler.runner.scope('org-alpha').inspect(executions[0].id)).status,'CANCELLED');
  });
  await t.test('future windows, tenant substitution and invalid cadence or invocation bounds are rejected',async()=>{
   const a=scheduler.scope('org-alpha'),foreign=scheduler.scope('org-beta');
   for(const call of [()=>foreign.pause('schedule-one'),()=>foreign.resume('schedule-one'),()=>foreign.cancel('schedule-one')])await assert.rejects(call());
   for(const patch of [{cadenceMs:1},{roleId:'spend-money'},{organizationId:'org-beta'},{enabled:true},{items:[]}])await assert.rejects(a.register({...registration('invalid-job'),...patch}));
   for(const options of [{window:{fromMs:Date.now()+60000,toMs:Date.now()+61000}},{window:windowFor(anchor()),maxJobs:21},{window:windowFor(anchor()),maxConcurrent:3},{window:windowFor(anchor()),maxDurationMs:300001}])await assert.rejects(a.tick(options));
  });
  await t.test('cursor advance and execution enqueue roll back together on outbox failure',async()=>{
   const a=scheduler.scope('org-alpha'),job=registration('rollback-job');await a.register(job);await a.resume(job.id);
   await admin.query("CREATE FUNCTION fixture_schedule_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='synthetic-execution-enqueued' THEN RAISE EXCEPTION 'fixture'; END IF; RETURN NEW; END $$; CREATE TRIGGER fixture_schedule_failure BEFORE INSERT ON outbox_events FOR EACH ROW EXECUTE FUNCTION fixture_schedule_fail()");
   try{await assert.rejects(a.tick({window:windowFor(job.anchorMs)}));assert.equal((await admin.query('SELECT next_due_ms FROM scheduled_jobs WHERE id=$1',[job.id])).rows[0].next_due_ms,String(job.anchorMs));}
   finally{await admin.query('DROP TRIGGER fixture_schedule_failure ON outbox_events; DROP FUNCTION fixture_schedule_fail()');}
   assert.equal((await a.tick({window:windowFor(job.anchorMs)})).executions.length,1);await a.cancel(job.id);
  });
  await t.test('a transaction crossing the tick deadline rolls back its enqueue and cursor',async()=>{
   const a=scheduler.scope('org-alpha'),job=registration('deadline-schedule-job');await a.register(job);await a.resume(job.id);
   await admin.query("CREATE FUNCTION fixture_schedule_delay() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='synthetic-execution-enqueued' THEN PERFORM pg_sleep(0.3); END IF; RETURN NEW; END $$; CREATE TRIGGER fixture_schedule_delay BEFORE INSERT ON outbox_events FOR EACH ROW EXECUTE FUNCTION fixture_schedule_delay()");
   try{const result=await a.tick({window:windowFor(job.anchorMs),maxDurationMs:150});assert.equal(result.executions.length,0);assert.equal((await admin.query('SELECT next_due_ms,last_execution_id FROM scheduled_jobs WHERE id=$1',[job.id])).rows[0].last_execution_id,null);}
   finally{await admin.query('DROP TRIGGER fixture_schedule_delay ON outbox_events; DROP FUNCTION fixture_schedule_delay()');await a.cancel(job.id);}
  });
  await t.test('three pipelines execute actual fixed worker preparations and append scoped role observations',async()=>{
   const a=scheduler.scope('org-alpha');
   for(const [i,pipeline] of ['research-intake','analysis-editorial-proposal','engineering-verification'].entries()){
    const role=roles.find(r=>r.pipeline===pipeline),job=registration('pipeline-job-'+i,role.roleId);await a.register(job);await a.resume(job.id);
    const tick=await a.tick({window:windowFor(job.anchorMs),run:true,maxTasks:3,maxConcurrent:2});assert.equal(tick.executions.length,1);
    assert.equal((await scheduler.runner.scope('org-alpha').inspect(tick.executions[0].id)).status,'COMPLETED');
    const observations=(await admin.query('SELECT pipeline,role_id FROM agent_executions WHERE execution_id=$1',[tick.executions[0].id])).rows;
    const attempts=(await admin.query('SELECT max_attempts FROM tasks WHERE execution_id=$1',[tick.executions[0].id])).rows;assert.ok(attempts.every(row=>row.max_attempts===2));
    assert.equal(observations.length,3);assert.ok(observations.every(x=>x.pipeline===pipeline&&x.role_id===role.roleId));await a.pause(job.id);
   }
   assert.equal(scheduler.runner.activeWorkers,0);
   assert.equal((await admin.query('SELECT count(*) FROM agents WHERE enabled=true')).rows[0].count,'0');
  });
  await t.test('bounded ticks limit jobs and attempts and explicit pause stops later occurrences',async()=>{
   const a=scheduler.scope('org-alpha');const jobs=[registration('bounded-job-one'),registration('bounded-job-two')];
   for(const job of jobs){await a.register(job);await a.resume(job.id);}
   const result=await a.tick({window:windowFor(jobs[0].anchorMs),maxJobs:1,run:true,maxTasks:1});assert.equal(result.executions.length,1);assert.equal(result.claimedTasks,1);
   for(const job of jobs)await a.pause(job.id);
   assert.equal((await a.tick({window:windowFor(jobs[0].anchorMs)})).executions.length,0);
   for(const job of jobs)await a.cancel(job.id);
  });
  await t.test('cancelling a running scheduled invocation drains all workers before tick completion',async()=>{
   const a=scheduler.scope('org-alpha'),job=registration('cancel-running-job');await a.register(job);await a.resume(job.id);
   const ticking=a.tick({window:windowFor(job.anchorMs),run:true});
   for(let i=0;i<200&&scheduler.runner.activeWorkers===0;i++)await delay(5);
   assert.ok(scheduler.runner.activeWorkers>0);await a.cancel(job.id);
   const result=await ticking;assert.equal(scheduler.runner.activeWorkers,0);
   assert.equal((await scheduler.runner.scope('org-alpha').inspect(result.executions[0].id)).status,'CANCELLED');
  });
  await t.test('role observations reject attribution to an attempt belonging to another task',async()=>{
   const rows=(await admin.query('SELECT * FROM agent_executions ORDER BY created_at,id LIMIT 2')).rows;
   await assert.rejects(admin.query("INSERT INTO agent_executions(organization_id,id,execution_id,task_id,attempt_id,role_id,pipeline,output_digest) VALUES ($1,'mismatched-attempt',$2,$3,$4,$5,$6,$7)",[rows[0].organization_id,rows[0].execution_id,rows[0].task_id,rows[1].attempt_id,rows[0].role_id,rows[0].pipeline,rows[0].output_digest]));
  });
  await t.test('role leases and recovery preserve concurrency one and the two-attempt ceiling',async()=>{
   const r=scheduler.runner.scope('org-alpha');
   const dispatch=resolveRoleDispatch({roleId:roles[0].roleId,allowInDisposableScope:true});
   const e=await r.enqueue({key:'role-limit-work',templateId:'synthetic-preparation-v1',input:{items:[1,2],scenario:'transient-always',delayMs:0,dispatch},costInr:0});
   const leases=(await Promise.all([r.claim(e.id),r.claim(e.id),r.claim(e.id)])).filter(Boolean);assert.equal(leases.length,1);
   await admin.query("UPDATE tasks SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1",[leases[0].taskId]);await r.recover(e.id);
   const second=await r.claim(e.id);assert.equal(second.attempt,2);
   await admin.query("UPDATE tasks SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1",[second.taskId]);await r.recover(e.id);
   const state=await r.run(e.id);assert.equal(state.status,'FAILED');assert.ok(state.tasks.every(task=>task.retries<=2));assert.equal(state.tasks.find(task=>task.id===second.taskId).retries,2);
  });
  await t.test('existing jobs require invocation role opt-in and one outstanding execution per job',async()=>{
   const a=scheduler.scope('org-alpha');const job={...registration('single-flight-job'),anchorMs:anchor()-180000};await a.register(job);await a.resume(job.id);
   const disabled=await openLocalScheduler(config);
   try{assert.equal((await disabled.scope('org-alpha').tick({window:windowFor(job.anchorMs)})).executions.length,0);await assert.rejects(disabled.scope('org-alpha').resume(job.id));}
   finally{await disabled.close();}
   const first=await a.tick({window:windowFor(job.anchorMs)});assert.equal(first.executions.length,1);
   assert.equal((await a.tick({window:windowFor(job.anchorMs+60000)})).executions.length,0);
   await a.cancel(job.id);assert.equal((await scheduler.runner.scope('org-alpha').inspect(first.executions[0].id)).status,'CANCELLED');
  });
  await t.test('an off-phase overdue job cannot starve a due job under maxJobs one',async()=>{
   const a=scheduler.scope('org-alpha'),at=anchor()-180000;
   const stale={...registration('stale-first-job'),anchorMs:at-10000};const due={...registration('due-second-job'),anchorMs:at};
   for(const job of [stale,due]){await a.register(job);await a.resume(job.id);}
   const tick=await a.tick({window:windowFor(at),maxJobs:1});assert.equal(tick.executions.length,1);assert.equal(tick.executions[0].jobId,due.id);
   for(const job of [stale,due])await a.cancel(job.id);
  });
  await t.test('a new process replays a completed occurrence without duplicating its execution',async()=>{
   const a=scheduler.scope('org-alpha'),job=registration('restart-schedule-job');await a.register(job);await a.resume(job.id);
   const first=await a.tick({window:windowFor(job.anchorMs),run:true});assert.equal(first.executions.length,1);
   const child=spawnSync(process.execPath,['tests/fixtures/scheduler-process.mjs',JSON.stringify(windowFor(job.anchorMs))],{windowsHide:true,encoding:'utf8',timeout:15000,env:process.env});
   assert.equal(child.status,0);assert.deepEqual(JSON.parse(child.stdout),{enqueued:0});await a.cancel(job.id);
  });
  await t.test('a new process run tick resumes partially completed work without enqueuing another occurrence',async()=>{
   const a=scheduler.scope('org-alpha'),job=registration('partial-restart-job');await a.register(job);await a.resume(job.id);
   const first=await a.tick({window:windowFor(job.anchorMs),run:true,maxTasks:1});assert.equal(first.claimedTasks,1);
   const child=spawnSync(process.execPath,['tests/fixtures/scheduler-process.mjs',JSON.stringify(windowFor(job.anchorMs)),'run'],{windowsHide:true,encoding:'utf8',timeout:15000,env:process.env});
   assert.equal(child.status,0);assert.deepEqual(JSON.parse(child.stdout),{enqueued:0,resumed:1});
   assert.equal((await scheduler.runner.scope('org-alpha').inspect(first.executions[0].id)).status,'COMPLETED');await a.cancel(job.id);
  });
  await t.test('outbox consumers serialize and replay produces no duplicate local observations',async()=>{
   const o=telemetry.scope('org-alpha');
   const before=Number((await admin.query("SELECT count(*) FROM outbox_events WHERE organization_id='org-alpha' AND observed_at IS NULL")).rows[0].count);
   let total=0;
   for(let i=0;i<20;i++){const batch=await Promise.all([o.consume({limit:20}),o.consume({limit:20})]);const ids=batch.flatMap(x=>x.ids);assert.equal(new Set(ids).size,ids.length);total+=ids.length;if(!ids.length)break;}
   assert.equal(total,before);assert.deepEqual((await o.consume({limit:20})).ids,[]);
   const beta=await telemetry.scope('org-beta').consume({limit:20});
   if(beta.ids.length){const owned=(await admin.query('SELECT id FROM outbox_events WHERE organization_id=$1',['org-beta'])).rows.map(r=>r.id);assert.ok(beta.ids.every(id=>owned.includes(id)));}
  });
  await t.test('outbox observation updates roll back together and remain replayable after failure',async()=>{
   await admin.query("INSERT INTO audit_events(organization_id,id,actor_id,request_id,action,target_id) VALUES ('org-beta','rollback-audit','fixture-owner','fixture-request','fixture','fixture-target')");
   for(const id of ['rollback-outbox-one','rollback-outbox-two'])await admin.query("INSERT INTO outbox_events(organization_id,id,audit_id,kind,payload) VALUES ('org-beta',$1,'rollback-audit','local-fixture','{}')",[id]);
   await admin.query("CREATE FUNCTION fixture_observe_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='rollback-outbox-two' THEN RAISE EXCEPTION 'fixture'; END IF; RETURN NEW; END $$; CREATE TRIGGER fixture_observe_failure BEFORE UPDATE ON outbox_events FOR EACH ROW EXECUTE FUNCTION fixture_observe_fail()");
   const beta=telemetry.scope('org-beta');
   try{await assert.rejects(beta.consume({limit:20}));assert.equal((await admin.query("SELECT count(*) FROM outbox_events WHERE organization_id='org-beta' AND id LIKE 'rollback-outbox-%' AND observed_at IS NULL AND observation='{}'::jsonb")).rows[0].count,'2');}
   finally{await admin.query('DROP TRIGGER fixture_observe_failure ON outbox_events; DROP FUNCTION fixture_observe_fail()');}
   assert.equal((await beta.consume({limit:20})).ids.length,2);assert.equal((await beta.consume({limit:20})).ids.length,0);
  });
  await t.test('cursor pagination preserves microseconds, scope and stable ordering on bounded telemetry',async()=>{
   for(const [i,micro] of ['123001','123002','123003'].entries())await admin.query("INSERT INTO audit_events(organization_id,id,actor_id,request_id,action,target_id,created_at) VALUES ('org-alpha',$1,'fixture-owner','fixture-request','fixture','fixture-target',$2::timestamp)",['micro-event-'+i,'2020-01-01T00:00:00.'+micro]);
   let precise;
   for(const micro of ['123001','123002','123003']){const page=await telemetry.scope('org-alpha').page({table:'audit_events',limit:1,...(precise?{cursor:precise}:{})});assert.ok(page.rows[0].createdAt.endsWith(micro));precise=page.nextCursor;}
   const o=telemetry.scope('org-alpha');let cursor=null;const ids=[];
   for(let i=0;i<100;i++){const page=await o.page({table:'audit_events',limit:3,...(cursor?{cursor}:{})});ids.push(...page.rows.map(x=>x.id));if(!page.nextCursor)break;cursor=page.nextCursor;}
   assert.equal(ids.length,new Set(ids).size);assert.equal(ids.length,Number((await admin.query("SELECT count(*) FROM audit_events WHERE organization_id='org-alpha'")).rows[0].count));
   const first=await o.page({table:'task_attempts',limit:2});assert.ok(first.nextCursor);
   await assert.rejects(telemetry.scope('org-beta').page({table:'task_attempts',limit:2,cursor:first.nextCursor}));
   await assert.rejects(o.page({table:'audit_events',limit:2,cursor:first.nextCursor}));
   for(const table of ['outbox_events','agent_executions','task_attempts'])assert.ok((await o.page({table,limit:2})).rows.length<=2);
  });
  await t.test('retention is bounded read-only preview and failure summaries classify only the returned page',async()=>{
   const before=await admin.query('SELECT count(*) FROM audit_events');
   const o=telemetry.scope('org-alpha');
   const preview=await o.retentionPreview({table:'audit_events',olderThanMs:0,limit:2});assert.equal(preview.protected,true);assert.equal(preview.dryRun,true);assert.ok(preview.rows.length<=2);
   assert.equal((await admin.query('SELECT count(*) FROM audit_events')).rows[0].count,before.rows[0].count);
   const tasks=(await admin.query("SELECT id FROM tasks WHERE status='COMPLETED' LIMIT 2")).rows;
   for(const [index,code] of ['transient','sensitive-diagnostic'].entries())await admin.query("INSERT INTO task_attempts(organization_id,id,task_id,attempt,status,output) VALUES ('org-alpha',$1,$2,2,'FAILED',$3::jsonb)",['classified-attempt-'+index,tasks[index].id,JSON.stringify({code})]);
   const page=await o.page({table:'task_attempts',limit:100});assert.equal(page.summaryScope,'page');assert.ok(page.failureSummary.transient>=1);assert.equal(page.failureSummary.unknown,1);assert.equal(JSON.stringify(page).includes('sensitive-diagnostic'),false);
   await assert.rejects(o.page({table:'approval_decisions',limit:2}));await assert.rejects(o.consume({limit:101}));
  });
 }finally{await telemetry?.close();await scheduler?.close();await admin.end();}
});
