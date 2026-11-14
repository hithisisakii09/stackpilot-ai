import {randomUUID} from 'node:crypto';
import {sql} from 'drizzle-orm';
import {normalizeLocalConnection,openLocalPool} from '../persistence/connection.mjs';
import {withTransaction} from '../persistence/transaction.mjs';
import {id} from '../contracts/validation.mjs';

export async function openPreparationStore(value){
 let config;
 try{
  config=normalizeLocalConnection(value);
  const selected=normalizeLocalConnection(JSON.parse(process.env.STACKPILOT_TEST_DB??'null'));
  const schedulerSelected=config.database==='stackpilot_scheduler_test'&&process.env.STACKPILOT_SCHEDULER_TEST==='1';
  const marketSelected=config.database==='stackpilot_market_test'&&process.env.STACKPILOT_MARKET_TEST==='1';
  if((!schedulerSelected&&!marketSelected)||config.user!=='stackpilot_local'||JSON.stringify(config)!==JSON.stringify(selected))throw new Error();
 }catch{throw new Error('Local preparation unavailable');}
 const pool=await openLocalPool({...config,user:'stackpilot_app'});
 let closed=false;
 try{
  const result=await pool.query("SELECT current_setting('stackpilot.runner_fixture',true) AS marker,has_column_privilege(current_user,'scheduled_jobs','next_due_ms','UPDATE') AS ready");
  if(result.rows[0].marker!==config.clusterId||result.rows[0].ready!==true)throw new Error();
 }catch{await pool.end();throw new Error('Local preparation unavailable');}
 pool.on('error',()=>{closed=true;});
 return Object.freeze({
  async transaction(organizationId,callback){
   if(closed)throw new Error('Local preparation unavailable');
   id(organizationId);
   return withTransaction(pool,{organizationId,actorId:'synthetic-developer',requestId:'local-preparation'},async tx=>{
    await tx.db.execute(sql`SET LOCAL search_path=pg_catalog,public,pg_temp`);
    await tx.db.execute(sql`SET LOCAL TIME ZONE 'UTC'`);
    await tx.db.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId+'|synthetic-runner-v1'},0))`);
    return callback(tx);
   });
  },
  async close(){closed=true;await pool.end();}
 });
}

export async function appendPreparationEvent(tx,action,targetId){
 const organizationId=tx.scope.organizationId;
 const auditId='audit-'+randomUUID();
 await tx.db.execute(sql`INSERT INTO audit_events(organization_id,id,actor_id,request_id,action,target_id,data) VALUES (${organizationId},${auditId},'synthetic-developer','local-preparation',${action},${targetId},'{}'::jsonb)`);
 await tx.db.execute(sql`INSERT INTO outbox_events(organization_id,id,audit_id,kind,payload) VALUES (${organizationId},${'outbox-'+randomUUID()},${auditId},${action},${JSON.stringify({targetId})}::jsonb)`);
}
