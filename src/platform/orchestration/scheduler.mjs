import {performance} from 'node:perf_hooks';
import {sql} from 'drizzle-orm';
import {fields,id,integer,dataArray} from '../contracts/validation.mjs';
import {openPreparationStore,appendPreparationEvent} from './preparation-store.mjs';
import {openSyntheticRunner} from './runner.mjs';
import {parseSyntheticInput} from './dag.mjs';
import {parseSchedule,parseWindow} from './schedule-policy.mjs';
import {resolveRoleDispatch} from './role-dispatch.mjs';
import {parseUnambiguousJson} from '../identity/trust.mjs';

export async function openLocalScheduler(config,options={}){
 fields(options,[],['enabledRoles']);
 const enabledRoles=new Set(dataArray(options.enabledRoles??[],41).map(id));
 for(const roleId of enabledRoles)resolveRoleDispatch({roleId,allowInDisposableScope:true});
 const store=await openPreparationStore(config);
 let runner;
 try{runner=await openSyntheticRunner(config);}catch(error){await store.close();throw error;}
 let closed=false;

 function scope(organizationId){
  id(organizationId);
  const scopedRunner=runner.scope(organizationId);
  const transaction=work=>{
   if(closed)throw new Error('Local scheduler unavailable');
   return store.transaction(organizationId,work);
  };
  async function changeState(jobId,state){
   id(jobId);
   const result=await transaction(async tx=>{
    const job=(await tx.db.execute(sql`SELECT * FROM scheduled_jobs WHERE organization_id=${organizationId} AND id=${jobId} FOR UPDATE`)).rows[0];
    if(!job)throw new Error('Unknown local job');
    if(state==='active'&&!enabledRoles.has(parseUnambiguousJson(job.schedule).roleId))throw new Error('Role preparation not selected');
    if(job.local_state==='cancelled'&&state!=='cancelled')throw new Error('Cancelled local job');
    if(job.local_state!==state){
     await tx.db.execute(sql`UPDATE scheduled_jobs SET local_state=${state} WHERE organization_id=${organizationId} AND id=${jobId}`);
     await appendPreparationEvent(tx,'local-schedule-'+state,jobId);
    }
    return {lastExecutionId:job.last_execution_id};
   });
   if(state==='cancelled'&&result.lastExecutionId)await scopedRunner.cancel(result.lastExecutionId);
  }
  return Object.freeze({
   async register(value){
    fields(value,['id','roleId','anchorMs','cadenceMs','items']);
    id(value.id);
    if(!enabledRoles.has(value.roleId))throw new Error('Role preparation not selected');
    const dispatch=resolveRoleDispatch({roleId:value.roleId,allowInDisposableScope:true});
    const schedule=parseSchedule({anchorMs:value.anchorMs,cadenceMs:value.cadenceMs});
    const input=parseSyntheticInput({items:value.items,scenario:'normal',delayMs:0,dispatch});
    const serialized=JSON.stringify({...schedule,roleId:dispatch.roleId,items:input.items});
    return transaction(async tx=>{
     const prior=(await tx.db.execute(sql`SELECT schedule FROM scheduled_jobs WHERE organization_id=${organizationId} AND id=${value.id}`)).rows[0];
     if(prior){if(prior.schedule!==serialized)throw new Error('Local schedule conflict');return {id:value.id};}
     await tx.db.execute(sql`INSERT INTO workflow_definitions(organization_id,id,name,objective) VALUES (${organizationId},'synthetic-preparation','Synthetic preparation','Database-local test only') ON CONFLICT DO NOTHING`);
     await tx.db.execute(sql`INSERT INTO scheduled_jobs(organization_id,id,definition_id,schedule,next_due_ms) VALUES (${organizationId},${value.id},'synthetic-preparation',${serialized},${schedule.anchorMs})`);
     await appendPreparationEvent(tx,'local-schedule-registered',value.id);
     return Object.freeze({id:value.id});
    });
   },
   pause:jobId=>changeState(jobId,'paused'),
   resume:jobId=>changeState(jobId,'active'),
   cancel:jobId=>changeState(jobId,'cancelled'),
   async tick(value){
    fields(value,['window'],['maxJobs','maxDurationMs','run','maxTasks','maxConcurrent']);
    const window=parseWindow(value.window);
    const maxJobs=value.maxJobs===undefined?20:integer(value.maxJobs,1,20);
    const duration=value.maxDurationMs===undefined?300000:integer(value.maxDurationMs,1,300000);
    const maxTasks=value.maxTasks===undefined?20:integer(value.maxTasks,1,20);
    const maxConcurrent=value.maxConcurrent===undefined?2:integer(value.maxConcurrent,1,2);
    if(value.run!==undefined&&typeof value.run!=='boolean')throw new Error('Invalid local tick mode');
    const deadline=performance.now()+duration;
    let deadlineMs;
    const jobs=await transaction(async tx=>{
     const clock=(await tx.db.execute(sql`SELECT floor(extract(epoch FROM clock_timestamp())*1000)::bigint AS now_ms`)).rows[0];
     if(window.toMs>Number(clock.now_ms))throw new Error('Future due window');
     deadlineMs=Number(clock.now_ms)+Math.max(1,Math.floor(deadline-performance.now()));
     if(enabledRoles.size===0)return [];
     const selectedRoles=sql.join([...enabledRoles].map(role=>sql`${role}`),sql`, `);
     const due=sql`((schedule::jsonb->>'anchorMs')::numeric+floor((${window.toMs}::numeric-1-(schedule::jsonb->>'anchorMs')::numeric)/(schedule::jsonb->>'cadenceMs')::numeric)*(schedule::jsonb->>'cadenceMs')::numeric)`;
     const outstanding=sql`EXISTS(SELECT 1 FROM workflow_executions e WHERE e.organization_id=${organizationId} AND e.id=j.last_execution_id AND e.status NOT IN ('COMPLETED','FAILED','CANCELLED'))`;
     return (await tx.db.execute(sql`SELECT id,last_execution_id,${outstanding} AS has_outstanding FROM scheduled_jobs j
      WHERE organization_id=${organizationId} AND local_state='active'
      AND schedule::jsonb->>'roleId' IN (${selectedRoles})
      AND ((${value.run===true} AND ${outstanding}) OR (${due}>=${window.fromMs} AND ${due}<${window.toMs} AND ${due}>=next_due_ms AND NOT ${outstanding}))
      ORDER BY has_outstanding DESC,${due},id LIMIT ${maxJobs}`)).rows;
    });
    const executions=[];
    let claimedTasks=0;
    for(const job of jobs){
     if(performance.now()>=deadline)break;
     let execution;
     try{
      execution=job.has_outstanding?{id:job.last_execution_id,jobId:job.id,resumed:true}:await scopedRunner.enqueueDue({jobId:job.id,window,deadlineMs});
     }catch(error){if(error.code==='PST01')break;throw error;}
     if(!execution)continue;
     executions.push(execution);
     if(value.run&&claimedTasks<maxTasks&&performance.now()<deadline){
      const before=await scopedRunner.inspect(execution.id);
      if(performance.now()>=deadline)break;
      const result=await scopedRunner.run(execution.id,{maxConcurrent,maxTasks:maxTasks-claimedTasks,maxDurationMs:Math.max(1,Math.floor(deadline-performance.now()))});
      claimedTasks+=result.tasks.reduce((sum,task)=>sum+task.retries,0)-before.tasks.reduce((sum,task)=>sum+task.retries,0);
     }
    }
    return Object.freeze({executions:Object.freeze(executions),claimedTasks});
   }
  });
 }
 return Object.freeze({scope,runner,async close(){closed=true;await runner.close();await store.close();}});
}
