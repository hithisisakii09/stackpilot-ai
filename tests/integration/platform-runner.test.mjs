import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {createHook} from 'node:async_hooks';
import {openLocalPool} from '../../src/platform/persistence/connection.mjs';
import {applyMigrations} from '../../src/platform/persistence/migrate.mjs';
import {createStore} from '../../src/platform/persistence/repositories.mjs';
import {openSyntheticRunner} from '../../src/platform/orchestration/runner.mjs';
import {expectedOutput} from '../../src/platform/orchestration/dag.mjs';

const config=JSON.parse(process.env.STACKPILOT_TEST_DB??'null');
if(config?.database!=='stackpilot_runner_test') throw new Error('Use disposable runner harness');
const admin=await openLocalPool(config);
let runner;
const request=(key,scenario='normal',delayMs=0)=>({key,templateId:'synthetic-preparation-v1',input:{items:[1,2,3,4],scenario,delayMs},costInr:0});
const child=async (mode,executionId)=>new Promise((resolve,reject)=>{
 const p=spawn(process.execPath,['tests/fixtures/runner-process.mjs',mode,executionId],{windowsHide:true,env:process.env,stdio:['ignore','pipe','pipe']});
 let out='',err='';p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);p.on('error',reject);
 const timer=setTimeout(()=>{p.kill();reject(new Error('Fixture process deadline'));},15000);
 p.on('close',code=>{clearTimeout(timer);if(code!==0)reject(new Error('Fixture process failed: '+err));else resolve(JSON.parse(out));});
});
const expire=execution=>admin.query("UPDATE tasks SET lease_until=clock_timestamp()-interval '1 second' WHERE execution_id=$1 AND status='RUNNING'",[execution]);
const counts=async execution=>(await admin.query("SELECT (SELECT count(*) FROM idempotency_keys WHERE operation='synthetic-task-effect' AND result->>'executionId'=$1) AS effects,(SELECT count(*) FROM audit_events WHERE action='synthetic-task-completed' AND data->>'executionId'=$1) AS audits,(SELECT count(*) FROM outbox_events WHERE kind='synthetic-task-completed' AND payload->>'executionId'=$1) AS outbox",[execution])).rows[0];

