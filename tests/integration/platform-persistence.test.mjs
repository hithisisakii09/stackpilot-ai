import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {getTableConfig} from 'drizzle-orm/pg-core';
import {openLocalPool} from '../../src/platform/persistence/connection.mjs';
import {applyMigrations} from '../../src/platform/persistence/migrate.mjs';
import {schema} from '../../src/platform/persistence/schema.mjs';
import {createStore,importCandidates} from '../../src/platform/persistence/repositories.mjs';
import {withTransaction} from '../../src/platform/persistence/transaction.mjs';
import {createAgentRegistry} from '../../src/platform/agents/registry.mjs';

const config = JSON.parse(process.env.STACKPILOT_TEST_DB ?? 'null');
if (!config || config.database!=='stackpilot_test') throw new Error('Use the disposable test-cluster harness');
const read = path => JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const input = {products:read('../../src/data/products.json'),evidenceLeads:read('../../src/data/evidence-leads.json'),claims:read('../../src/data/research-claims.json')};
const context = organizationId => ({organizationId,actorId:'system-test',requestId:'request-test'});
const admin = await openLocalPool(config);
let app;
let store;

test('real PostgreSQL foundation integration',async t=>{
  await t.test('migration is atomic, idempotent and rejects altered history',async()=>{
    assert.deepEqual(await applyMigrations(admin),{version:1,applied:true});
    assert.deepEqual(await applyMigrations(admin),{version:1,applied:false});
    await admin.query("UPDATE _platform_migrations SET sha256 = repeat('0',64)");
    await assert.rejects(applyMigrations(admin),/Migration failed/);
    await admin.query('UPDATE _platform_migrations SET sha256 = $1',[read('../../src/platform/persistence/migrations/manifest.json').sha256]);
  });
  app = await openLocalPool({...config,user:'stackpilot_app'});
  store = createStore(app);
  try {
    await t.test('a DDL conflict rolls back the whole migration and its ledger entry',async()=>{
      const failure = await openLocalPool({...config,database:'stackpilot_failure'});
      try {
        await failure.query('CREATE TABLE tasks(marker text)');
        await assert.rejects(applyMigrations(failure),/Migration failed/);
        const state = await failure.query("SELECT to_regclass('public.organizations') AS organizations, to_regclass('public._platform_migrations') AS ledger, to_regclass('public.tasks') AS original");
        assert.deepEqual(state.rows[0],{organizations:null,ledger:null,original:'tasks'});
      } finally {await failure.end();}
    });
    await t.test('Drizzle columns, composite keys and RLS match actual PostgreSQL catalog',async()=>{
      for (const [name,table] of Object.entries(schema)) {
        const drizzle = getTableConfig(table);
        const columns = await admin.query('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position',['public',name]);
        assert.deepEqual(columns.rows.map(row=>row.column_name),drizzle.columns.map(column=>column.name));
        const constraints = await admin.query('SELECT contype FROM pg_constraint WHERE conrelid=$1::regclass',[name]);
        for (const [type,count] of [['p',1],['f',drizzle.foreignKeys.length],['u',drizzle.uniqueConstraints.length],['c',drizzle.checks.length]]) assert.equal(constraints.rows.filter(row=>row.contype===type).length,count,name+' '+type);
        const flags = await admin.query('SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid=$1::regclass',[name]);
        assert.equal(flags.rows[0].relrowsecurity,true);assert.equal(flags.rows[0].relforcerowsecurity,true);
        const indexes = await admin.query('SELECT array_agg(a.attname::text ORDER BY k.ordinality) AS columns FROM pg_index i CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY k(attnum,ordinality) JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum WHERE i.indrelid=$1::regclass GROUP BY i.indexrelid',[name]);
        for (const foreign of drizzle.foreignKeys) {
          const columns = foreign.reference().columns.map(column=>column.name);
          assert.ok(indexes.rows.some(index=>columns.every((name,i)=>index.columns[i]===name)),name+' foreign-key index');
        }
      }
    });
    await t.test('all mutations and audit/outbox events roll back together',async()=>{
      await assert.rejects(store.transaction(context('org-rollback'),async repo=>{
        await repo.identity.createOrganization({name:'Synthetic rollback organization'});
        throw new Error('synthetic rollback');
      }),/Persistence operation failed/);
      const rows = await admin.query("SELECT (SELECT count(*) FROM organizations WHERE id='org-rollback') AS organizations, (SELECT count(*) FROM audit_events WHERE organization_id='org-rollback') AS audits, (SELECT count(*) FROM outbox_events WHERE organization_id='org-rollback') AS outbox");
      assert.deepEqual(rows.rows[0],{organizations:'0',audits:'0',outbox:'0'});
      for (const organizationId of ['org-alpha','org-beta']) await store.transaction(context(organizationId),repo=>repo.identity.createOrganization({name:'Synthetic '+organizationId}));
    });
    await t.test('dry-run and concurrent candidate imports preserve six unapproved stable records',async()=>{
      assert.equal((await importCandidates(app,context('org-alpha'),input,{dryRun:true})).dryRun,true);
      assert.equal((await admin.query('SELECT count(*) FROM products')).rows[0].count,'0');
      const imports = await Promise.all([importCandidates(app,context('org-alpha'),input),importCandidates(app,context('org-alpha'),input)]);
      assert.equal(imports.filter(result=>result.imported).length,1);
      const records = await store.transaction(context('org-alpha'),repo=>repo.evidence.listProducts());
      assert.equal(records.length,6);assert.ok(records.every(row=>row.status==='candidate' && row.affiliateUrl===null));
      const claims = await store.transaction(context('org-alpha'),repo=>repo.evidence.listClaims());
      assert.equal(claims.length,6);assert.ok(claims.every(row=>row.approved===false));
      const changed = structuredClone(input);changed.products[0].description+=' Updated candidate note.';
      await assert.rejects(importCandidates(app,context('org-alpha'),changed),/Persistence operation failed/);
      assert.equal((await admin.query("SELECT count(*) FROM audit_events WHERE action='candidates-imported'")).rows[0].count,'1');
    });
    await t.test('tenant filters, composite foreign keys and connection context prevent cross-organization access',async()=>{
      await store.transaction(context('org-alpha'),repo=>repo.agents.register(createAgentRegistry().get('qa-agent')));
      assert.deepEqual(await store.transaction(context('org-beta'),repo=>repo.evidence.listProducts()),[]);
      assert.equal(await store.transaction(context('org-beta'),repo=>repo.evidence.getProduct('hubspot')),null);
      await assert.rejects(store.transaction(context('org-beta'),repo=>repo.approvals.request({id:'request-cross',agentId:'qa-agent',action:'approve-claim',resourceId:'hubspot',payloadDigest:'a'.repeat(64),evidenceDigest:'b'.repeat(64)})),/Persistence operation failed/);
      assert.equal((await app.query('SELECT count(*) FROM products')).rows[0].count,'0');
      await assert.rejects(app.query("INSERT INTO categories(organization_id,id,slug,name) VALUES ('org-alpha','category-escape','escape','Synthetic')"),error=>error.code==='42501');
      await assert.rejects(openLocalPool({...config,clusterId:'cluster-wrong'}),/verification failed/);
    });
    await t.test('evidence relationships cannot launder another product source inside the same organization',async()=>{
      const wrongSource = await admin.query("SELECT id FROM evidence_sources WHERE organization_id='org-alpha' AND product_id='pipedrive' LIMIT 1");
      await assert.rejects(admin.query("INSERT INTO claim_evidence(organization_id,id,product_id,claim_id,source_id) VALUES ('org-alpha','link-wrong-product','hubspot','hubspot-doc-claim-1',$1)",[wrongSource.rows[0].id]),error=>error.code==='23503');
    });
    await t.test('repositories refuse privileged connections and keep SQL-like research as parameterized data',async()=>{
      await assert.rejects(createStore(admin).transaction(context('org-alpha'),repo=>repo.evidence.listProducts()),/Persistence operation failed/);
      const research = structuredClone(input);
      research.products[0].description = "Synthetic note'); DROP TABLE products; --";
      await importCandidates(app,context('org-beta'),research);
      const records = await store.transaction(context('org-beta'),repo=>repo.evidence.listProducts());
      assert.equal(records.length,6);
      assert.equal(records.find(record=>record.id===research.products[0].id).metadata.description,research.products[0].description);
      assert.equal((await admin.query('SELECT count(*) FROM products')).rows[0].count,'12');
    });
    await t.test('application role cannot approve, alter audit history, activate affiliates or spend',async()=>{
      for (const query of ["UPDATE audit_events SET action='forged'","DELETE FROM audit_events","INSERT INTO approval_decisions(organization_id,id,request_id,decider_user_id,decision,decided_at,request_digest) VALUES ('org-alpha','decision-forged','request-forged','user-forged','approved',now(),repeat('a',64))"]) await assert.rejects(app.query(query),error=>error.code==='42501');
      await assert.rejects(admin.query("UPDATE organizations SET monthly_budget_inr=1 WHERE id='org-alpha'"),error=>error.code==='23514');
      await assert.rejects(admin.query("UPDATE products SET affiliate_url='https://example.com/tracking' WHERE organization_id='org-alpha'"),error=>error.code==='23514');
      await assert.rejects(admin.query("UPDATE product_claims SET status='approved',approved=true WHERE organization_id='org-alpha'"),error=>error.code==='23514');
    });
    await t.test('agent/workflow repositories keep tasks queued and enforce dependency integrity',async()=>{
      await store.transaction(context('org-alpha'),async repo=>{
        await repo.agents.register(createAgentRegistry().get('market-research-agent'));
        await repo.workflows.createDefinition({id:'workflow-alpha',name:'Synthetic research',objective:'Prepare unapproved research'});
        await repo.workflows.createVersion({id:'version-alpha',definitionId:'workflow-alpha',version:1,definition:{tasks:[]}});
        await repo.workflows.createExecution({id:'execution-alpha',versionId:'version-alpha',idempotencyKey:'execution-idem'});
        for (const taskId of ['task-alpha','task-beta']) await repo.workflows.createTask({executionId:'execution-alpha',task:{schemaVersion:1,id:taskId,organizationId:'org-alpha',agentId:'market-research-agent',action:'research-market',resource:{id:'market-alpha',organizationId:'org-alpha',type:'market'},correlationId:'run-alpha',idempotencyKey:taskId,input:{note:'Synthetic only'},costINR:0,limits:{maxConcurrent:1,maxTasks:5,maxAttempts:2,timeoutMs:30000,maxOutputBytes:16384}}});
        await repo.workflows.addDependency({id:'dependency-alpha',executionId:'execution-alpha',taskId:'task-beta',dependsOnTaskId:'task-alpha'});
      });
      await assert.rejects(store.transaction(context('org-alpha'),repo=>repo.workflows.addDependency({id:'dependency-self',executionId:'execution-alpha',taskId:'task-alpha',dependsOnTaskId:'task-alpha'})),/Persistence operation failed/);
      await assert.rejects(store.transaction(context('org-alpha'),repo=>repo.workflows.addDependency({id:'dependency-duplicate',executionId:'execution-alpha',taskId:'task-beta',dependsOnTaskId:'task-alpha'})),/Persistence operation failed/);
      assert.equal((await admin.query("SELECT count(*) FROM tasks WHERE status='QUEUED'")).rows[0].count,'2');
      assert.equal((await admin.query('SELECT count(*) FROM agents WHERE enabled')).rows[0].count,'0');
    });
    await t.test('pg_dump and isolated restore recover candidates, approvals boundary and audit counts',async()=>{
      const bin = process.env.STACKPILOT_PG_BIN;
      const executable = name => join(bin,name+(process.platform==='win32'?'.exe':''));
      const common = ['--host=127.0.0.1','--port='+config.port,'--username=stackpilot_local'];
      execFileSync(executable('pg_dump'),[...common,'--dbname=stackpilot_test','--format=custom','--no-owner','--file='+process.env.STACKPILOT_TEST_BACKUP],{windowsHide:true,stdio:'pipe'});
      execFileSync(executable('pg_restore'),[...common,'--dbname=stackpilot_restore','--exit-on-error','--no-owner',process.env.STACKPILOT_TEST_BACKUP],{windowsHide:true,stdio:'pipe'});
      const restored = await openLocalPool({...config,database:'stackpilot_restore'});
      try {
        for (const table of ['products','product_claims','audit_events','outbox_events']) {
          const before = await admin.query('SELECT count(*) FROM '+table);
          const after = await restored.query('SELECT count(*) FROM '+table);
          assert.deepEqual(after.rows,before.rows);
        }
        assert.equal((await restored.query('SELECT count(*) FROM product_claims WHERE approved')).rows[0].count,'0');
        assert.equal((await restored.query("SELECT count(*) FROM pg_class WHERE relname='audit_events' AND relforcerowsecurity")).rows[0].count,'1');
      } finally {await restored.end();}
    });
    await t.test('concurrent agent configuration updates use version checks and atomic audit history',async()=>{
      const update = () => store.transaction(context('org-alpha'),repo=>repo.agents.configure({id:'qa-agent',expectedVersion:1,patch:{tools:[]}}));
      const results = await Promise.allSettled([update(),update()]);
      assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
      const agents = await store.transaction(context('org-alpha'),repo=>repo.agents.list());
      assert.equal(agents.find(agent=>agent.id==='qa-agent').version,2);
      assert.equal((await admin.query("SELECT count(*) FROM audit_events WHERE action='agent-configured'")).rows[0].count,'1');
      await assert.rejects(store.transaction(context('org-alpha'),repo=>repo.agents.configure({id:'qa-agent',expectedVersion:2,patch:{enabled:true}})),/Persistence operation failed/);
    });
    await t.test('repositories and query builders expire before their pooled connection is released',async()=>{
      let escaped;
      await store.transaction(context('org-alpha'),repo=>{escaped=repo;});
      await assert.rejects(escaped.evidence.listProducts(),/transaction|Persistence/i);
      await store.transaction(context('org-beta'),async repo=>{
        await assert.rejects(escaped.identity.recordUser({id:'user-escaped',displayName:'Synthetic'}),/transaction|Persistence/i);
        assert.equal((await repo.evidence.listProducts()).length,6);
      });
      let query;
      await withTransaction(app,context('org-alpha'),tx=>{query=tx.db.select().from(schema.products);});
      await assert.rejects(query,/query|transaction/i);
      await assert.rejects(store.transaction(context('org-alpha'),repo=>{escaped=repo;throw new Error('Synthetic rollback');}),/Persistence operation failed/);
      await assert.rejects(escaped.evidence.listProducts(),/transaction|Persistence/i);
    });
    await t.test('unawaited mutation cannot escape a transaction or leave partial audit records',async()=>{
      await assert.rejects(store.transaction(context('org-unfinished'),repo=>{
        void repo.identity.createOrganization({name:'Synthetic unfinished organization'});
      }),/Persistence operation failed/);
      const state = await admin.query("SELECT (SELECT count(*) FROM organizations WHERE id='org-unfinished') AS organizations, (SELECT count(*) FROM audit_events WHERE organization_id='org-unfinished') AS audits, (SELECT count(*) FROM outbox_events WHERE organization_id='org-unfinished') AS outbox");
      assert.deepEqual(state.rows[0],{organizations:'0',audits:'0',outbox:'0'});
    });
  } finally {
    await app.end();
    await admin.end();
  }
});
