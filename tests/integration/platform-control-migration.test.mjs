import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {getTableConfig} from 'drizzle-orm/pg-core';
import {openLocalPool} from '../../src/platform/persistence/connection.mjs';
import {applyMigrations} from '../../src/platform/persistence/migrate.mjs';
import {controlSchema} from '../../src/platform/persistence/control-schema.mjs';

const config=JSON.parse(process.env.STACKPILOT_TEST_DB??'null');
if(config?.database!=='stackpilot_control_test') throw new Error('Use the disposable test-cluster harness');
const admin=await openLocalPool(config);
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const digest='a'.repeat(64);
const context=async(role,organizationId,work)=>{
 if(!['stackpilot_control','stackpilot_app'].includes(role)) throw new Error('Invalid test role');
 const client=await admin.connect();
 try {
  await client.query('BEGIN');
  await client.query('SET LOCAL ROLE '+role);
  await client.query("SELECT set_config('stackpilot.organization_id',$1,true)",[organizationId]);
  const result=await work(client);
  await client.query('COMMIT');
  return result;
 } catch(error) {await client.query('ROLLBACK');throw error;}
 finally {client.release();}
};
const rejected=(work,code)=>assert.rejects(work,error=>error.code===code);
const challenge=(client,id='challenge-alpha',org='org-alpha',user='user-alpha',expiry=60)=>client.query("INSERT INTO auth_challenges (organization_id,id,user_id,key_id,key_fingerprint,nonce_digest,origin,expires_at) VALUES ($1,$2,$3,'owner-key',$4,$4,'https://127.0.0.1:55439',now()+$5*interval '1 second')",[org,id,user,digest,expiry]);