test('durable synthetic DAG runner on restricted PostgreSQL',async t=>{
 try {
  await t.test('explicit forward migration is canonical, idempotent and grants narrow execution writes',async()=>{
   assert.deepEqual(await applyMigrations(admin,{targetVersion:4}),{version:4,applied:true});
   assert.deepEqual(await applyMigrations(admin,{targetVersion:4}),{version:4,applied:false});
   const app=await openLocalPool({...config,user:'stackpilot_app'});
   try {for(const org of ['org-alpha','org-beta'])await createStore(app).transaction({organizationId:org,actorId:'fixture-user',requestId:'fixture-request'},repo=>repo.identity.createOrganization({name:org}));
    assert.deepEqual((await app.query("SELECT has_column_privilege(current_user,'tasks','status','UPDATE') AS yes,has_column_privilege(current_user,'tasks','input','UPDATE') AS no,has_table_privilege(current_user,'workflow_versions','UPDATE') AS versions")).rows[0],{yes:true,no:false,versions:false});
   }finally{await app.end();}
   runner=await openSyntheticRunner(config);
  });
  await t.test('duplicate submission binds exact input; unknown handlers, agents and spend are denied',async()=>{
   const a=runner.scope('org-alpha');const results=await Promise.all([a.enqueue(request('duplicate-key')),a.enqueue(request('duplicate-key'))]);assert.equal(results[0].id,results[1].id);
   await assert.rejects(a.enqueue({...request('duplicate-key'),input:{items:[9],scenario:'normal',delayMs:0}}));
   for(const r of [{...request('bad-template'),templateId:'execute-shell'},{...request('bad-cost'),costInr:1},{...request('bad-agent'),agentId:'business-agent'},{...request('bad-owner'),owner:true}])await assert.rejects(a.enqueue(r));
   const b=await runner.scope('org-beta').enqueue(request('duplicate-key'));assert.notEqual(b.id,results[0].id);
   await a.cancel(results[0].id);await runner.scope('org-beta').cancel(b.id);
  });
  await t.test('concurrent claims lease only two independent tasks, dependency waits, and effects commit once',async()=>{
   const a=runner.scope('org-alpha');const e=await a.enqueue(request('ordered-key'));
   const leases=(await Promise.all(Array.from({length:5},()=>a.claim(e.id)))).filter(Boolean);assert.equal(leases.length,2);assert.notEqual(leases[0].taskId,leases[1].taskId);
   for(const lease of leases)await a.complete(lease,expectedOutput(lease.work));
   const last=await a.claim(e.id);assert.equal(last.work.handler,'combine');await a.complete(last,expectedOutput(last.work));
   assert.equal((await a.inspect(e.id)).status,'COMPLETED');assert.deepEqual(await counts(e.id),{effects:'3',audits:'3',outbox:'3'});
   await assert.rejects(a.complete(last,expectedOutput(last.work)));assert.deepEqual(await counts(e.id),{effects:'3',audits:'3',outbox:'3'});
   const foreign=runner.scope('org-beta');
   for(const call of [()=>foreign.inspect(e.id),()=>foreign.complete(last,expectedOutput(last.work)),()=>foreign.claim(e.id),()=>foreign.cancel(e.id),()=>foreign.recover(e.id),()=>foreign.fail(last,'transient')])await assert.rejects(call());
  });
  await t.test('one-item and odd-length partitions preserve exact source count and sum',async()=>{
   const a=runner.scope('org-alpha');
   for(const items of [[7],[1,2,3]]){
    const e=await a.enqueue({...request('partition-'+items.length),input:{items,scenario:'normal',delayMs:0}});await a.run(e.id);
    const output=(await admin.query("SELECT k.result->'output'->'data' AS data FROM idempotency_keys k JOIN tasks t ON t.organization_id=k.organization_id AND t.id=k.id WHERE t.execution_id=$1 AND t.title IN ('inspect-left','inspect-right')",[e.id])).rows.map(x=>x.data);
    assert.equal(output.reduce((n,x)=>n+x.count,0),items.length);assert.equal(output.reduce((n,x)=>n+x.total,0),items.reduce((a,b)=>a+b,0));
   }
  });
  await t.test('expired attempt fence rejects stale completion after recovery and reassignment',async()=>{
   const a=runner.scope('org-alpha'),e=await a.enqueue(request('fencing-key'));const old=await a.claim(e.id);await expire(e.id);await a.recover(e.id);
   const fresh=await a.claim(e.id);assert.equal(fresh.taskId,old.taskId);assert.equal(fresh.attempt,2);assert.notEqual(fresh.attemptId,old.attemptId);
   await assert.rejects(a.complete(old,expectedOutput(old.work)));await a.complete(fresh,expectedOutput(fresh.work));await a.run(e.id);assert.equal((await a.inspect(e.id)).status,'COMPLETED');
  });
  await t.test('effect, task completion, audit and outbox roll back together on a real database failure',async()=>{
   const a=runner.scope('org-alpha'),e=await a.enqueue(request('rollback-key')),lease=await a.claim(e.id);
   await admin.query("CREATE FUNCTION fixture_reject_completion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='synthetic-task-completed' THEN RAISE EXCEPTION 'synthetic'; END IF; RETURN NEW; END $$; CREATE TRIGGER fixture_failure BEFORE INSERT ON outbox_events FOR EACH ROW EXECUTE FUNCTION fixture_reject_completion()");
   try {await assert.rejects(a.complete(lease,expectedOutput(lease.work)));assert.deepEqual(await counts(e.id),{effects:'0',audits:'0',outbox:'0'});assert.equal((await a.inspect(e.id)).tasks.find(x=>x.id===lease.taskId).status,'RUNNING');}
   finally{await admin.query('DROP TRIGGER fixture_failure ON outbox_events; DROP FUNCTION fixture_reject_completion()');}
   await a.complete(lease,expectedOutput(lease.work));await a.run(e.id);assert.deepEqual(await counts(e.id),{effects:'3',audits:'3',outbox:'3'});
  });
  await t.test('lease expiration during completion rolls back all writes before commit',async()=>{
   const a=runner.scope('org-alpha'),e=await a.enqueue(request('late-commit-key')),lease=await a.claim(e.id,{leaseMs:500});
   await admin.query("CREATE FUNCTION fixture_delay_completion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='synthetic-task-completed' THEN PERFORM pg_sleep(0.6); END IF; RETURN NEW; END $$; CREATE TRIGGER fixture_delay BEFORE INSERT ON outbox_events FOR EACH ROW EXECUTE FUNCTION fixture_delay_completion()");
   try{await assert.rejects(a.complete(lease,expectedOutput(lease.work)));assert.deepEqual(await counts(e.id),{effects:'0',audits:'0',outbox:'0'});}
   finally{await admin.query('DROP TRIGGER fixture_delay ON outbox_events; DROP FUNCTION fixture_delay_completion()');}
   await a.cancel(e.id);
  });
  await t.test('transient retry is bounded; permanent failures and invalid output block descendants',async()=>{
   const a=runner.scope('org-alpha');
   for(const scenario of ['transient-first','transient-always','permanent','invalid-output']){
    const e=await a.enqueue(request('scenario-'+scenario,scenario));await a.run(e.id);const state=await a.inspect(e.id);
    assert.equal(state.status,scenario==='transient-first'?'COMPLETED':'FAILED');
    if(scenario!=='transient-first')assert.ok(state.tasks.some(x=>x.status==='BLOCKED'));
    assert.ok(state.tasks.every(x=>x.retries<=3));
    if(scenario==='transient-always')assert.equal(Math.max(...state.tasks.map(x=>x.retries)),3);
    if(scenario==='permanent')assert.equal(Math.max(...state.tasks.map(x=>x.retries)),1);
   }
  });
  await t.test('hung worker is terminated and cancellation leaves no running workers or committed late effects',async()=>{
   const a=runner.scope('org-alpha'),e=await a.enqueue(request('hung-key','hang'));await a.run(e.id,{taskTimeoutMs:200});
   assert.equal((await a.inspect(e.id)).status,'FAILED');assert.equal(runner.activeWorkers,0);assert.deepEqual(await counts(e.id),{effects:'0',audits:'0',outbox:'0'});
   const c=await a.enqueue(request('cancel-key','normal',2000));const running=a.run(c.id);
   for(let i=0;i<100&&runner.activeWorkers===0;i++)await delay(10);
   await a.cancel(c.id);await running;assert.equal((await a.inspect(c.id)).status,'CANCELLED');assert.equal(runner.activeWorkers,0);assert.deepEqual(await counts(c.id),{effects:'0',audits:'0',outbox:'0'});
  });
  await t.test('a claim crossing the invocation deadline never starts a worker',async()=>{
   const a=runner.scope('org-alpha'),e=await a.enqueue(request('claim-deadline-key'));let created=0;
   const hook=createHook({init(_id,type){if(type==='WORKER')created++;}});
   await admin.query("CREATE FUNCTION fixture_delay_claim() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='synthetic-task-claimed' THEN PERFORM pg_sleep(0.2); END IF; RETURN NEW; END $$; CREATE TRIGGER fixture_claim_delay BEFORE INSERT ON outbox_events FOR EACH ROW EXECUTE FUNCTION fixture_delay_claim()");
   try{hook.enable();await a.run(e.id,{maxDurationMs:100});hook.disable();assert.equal(created,0);assert.equal(runner.activeWorkers,0);assert.equal((await counts(e.id)).effects,'0');}
   finally{hook.disable();await admin.query('DROP TRIGGER fixture_claim_delay ON outbox_events; DROP FUNCTION fixture_delay_claim()');await a.cancel(e.id);}
  });
  await t.test('real independent workers overlap and invocation ceilings stop bounded work',async()=>{
   const a=runner.scope('org-alpha'),e=await a.enqueue(request('overlap-key','normal',1000));
   const running=a.run(e.id,{maxTasks:2});
   for(let i=0;i<200&&runner.activeWorkers!==2;i++)await delay(10);
   assert.equal(runner.activeWorkers,2);await running;assert.equal(runner.activeWorkers,0);
   assert.equal((await counts(e.id)).effects,'2');assert.equal((await a.inspect(e.id)).status,'RUNNING');await a.run(e.id);assert.equal((await a.inspect(e.id)).status,'COMPLETED');
   for(const option of [{maxTasks:21},{maxConcurrent:3},{maxDurationMs:300001},{taskTimeoutMs:30001},{maxConcurrent:0},{arbitraryHandler:()=>{}}])await assert.rejects(a.run(e.id,option));
   const bounded=await a.enqueue(request('deadline-key','hang'));const started=Date.now();await a.run(bounded.id,{maxDurationMs:250,taskTimeoutMs:10000});assert.ok(Date.now()-started<5000);assert.equal(runner.activeWorkers,0);await a.cancel(bounded.id);
  });
  await t.test('failed completion waits for its live sibling worker before releasing invocation ownership',async()=>{
   const a=runner.scope('org-alpha'),e=await a.enqueue(request('sibling-cleanup-key'));
   await admin.query("UPDATE tasks SET input=jsonb_set(input,'{delayMs}','1500') WHERE execution_id=$1 AND title='inspect-right'",[e.id]);
   await admin.query("CREATE FUNCTION fixture_reject_worker() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='synthetic-task-completed' THEN RAISE EXCEPTION 'synthetic'; END IF; RETURN NEW; END $$; CREATE TRIGGER fixture_worker_failure BEFORE INSERT ON outbox_events FOR EACH ROW EXECUTE FUNCTION fixture_reject_worker()");
   try{await assert.rejects(a.run(e.id));assert.equal(runner.activeWorkers,0);}
   finally{await delay(1600);await admin.query('DROP TRIGGER fixture_worker_failure ON outbox_events; DROP FUNCTION fixture_reject_worker()');await a.cancel(e.id);}
  });
  await t.test('new processes recover a crashed lease and preserve committed output without replay',async()=>{
   const a=runner.scope('org-alpha'),e=await a.enqueue(request('restart-key'));const abandoned=await child('claim',e.id);assert.equal(abandoned.attempt,1);
   await expire(e.id);const recovered=await child('recover-run',e.id);assert.equal(recovered.status,'COMPLETED');assert.deepEqual(await counts(e.id),{effects:'3',audits:'3',outbox:'3'});
   const c=await a.enqueue(request('postcommit-key'));await child('claim-complete',c.id);assert.equal((await counts(c.id)).effects,'1');
   assert.equal((await child('recover-run',c.id)).status,'COMPLETED');assert.deepEqual(await counts(c.id),{effects:'3',audits:'3',outbox:'3'});
  });
  await t.test('persisted workflow alteration cannot launder an executable definition',async()=>{
   const a=runner.scope('org-alpha'),e=await a.enqueue(request('altered-key'));
   await admin.query("UPDATE workflow_versions SET definition='{}' WHERE organization_id='org-alpha'");
   await assert.rejects(a.claim(e.id));await assert.rejects(a.run(e.id));
  });
 }finally{await runner?.close();await admin.end();}
});
