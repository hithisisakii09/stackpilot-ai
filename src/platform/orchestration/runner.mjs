import {randomUUID} from 'node:crypto';
import {Worker} from 'node:worker_threads';
import {setTimeout as delay} from 'node:timers/promises';
import {performance} from 'node:perf_hooks';
import {sql} from 'drizzle-orm';
import {openLocalPool,normalizeLocalConnection} from '../persistence/connection.mjs';
import {withTransaction} from '../persistence/transaction.mjs';
import {fields,id,integer,json} from '../contracts/validation.mjs';
import {preparationWorkflow,parseSyntheticInput,parseSyntheticTaskInput,digest,expectedOutput} from './dag.mjs';

const uid=prefix=>prefix+'-'+randomUUID();
const definitionJson=JSON.stringify(preparationWorkflow);
const terminal=new Set(['COMPLETED','FAILED','CANCELLED']);
let invocationActive=false; // At most one invocation/two worker threads in this process.

export async function openSyntheticRunner(value){
 let config;
 try {
  config=normalizeLocalConnection(value);
  if(process.env.STACKPILOT_RUNNER_TEST!=='1'||config.database!=='stackpilot_runner_test'||config.user!=='stackpilot_local'||JSON.stringify(config)!==JSON.stringify(normalizeLocalConnection(JSON.parse(process.env.STACKPILOT_TEST_DB??'null'))))throw new Error();
 }catch{throw new Error('Synthetic runner unavailable');}
 const pool=await openLocalPool({...config,user:'stackpilot_app'});
 const workers=new Set();let closed=false;
 try{
  const marker=await pool.query("SELECT current_setting('stackpilot.runner_fixture',true) AS marker");
  if(marker.rows[0]?.marker!==config.clusterId)throw new Error();
  const readiness=await pool.query("SELECT has_column_privilege(current_user,'tasks','lease_until','UPDATE') AS ready");
  if(readiness.rows[0]?.ready!==true)throw new Error();
 }catch{await pool.end();throw new Error('Synthetic runner unavailable');}
 // Keep unexpected idle pool failures quiet and prevent future operations.
 pool.on('error',()=>{closed=true;for(const worker of workers)void worker.terminate();});

 function scope(organizationId){
  organizationId=id(organizationId);
  const context={organizationId,actorId:'synthetic-developer',requestId:'synthetic-runner'};
  async function transaction(callback){
   if(closed)throw new Error('Synthetic runner unavailable');
   return withTransaction(pool,context,async tx=>{
    await tx.db.execute(sql`SET LOCAL search_path=pg_catalog,public,pg_temp`);
    await tx.db.execute(sql`SET LOCAL TIME ZONE 'UTC'`);
    await tx.db.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId+'|synthetic-runner-v1'},0))`);
    return callback(tx);
   });
  }
  async function event(tx,action,targetId,executionId){
   const auditId=uid('audit');
   await tx.db.execute(sql`INSERT INTO audit_events(organization_id,id,actor_id,request_id,action,target_id,data) VALUES (${organizationId},${auditId},'synthetic-developer','synthetic-runner',${action},${targetId},${JSON.stringify({executionId})}::jsonb)`);
   await tx.db.execute(sql`INSERT INTO outbox_events(organization_id,id,audit_id,kind,payload) VALUES (${organizationId},${uid('outbox')},${auditId},${action},${JSON.stringify({executionId})}::jsonb)`);
  }
  async function load(tx,executionId){
   id(executionId);
   const records=await tx.db.execute(sql`SELECT e.*,v.definition,v.version,v.definition_id FROM workflow_executions e JOIN workflow_versions v ON v.organization_id=e.organization_id AND v.id=e.version_id WHERE e.organization_id=${organizationId} AND e.id=${executionId}`);
   const e=records.rows[0];
   if(!e||e.version!==1||e.definition_id!=='synthetic-preparation'||digest(e.definition)!==digest(preparationWorkflow)||e.cost_inr!==0)throw new Error('Invalid synthetic execution');
   const tasks=(await tx.db.execute(sql`SELECT * FROM tasks WHERE organization_id=${organizationId} AND execution_id=${executionId} ORDER BY title LIMIT 21`)).rows;
   if(tasks.length!==3)throw new Error('Invalid synthetic tasks');
   const dependencies=(await tx.db.execute(sql`SELECT task_id,depends_on_task_id FROM task_dependencies WHERE organization_id=${organizationId} AND execution_id=${executionId} LIMIT 21`)).rows;
   if(dependencies.length!==2)throw new Error('Invalid synthetic dependencies');
   for(const spec of preparationWorkflow.tasks){
    const task=tasks.find(t=>t.title===spec.id);
    if(!task||task.agent_id!==null||task.max_attempts!==3||task.cost_inr!==0)throw new Error('Invalid synthetic task');
    parseSyntheticTaskInput(task.input);
    const actual=dependencies.filter(d=>d.task_id===task.id).map(d=>tasks.find(t=>t.id===d.depends_on_task_id)?.title).sort();
    if(JSON.stringify(actual)!==JSON.stringify([...spec.dependencies].sort()))throw new Error('Invalid synthetic dependency');
   }
   return {execution:e,tasks};
  }
  async function settle(tx,executionId){
   // At most 20 nodes; recursive propagation never scans another execution.
   await tx.db.execute(sql`WITH RECURSIVE blocked(id) AS (
    SELECT id FROM tasks WHERE organization_id=${organizationId} AND execution_id=${executionId} AND status IN ('FAILED','BLOCKED','CANCELLED')
    UNION SELECT d.task_id FROM task_dependencies d JOIN blocked b ON d.depends_on_task_id=b.id WHERE d.organization_id=${organizationId} AND d.execution_id=${executionId}
   ) UPDATE tasks SET status='BLOCKED',lease_until=NULL WHERE organization_id=${organizationId} AND execution_id=${executionId} AND status='QUEUED' AND id IN (SELECT id FROM blocked)`);
   await tx.db.execute(sql`UPDATE workflow_executions SET status=CASE
    WHEN NOT EXISTS(SELECT 1 FROM tasks WHERE organization_id=${organizationId} AND execution_id=${executionId} AND status<>'COMPLETED') THEN 'COMPLETED'
    WHEN EXISTS(SELECT 1 FROM tasks WHERE organization_id=${organizationId} AND execution_id=${executionId} AND status IN ('QUEUED','RUNNING')) THEN 'RUNNING'
    ELSE 'FAILED' END WHERE organization_id=${organizationId} AND id=${executionId} AND status<>'CANCELLED'`);
  }
  async function recoverIn(tx,executionId){
   const expired=(await tx.db.execute(sql`SELECT id,retries FROM tasks WHERE organization_id=${organizationId} AND execution_id=${executionId} AND status='RUNNING' AND lease_until<=clock_timestamp() AT TIME ZONE 'UTC' LIMIT 20`)).rows;
   for(const task of expired){
    await tx.db.execute(sql`UPDATE task_attempts SET status='FAILED',output='{"code":"lease-expired"}'::jsonb WHERE organization_id=${organizationId} AND task_id=${task.id} AND attempt=${task.retries} AND status='RUNNING'`);
    await tx.db.execute(sql`UPDATE tasks SET status=${task.retries<3?'QUEUED':'FAILED'},lease_until=NULL WHERE organization_id=${organizationId} AND id=${task.id}`);
    await event(tx,'synthetic-lease-expired',task.id,executionId);
   }
   await settle(tx,executionId);return expired.length;
  }
  async function workFor(tx,task,tasks){
   const spec=preparationWorkflow.tasks.find(s=>s.id===task.title);
   const dependencies=[];
   for(const dep of spec.dependencies){
    const parent=tasks.find(t=>t.title===dep);
    const result=(await tx.db.execute(sql`SELECT result FROM idempotency_keys WHERE organization_id=${organizationId} AND id=${parent.id} AND operation='synthetic-task-effect'`)).rows[0];
    if(parent.status!=='COMPLETED'||!result)throw new Error('Missing committed dependency');
    dependencies.push(result.result.output);
   }
   return json({handler:spec.handler,...parseSyntheticTaskInput(task.input),dependencies});
  }
  async function live(tx,lease){
   fields(lease,['executionId','taskId','attempt','attemptId','work']);
   id(lease.taskId);id(lease.attemptId);integer(lease.attempt,1,3);
   const state=await load(tx,lease.executionId),task=state.tasks.find(t=>t.id===lease.taskId);
   const attempt=(await tx.db.execute(sql`SELECT id FROM task_attempts WHERE organization_id=${organizationId} AND task_id=${lease.taskId} AND attempt=${lease.attempt} AND id=${lease.attemptId} AND status='RUNNING'`)).rows[0];
   const valid=(await tx.db.execute(sql`SELECT id FROM tasks WHERE organization_id=${organizationId} AND id=${lease.taskId} AND status='RUNNING' AND retries=${lease.attempt} AND lease_until>clock_timestamp() AT TIME ZONE 'UTC'`)).rows.length===1;
   if(!task||!attempt||!valid||terminal.has(state.execution.status))throw new Error('Stale synthetic lease');
   return {...state,task};
  }
  const api={
   async enqueue(value){
    fields(value,['key','templateId','input','costInr']);id(value.key);
    if(value.templateId!==preparationWorkflow.id||value.costInr!==0)throw new Error('Synthetic template unavailable');
    const input=parseSyntheticInput(value.input),sourceDigest=digest({templateId:preparationWorkflow.id,input,costInr:0});
    return transaction(async tx=>{
     const prior=(await tx.db.execute(sql`SELECT * FROM idempotency_keys WHERE organization_id=${organizationId} AND id=${'submission-'+value.key}`)).rows[0];
     if(prior){if(prior.source_digest!==sourceDigest||prior.operation!=='synthetic-enqueue')throw new Error('Synthetic input conflict');return Object.freeze({id:prior.result.executionId});}
     await tx.db.execute(sql`INSERT INTO workflow_definitions(organization_id,id,name,objective) VALUES (${organizationId},'synthetic-preparation','Synthetic preparation','Database-local test only') ON CONFLICT DO NOTHING`);
     await tx.db.execute(sql`INSERT INTO workflow_versions(organization_id,id,definition_id,version,definition) VALUES (${organizationId},'synthetic-preparation-v1','synthetic-preparation',1,${definitionJson}::jsonb) ON CONFLICT DO NOTHING`);
     const executionId=uid('execution');
     await tx.db.execute(sql`INSERT INTO workflow_executions(organization_id,id,version_id,idempotency_key) VALUES (${organizationId},${executionId},'synthetic-preparation-v1',${value.key})`);
     const taskIds=new Map(preparationWorkflow.tasks.map(t=>[t.id,uid('task')]));
     for(const spec of preparationWorkflow.tasks){
      const half=Math.ceil(input.items.length/2),items=spec.id==='inspect-left'?input.items.slice(0,half):spec.id==='inspect-right'?input.items.slice(half):[];
      const taskInput={...input,items};
      await tx.db.execute(sql`INSERT INTO tasks(organization_id,id,execution_id,title,idempotency_key,input) VALUES (${organizationId},${taskIds.get(spec.id)},${executionId},${spec.id},${taskIds.get(spec.id)},${JSON.stringify(taskInput)}::jsonb)`);
     }
     for(const spec of preparationWorkflow.tasks)for(const dep of spec.dependencies)await tx.db.execute(sql`INSERT INTO task_dependencies(organization_id,id,execution_id,task_id,depends_on_task_id) VALUES (${organizationId},${uid('dependency')},${executionId},${taskIds.get(spec.id)},${taskIds.get(dep)})`);
     await tx.db.execute(sql`INSERT INTO idempotency_keys(organization_id,id,operation,source_digest,result) VALUES (${organizationId},${'submission-'+value.key},'synthetic-enqueue',${sourceDigest},${JSON.stringify({executionId})}::jsonb)`);
     await load(tx,executionId);await event(tx,'synthetic-execution-enqueued',executionId,executionId);
     return Object.freeze({id:executionId});
    });
   },
   async claim(executionId,options={}){
    fields(options,[],['leaseMs']);const leaseMs=options.leaseMs===undefined?35000:integer(options.leaseMs,100,35000);
    return transaction(async tx=>{
     await load(tx,executionId);await recoverIn(tx,executionId);const state=await load(tx,executionId);
     if(terminal.has(state.execution.status))return null;
     const active=await tx.db.execute(sql`SELECT count(*)::integer AS count FROM tasks WHERE organization_id=${organizationId} AND status='RUNNING' AND lease_until>clock_timestamp() AT TIME ZONE 'UTC'`);
     if(active.rows[0].count>=2)return null;
     const ready=(await tx.db.execute(sql`SELECT t.id FROM tasks t WHERE t.organization_id=${organizationId} AND t.execution_id=${executionId} AND t.status='QUEUED' AND t.retries<3 AND (t.lease_until IS NULL OR t.lease_until<=clock_timestamp() AT TIME ZONE 'UTC') AND NOT EXISTS(SELECT 1 FROM task_dependencies d JOIN tasks p ON p.organization_id=d.organization_id AND p.id=d.depends_on_task_id WHERE d.organization_id=${organizationId} AND d.task_id=t.id AND p.status<>'COMPLETED') ORDER BY t.title LIMIT 1`)).rows[0];
     if(!ready)return null;
     const task=state.tasks.find(t=>t.id===ready.id),attempt=task.retries+1,attemptId=uid('attempt');
     await tx.db.execute(sql`UPDATE tasks SET status='RUNNING',retries=${attempt},lease_until=(clock_timestamp() AT TIME ZONE 'UTC')+${leaseMs}*interval '1 millisecond' WHERE organization_id=${organizationId} AND id=${task.id}`);
     await tx.db.execute(sql`INSERT INTO task_attempts(organization_id,id,task_id,attempt,status) VALUES (${organizationId},${attemptId},${task.id},${attempt},'RUNNING')`);
     await tx.db.execute(sql`UPDATE workflow_executions SET status='RUNNING' WHERE organization_id=${organizationId} AND id=${executionId}`);
     await event(tx,'synthetic-task-claimed',task.id,executionId);
     return Object.freeze({executionId,taskId:task.id,attempt,attemptId,work:await workFor(tx,task,state.tasks)});
    });
   },
   async complete(lease,output){
    output=json(output);
    return transaction(async tx=>{
     const {task,tasks}=await live(tx,lease),work=await workFor(tx,task,tasks);
     if(digest(output)!==digest(expectedOutput(work)))throw new Error('Invalid synthetic output');
     await tx.db.execute(sql`INSERT INTO idempotency_keys(organization_id,id,operation,source_digest,result) VALUES (${organizationId},${task.id},'synthetic-task-effect',${digest(work)},${JSON.stringify({executionId:lease.executionId,output})}::jsonb)`);
     await tx.db.execute(sql`UPDATE task_attempts SET status='COMPLETED',output=${JSON.stringify(output)}::jsonb WHERE organization_id=${organizationId} AND id=${lease.attemptId}`);
     await event(tx,'synthetic-task-completed',task.id,lease.executionId);
     const remaining=await tx.db.execute(sql`SELECT id FROM tasks WHERE organization_id=${organizationId} AND id=${task.id} AND status='RUNNING' AND retries=${lease.attempt} AND lease_until>clock_timestamp() AT TIME ZONE 'UTC'`);
     if(remaining.rows.length!==1)throw new Error('Synthetic lease expired before commit');
     await tx.db.execute(sql`UPDATE tasks SET status='COMPLETED',lease_until=NULL WHERE organization_id=${organizationId} AND id=${task.id}`);
     await settle(tx,lease.executionId);
    });
   },
   async fail(lease,code){
    if(!['transient','permanent','timeout','invalid-output','worker-error'].includes(code))throw new Error('Invalid synthetic failure');
    return transaction(async tx=>{
     const {task}=await live(tx,lease),retry=code==='transient'&&task.retries<3;
     await tx.db.execute(sql`UPDATE task_attempts SET status='FAILED',output=${JSON.stringify({code})}::jsonb WHERE organization_id=${organizationId} AND id=${lease.attemptId}`);
     await tx.db.execute(sql`UPDATE tasks SET status=${retry?'QUEUED':'FAILED'},lease_until=CASE WHEN ${retry} THEN (clock_timestamp() AT TIME ZONE 'UTC')+${task.retries*50}*interval '1 millisecond' ELSE NULL END WHERE organization_id=${organizationId} AND id=${task.id}`);
     await event(tx,'synthetic-task-failed',task.id,lease.executionId);await settle(tx,lease.executionId);
    });
   },
   async recover(executionId){return transaction(async tx=>{await load(tx,executionId);return recoverIn(tx,executionId);});},
   async inspect(executionId){return transaction(async tx=>{
    const {execution,tasks}=await load(tx,executionId);
    return Object.freeze({id:execution.id,status:execution.status,tasks:tasks.map(t=>({id:t.id,title:t.title,status:t.status,retries:t.retries}))});
   });},
   async cancel(executionId){return transaction(async tx=>{
    const state=await load(tx,executionId);if(terminal.has(state.execution.status))return;
    await tx.db.execute(sql`UPDATE task_attempts SET status='CANCELLED',output='{"code":"cancelled"}'::jsonb WHERE organization_id=${organizationId} AND task_id IN (SELECT id FROM tasks WHERE organization_id=${organizationId} AND execution_id=${executionId}) AND status='RUNNING'`);
    await tx.db.execute(sql`UPDATE tasks SET status='CANCELLED',lease_until=NULL WHERE organization_id=${organizationId} AND execution_id=${executionId} AND status IN ('RUNNING','QUEUED')`);
    await tx.db.execute(sql`UPDATE workflow_executions SET status='CANCELLED' WHERE organization_id=${organizationId} AND id=${executionId}`);
    await event(tx,'synthetic-execution-cancelled',executionId,executionId);
   });},
   async run(executionId,options={}){
    fields(options,[],['maxConcurrent','maxTasks','maxDurationMs','taskTimeoutMs']);
    const concurrency=options.maxConcurrent===undefined?2:integer(options.maxConcurrent,1,2),maxTasks=options.maxTasks===undefined?20:integer(options.maxTasks,1,20),duration=options.maxDurationMs===undefined?300000:integer(options.maxDurationMs,1,300000),timeout=options.taskTimeoutMs===undefined?10000:integer(options.taskTimeoutMs,50,30000);
    if(invocationActive)throw new Error('Synthetic invocation already running');invocationActive=true;
    const deadline=performance.now()+duration;let claimed=0;
    try{
     await api.recover(executionId);
     while(claimed<maxTasks&&performance.now()<deadline){
      const state=await api.inspect(executionId);if(terminal.has(state.status))break;
      const leases=[];
      const batchSize=Math.min(concurrency,maxTasks-claimed);
      for(let i=0;i<batchSize&&performance.now()<deadline;i++){
       const lease=await api.claim(executionId);if(!lease)break;leases.push(lease);claimed++;
      }
      if(!leases.length){await delay(Math.min(25,Math.max(1,deadline-performance.now())));continue;}
      const outcomes=await Promise.allSettled(leases.map(async lease=>{
       if(performance.now()>=deadline){await api.fail(lease,'timeout');return;}
       const result=await executeWorker(lease,Math.max(1,Math.min(timeout,deadline-performance.now())),workers,()=>api.inspect(executionId),()=>closed);
       if(result.code==='cancelled')return;
       try{if(result.code)await api.fail(lease,result.code);else await api.complete(lease,result.output);}
       catch(error){
        // A concurrent cancellation/recovery may fence the result. Other DB errors remain visible.
        const latest=await api.inspect(executionId);
        if(latest.status!=='CANCELLED'&&latest.tasks.find(t=>t.id===lease.taskId)?.retries===lease.attempt)throw error;
       }
      }));
      const failure=outcomes.find(result=>result.status==='rejected');
      if(failure)throw failure.reason;
     }
     return await api.inspect(executionId);
    }finally{invocationActive=false;}
   }
  };
  return Object.freeze(api);
 }
 return Object.freeze({scope,get activeWorkers(){return workers.size;},async close(){closed=true;await Promise.all([...workers].map(w=>w.terminate()));await pool.end();}});
}

async function executeWorker(lease,timeoutMs,workers,inspect,isClosed){
 const worker=new Worker(new URL('./handler-worker.mjs',import.meta.url),{workerData:{work:lease.work,attempt:lease.attempt},env:{},execArgv:[],resourceLimits:{maxOldGenerationSizeMb:16,maxYoungGenerationSizeMb:4,stackSizeMb:1},stdout:true,stderr:true});
 workers.add(worker);worker.stdout.resume();worker.stderr.resume();
 let timer,poll,stopped=false,checking=false;
 try{return await new Promise(resolve=>{
  const finish=result=>{if(stopped)return;stopped=true;resolve(result);};
  worker.once('message',message=>{
   try{
    fields(message,[],['code','output']);
    if(message.code){if(!['transient','permanent'].includes(message.code))throw new Error();finish({code:message.code});}
    else {const output=json(message.output);if(digest(output)!==digest(expectedOutput(lease.work)))throw new Error();finish({output});}
   }catch{finish({code:'invalid-output'});}
  });
  worker.once('error',()=>finish({code:'worker-error'}));
  worker.once('exit',()=>finish({code:'worker-error'}));
  timer=setTimeout(()=>finish({code:'timeout'}),timeoutMs);
  poll=setInterval(async()=>{
   if(checking||stopped)return;checking=true;
   try{if(isClosed()||(await inspect()).status==='CANCELLED')finish({code:'cancelled'});}catch{finish({code:'worker-error'});}finally{checking=false;}
  },25);
 });}finally{clearTimeout(timer);clearInterval(poll);await worker.terminate();workers.delete(worker);}
}