test('real PostgreSQL control migration upgrades explicit target without enabling login',async t=>{
 try {
  assert.deepEqual(await applyMigrations(admin,{targetVersion:1}),{version:1,applied:true});
  for(const suffix of ['alpha','beta']) {
   await admin.query('INSERT INTO organizations(id,name) VALUES ($1,$2)',['org-'+suffix,'Synthetic '+suffix]);
   await admin.query('INSERT INTO users(organization_id,id,display_name) VALUES ($1,$2,$3)',['org-'+suffix,'user-'+suffix,'Synthetic user']);
   await admin.query("INSERT INTO agents(organization_id,id,role,version) VALUES ($1,'qa-agent','qa',1)",['org-'+suffix]);
   await admin.query("INSERT INTO approval_requests(organization_id,id,agent_id,action,resource_id,payload_digest,evidence_digest) VALUES ($1,'request-pending','qa-agent','approve-claim','product-test',$2,$2)",['org-'+suffix,digest]);
  }
  await admin.query("INSERT INTO approval_decisions(organization_id,id,request_id,decider_user_id,decision,decided_at,request_digest) VALUES ('org-alpha','legacy-decision','request-pending','user-alpha','rejected',now(),$1)",[digest]);
  const original=(await admin.query('SELECT * FROM approval_decisions')).rows[0];
  assert.deepEqual(await applyMigrations(admin,{targetVersion:2}),{version:2,applied:true});
  await t.test('upgrade preserves original decision history and repeated/concurrent target 2 is idempotent',async()=>{
   assert.deepEqual((await admin.query('SELECT * FROM approval_decisions')).rows[0],{...original,version:1});
   assert.deepEqual(await Promise.all([applyMigrations(admin,{targetVersion:2}),applyMigrations(admin,{targetVersion:2})]),[{version:2,applied:false},{version:2,applied:false}]);
   await assert.rejects(applyMigrations(admin,{targetVersion:1}),/Migration failed/);
  });
  await t.test('reviewed control tables exist and the control role cannot log in',async()=>{
   const tables=await admin.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('auth_challenges','auth_sessions','approval_request_bindings') ORDER BY tablename");
   assert.deepEqual(tables.rows.map(r=>r.tablename),['approval_request_bindings','auth_challenges','auth_sessions']);
   const role=await admin.query("SELECT rolcanlogin,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb,rolinherit,rolreplication FROM pg_roles WHERE rolname='stackpilot_control'");
   assert.deepEqual(Object.values(role.rows[0]),Array(7).fill(false));
   assert.equal((await admin.query("SELECT count(*) FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname='stackpilot_control') OR roleid=(SELECT oid FROM pg_roles WHERE rolname='stackpilot_control')")).rows[0].count,'0');
  });
  await t.test('Drizzle control columns, keys, checks, indexes and forced RLS match the real catalog',async()=>{
   for(const [name,table] of Object.entries(controlSchema)) {
    const metadata=getTableConfig(table);
    const columns=await admin.query('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position',['public',name]);
    assert.deepEqual(columns.rows.map(c=>c.column_name),metadata.columns.map(c=>c.name));
    const constraints=await admin.query('SELECT contype FROM pg_constraint WHERE conrelid=$1::regclass',[name]);
    for(const [type,count] of [['p',1],['f',metadata.foreignKeys.length],['u',metadata.uniqueConstraints.length],['c',metadata.checks.length]]) assert.equal(constraints.rows.filter(c=>c.contype===type).length,count,name+' '+type);
    const flags=(await admin.query('SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid=$1::regclass',[name])).rows[0];
    assert.deepEqual(flags,{relrowsecurity:true,relforcerowsecurity:true});
    const indexes=await admin.query('SELECT array_agg(a.attname::text ORDER BY k.ordinality) AS columns FROM pg_index i CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY k(attnum,ordinality) JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum WHERE i.indrelid=$1::regclass GROUP BY i.indexrelid',[name]);
    for(const foreign of metadata.foreignKeys) assert.ok(indexes.rows.some(index=>foreign.reference().columns.every((col,i)=>index.columns[i]===col.name)),name+' indexed FK');
   }
   assert.equal((await admin.query("SELECT convalidated FROM pg_constraint WHERE conname='approval_decisions_fk3'")).rows[0].convalidated,false);
  });
  await t.test('ordered history rejects changed checksums, gaps and unknown future versions',async()=>{
   await admin.query("UPDATE _platform_migrations SET sha256=repeat('0',64) WHERE version=2");
   await assert.rejects(applyMigrations(admin,{targetVersion:2}),/Migration failed/);
   await admin.query('UPDATE _platform_migrations SET sha256=$1 WHERE version=2',[read('../../src/platform/persistence/migrations/control-manifest.json').sha256]);
   await admin.query('DELETE FROM _platform_migrations WHERE version=1');
   await assert.rejects(applyMigrations(admin,{targetVersion:2}),/Migration failed/);
   await admin.query('INSERT INTO _platform_migrations(version,sha256) VALUES (1,$1)',[read('../../src/platform/persistence/migrations/manifest.json').sha256]);
   await admin.query('INSERT INTO _platform_migrations(version,sha256) VALUES (3,$1)',[digest]);
   await assert.rejects(applyMigrations(admin,{targetVersion:2}),/Migration failed/);
   await admin.query('DELETE FROM _platform_migrations WHERE version=3');
  });
  await t.test('failed v2 DDL preserves v1 data, original conflicting table and original decision shape',async()=>{
   const failure=await openLocalPool({...config,database:'stackpilot_control_failure'});
   try {
    await applyMigrations(failure);
    await failure.query('CREATE TABLE auth_sessions(marker text)');
    await assert.rejects(applyMigrations(failure,{targetVersion:2}),/Migration failed/);
    assert.deepEqual((await failure.query("SELECT to_regclass('public.auth_challenges') AS challenge,(SELECT max(version) FROM _platform_migrations) AS version, (SELECT count(*) FROM information_schema.columns WHERE table_name='approval_decisions' AND column_name='version') AS added")).rows[0],{challenge:null,version:1,added:'0'});
    assert.equal((await failure.query("SELECT column_name FROM information_schema.columns WHERE table_name='auth_sessions'")).rows[0].column_name,'marker');
   } finally {await failure.end();}
  });
  await t.test('fresh target 2 rejects an elevated existing role atomically and succeeds after fixture repair',async()=>{
   const fresh=await openLocalPool({...config,database:'stackpilot_control_fresh'});
   try {
    await admin.query('ALTER ROLE stackpilot_control LOGIN');
    try {
     await assert.rejects(applyMigrations(fresh,{targetVersion:2}),/Migration failed/);
     assert.deepEqual((await fresh.query("SELECT to_regclass('public.organizations') AS organization,to_regclass('public._platform_migrations') AS ledger")).rows[0],{organization:null,ledger:null});
    } finally {await admin.query('ALTER ROLE stackpilot_control NOLOGIN');}
    assert.deepEqual(await applyMigrations(fresh,{targetVersion:2}),{version:2,applied:true});
   } finally {await fresh.end();}
  });
  await t.test('application role has no auth/binding privileges or decision inserts and cannot assume control',async()=>{
   for(const table of ['auth_challenges','auth_sessions','approval_request_bindings']) {
    await rejected(()=>context('stackpilot_app','org-alpha',c=>c.query('SELECT * FROM '+table)),'42501');
   }
   await rejected(()=>context('stackpilot_app','org-alpha',c=>c.query("INSERT INTO approval_decisions(organization_id,id,request_id,decider_user_id,decision,decided_at,request_digest) VALUES ('org-alpha','blocked-decision','request-pending','user-alpha','approved',now(),$1)",[digest])),'42501');
   // SET ROLE permission is based on session_user, so use an actual app login here.
   const app=await openLocalPool({...config,user:'stackpilot_app'});
   try {
    assert.equal((await app.query('SELECT current_user')).rows[0].current_user,'stackpilot_app');
    await rejected(()=>app.query('SET ROLE stackpilot_control'),'42501');
   } finally {await app.end();}
   for(const table of ['auth_challenges','auth_sessions','approval_request_bindings','approval_decisions','audit_events','outbox_events']) {
    assert.equal((await admin.query("SELECT has_table_privilege('stackpilot_control',$1,'DELETE') AS allowed",[table])).rows[0].allowed,false);
   }
   await rejected(()=>context('stackpilot_control','org-alpha',c=>c.query('CREATE TABLE public.unauthorized_control_table(id text)')),'42501');
   await rejected(()=>context('stackpilot_control','org-alpha',c=>c.query('UPDATE audit_events SET action=action')),'42501');
  });
  await t.test('existing column grants and table ownership cannot be laundered through a tagged control role',async()=>{
   for(const kind of ['acl','owner']) {
    const collision=await openLocalPool({...config,database:'stackpilot_control_'+kind+'_collision'});
    try {
     await applyMigrations(collision);
     if(kind==='acl') await collision.query('GRANT UPDATE(decision) ON approval_decisions TO stackpilot_control');
     else await collision.query('ALTER TABLE approval_decisions OWNER TO stackpilot_control');
     await assert.rejects(applyMigrations(collision,{targetVersion:2}),/Migration failed/);
     assert.deepEqual((await collision.query("SELECT to_regclass('public.auth_challenges') AS challenge,(SELECT max(version) FROM _platform_migrations) AS version")).rows[0],{challenge:null,version:1});
    } finally {
     if(kind==='acl') await collision.query('REVOKE UPDATE(decision) ON approval_decisions FROM stackpilot_control');
     else await collision.query('ALTER TABLE approval_decisions OWNER TO stackpilot_local');
     await collision.end();
    }
   }
  });
  await t.test('forced RLS and composite identity FKs isolate challenges and sessions',async()=>{
   await context('stackpilot_control','org-alpha',c=>challenge(c));
   await context('stackpilot_control','org-beta',c=>challenge(c,'challenge-beta','org-beta','user-beta'));
   assert.equal((await context('stackpilot_control','org-alpha',c=>c.query('SELECT * FROM auth_challenges'))).rowCount,1);
   assert.equal((await context('stackpilot_control','',c=>c.query('SELECT * FROM auth_challenges'))).rowCount,0);
   await rejected(()=>context('stackpilot_control','org-alpha',c=>challenge(c,'challenge-cross','org-beta','user-beta')),'42501');
   await rejected(()=>context('stackpilot_control','org-alpha',c=>challenge(c,'challenge-user-cross','org-alpha','user-beta')),'23503');
   await rejected(()=>context('stackpilot_control','org-alpha',c=>challenge(c,'challenge-too-long','org-alpha','user-alpha',61)),'23514');
   await context('stackpilot_control','org-alpha',c=>c.query("INSERT INTO auth_sessions(organization_id,id,user_id,key_id,key_fingerprint,challenge_id,token_hash,expires_at) VALUES ('org-alpha','session-alpha','user-alpha','owner-key',$1,'challenge-alpha',$1,now()+interval '15 minutes')",[digest]));
   await rejected(()=>context('stackpilot_control','org-alpha',c=>c.query("INSERT INTO auth_sessions(organization_id,id,user_id,key_id,key_fingerprint,challenge_id,token_hash,expires_at) VALUES ('org-alpha','session-replay','user-alpha','owner-key',$1,'challenge-alpha',$2,now()+interval '15 minutes')",[digest,'b'.repeat(64)])),'23505');
   await rejected(()=>context('stackpilot_control','org-alpha',c=>c.query("UPDATE auth_sessions SET token_hash=$1",['b'.repeat(64)])),'42501');
   await context('stackpilot_control','org-alpha',c=>c.query('UPDATE auth_sessions SET revoked_at=now()'));
   assert.equal((await context('stackpilot_control','org-beta',c=>c.query('SELECT * FROM auth_sessions'))).rowCount,0);
  });
  await t.test('new decisions need complete matching bindings and preserve append-only version history',async()=>{
   const decide=(c,id,version,hash=digest)=>c.query("INSERT INTO approval_decisions(organization_id,id,request_id,decider_user_id,decision,decided_at,request_digest,version) VALUES ('org-alpha',$1,'request-pending','user-alpha','revoked',now(),$2,$3)",[id,hash,version]);
   await rejected(()=>context('stackpilot_control','org-alpha',c=>decide(c,'decision-unbound',2)),'23503');
   await context('stackpilot_control','org-alpha',c=>c.query("INSERT INTO approval_request_bindings(organization_id,id,request_id,requester_agent_id,resource_type,resource_version,policy_version,risk,request_digest) VALUES ('org-alpha','binding-alpha','request-pending','qa-agent','product',1,1,'high',$1)",[digest]));
   await rejected(()=>context('stackpilot_control','org-alpha',c=>decide(c,'decision-wrong-hash',2,'b'.repeat(64))),'23503');
   await context('stackpilot_control','org-alpha',c=>decide(c,'decision-revocation',2));
   await rejected(()=>context('stackpilot_control','org-alpha',c=>decide(c,'decision-replayed',2)),'23505');
   await rejected(()=>context('stackpilot_control','org-alpha',c=>decide(c,'decision-negative',0)),'23514');
   await rejected(()=>context('stackpilot_control','org-alpha',c=>c.query('UPDATE approval_request_bindings SET resource_version=2')),'42501');
   await rejected(()=>context('stackpilot_control','org-alpha',c=>c.query("UPDATE approval_decisions SET decision='approved'")),'42501');
   assert.deepEqual((await context('stackpilot_control','org-alpha',c=>c.query('SELECT version FROM approval_decisions ORDER BY version'))).rows.map(r=>r.version),[1,2]);
  });
  await t.test('decision, audit and outbox writes roll back atomically under the control role',async()=>{
   await assert.rejects(context('stackpilot_control','org-alpha',async c=>{
    await c.query("INSERT INTO approval_decisions(organization_id,id,request_id,decider_user_id,decision,decided_at,request_digest,version) VALUES ('org-alpha','decision-rollback','request-pending','user-alpha','rejected',now(),$1,3)",[digest]);
    await c.query("INSERT INTO audit_events(organization_id,id,actor_id,request_id,action,target_id) VALUES ('org-alpha','audit-rollback','user-alpha','request-pending','decision-recorded','decision-rollback')");
    await c.query("INSERT INTO outbox_events(organization_id,id,audit_id,kind) VALUES ('org-alpha','outbox-rollback','audit-rollback','decision-recorded')");
    throw new Error('Synthetic rollback');
   }),/Synthetic rollback/);
   for(const table of ['approval_decisions','audit_events','outbox_events']) assert.equal((await admin.query('SELECT count(*) FROM '+table+" WHERE id LIKE '%-rollback'")).rows[0].count,'0');
  });
  await t.test('v2 pg_dump and owned isolated restore preserve history, auth hashes and migration idempotency',async()=>{
   const bin=process.env.STACKPILOT_PG_BIN, backup=process.env.STACKPILOT_TEST_BACKUP;
   const executable=name=>join(bin,name+(process.platform==='win32'?'.exe':''));
   const args=['-h','127.0.0.1','-p',String(config.port),'-U','stackpilot_local'];
   execFileSync(executable('pg_dump'),[...args,'-Fc','--file',backup,config.database],{stdio:'ignore',windowsHide:true,timeout:30000});
   execFileSync(executable('pg_restore'),[...args,'--exit-on-error','-d','stackpilot_control_restore',backup],{stdio:'ignore',windowsHide:true,timeout:30000});
   const restored=await openLocalPool({...config,database:'stackpilot_control_restore'});
   try {
    assert.deepEqual(await applyMigrations(restored,{targetVersion:2}),{version:2,applied:false});
    for(const table of ['auth_challenges','auth_sessions','approval_request_bindings','approval_decisions']) assert.equal((await restored.query('SELECT count(*) FROM '+table)).rows[0].count,(await admin.query('SELECT count(*) FROM '+table)).rows[0].count);
    assert.equal((await restored.query('SELECT token_hash FROM auth_sessions')).rows[0].token_hash,digest);
   } finally {await restored.end();}
  });
 } finally {await admin.end();}
});
