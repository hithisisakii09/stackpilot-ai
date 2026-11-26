import {sql} from 'drizzle-orm';
import {fields,id,integer} from '../contracts/validation.mjs';
import {openPreparationStore} from './preparation-store.mjs';

const projections=Object.freeze({
 outbox_events:'id,kind,observed_at',
 agent_executions:'id,execution_id,task_id,role_id,pipeline,status,output_digest',
 task_attempts:"id,task_id,attempt,status,CASE WHEN output->>'code' IN ('transient','permanent','timeout','lease-expired','invalid-output','worker-error','cancelled') THEN output->>'code' ELSE 'unknown' END AS failure_code",
 audit_events:'id,action,target_id'
});
const cursorTimePattern=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}$/;

function validateTable(table){
 if(typeof table!=='string'||!Object.hasOwn(projections,table))throw new Error('Unknown telemetry table');
 return table;
}
function parseCursor(value,organizationId,table){
 if(value===undefined)return null;
 fields(value,['version','organizationId','table','time','id']);
 if(value.version!==1||value.organizationId!==organizationId||value.table!==table||typeof value.time!=='string'||!cursorTimePattern.test(value.time))throw new Error('Invalid telemetry cursor');
 id(value.id);
 return value;
}
function classify(rows){
 const summary={};
 for(const row of rows){
  if(row.status==='FAILED'||row.status==='CANCELLED'){
   const code=row.failure_code??'unknown';
   summary[code]=(summary[code]??0)+1;
  }
 }
 return Object.freeze(summary);
}

export async function openLocalObservability(config){
 const store=await openPreparationStore(config);
 function scope(organizationId){
  id(organizationId);
  async function fetchPage(tx,table,limit,cursor,olderThanMs){
   const after=cursor?sql`AND (created_at,id)>(${cursor.time}::timestamp,${cursor.id})`:sql``;
   const cutoff=olderThanMs===undefined?sql``:sql`AND created_at<=(clock_timestamp() AT TIME ZONE 'UTC')-${olderThanMs}*interval '1 millisecond'`;
   const records=(await tx.db.execute(sql`SELECT ${sql.raw(projections[table])},to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS.US') AS cursor_time FROM ${sql.identifier(table)} WHERE organization_id=${organizationId} ${after} ${cutoff} ORDER BY created_at,id LIMIT ${limit+1}`)).rows;
   const selected=records.slice(0,limit);
   const last=selected.at(-1);
   const nextCursor=records.length>limit?Object.freeze({version:1,organizationId,table,time:last.cursor_time,id:last.id}):null;
   const rows=selected.map(({cursor_time,...row})=>Object.freeze({...row,createdAt:cursor_time}));
   return Object.freeze({rows:Object.freeze(rows),nextCursor,summaryScope:'page',failureSummary:classify(rows)});
  }
  return Object.freeze({
   async page(value){
    fields(value,['table'],['limit','cursor']);
    const table=validateTable(value.table),limit=value.limit===undefined?20:integer(value.limit,1,100);
    const cursor=parseCursor(value.cursor,organizationId,table);
    return store.transaction(organizationId,tx=>fetchPage(tx,table,limit,cursor));
   },
   async consume(value={}){
    fields(value,[],['limit']);
    const limit=value.limit===undefined?20:integer(value.limit,1,100);
    return store.transaction(organizationId,async tx=>{
     const rows=(await tx.db.execute(sql`SELECT id,kind FROM outbox_events WHERE organization_id=${organizationId} AND observed_at IS NULL ORDER BY created_at,id LIMIT ${limit} FOR UPDATE SKIP LOCKED`)).rows;
     for(const row of rows){
      const kind=typeof row.kind==='string'&&/^(?:synthetic|local)-[a-z-]{1,60}$/.test(row.kind)?row.kind:'unclassified';
      await tx.db.execute(sql`UPDATE outbox_events SET observed_at=clock_timestamp(),observation=${JSON.stringify({version:1,kind,delivery:'local-observation'})}::jsonb WHERE organization_id=${organizationId} AND id=${row.id} AND observed_at IS NULL`);
     }
     return Object.freeze({ids:Object.freeze(rows.map(row=>row.id)),delivery:'local-observation'});
    });
   },
   async retentionPreview(value){
    fields(value,['table','olderThanMs'],['limit','cursor']);
    const table=validateTable(value.table),age=integer(value.olderThanMs,0,31536000000);
    const limit=value.limit===undefined?20:integer(value.limit,1,100);
    const cursor=parseCursor(value.cursor,organizationId,table);
    const page=await store.transaction(organizationId,tx=>fetchPage(tx,table,limit,cursor,age));
    return Object.freeze({...page,dryRun:true,protected:table==='audit_events',deletionEnabled:false});
   }
  });
 }
 return Object.freeze({scope,close:()=>store.close()});
}
