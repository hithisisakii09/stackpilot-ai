import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {mkdtempSync,writeFileSync,realpathSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,basename} from 'node:path';
import {openLocalPool,openLocalControlPool} from '../../src/platform/persistence/connection.mjs';
import {applyMigrations} from '../../src/platform/persistence/migrate.mjs';
import {createIdentityService} from '../../src/platform/identity/sessions.mjs';
import {createApprovalService} from '../../src/platform/approvals/service.mjs';
import {getTableConfig} from 'drizzle-orm/pg-core';
import {approvalSchema} from '../../src/platform/persistence/approval-schema.mjs';

const config=JSON.parse(process.env.STACKPILOT_TEST_DB??'null');
if(config?.database!=='stackpilot_approval_test') throw new Error('Use the disposable test harness');
const admin=await openLocalPool(config);
const root=realpathSync(mkdtempSync(join(tmpdir(),'stackpilot-approval-')));
const trustPath=join(root,'trust.json');
let pool;
test('independent approval service through signed identities and real restricted PostgreSQL',async t=>{
 try {
  await applyMigrations(admin,{targetVersion:2});
  assert.deepEqual(await applyMigrations(admin,{targetVersion:3}),{version:3,applied:true});
  assert.deepEqual(await applyMigrations(admin,{targetVersion:3}),{version:3,applied:false});
  await assert.rejects(applyMigrations(admin,{targetVersion:2}),/Migration failed/);
  await t.test('fresh version 3 and failed version-3 DDL retain atomic ordered history',async()=>{
   const fresh=await openLocalPool({...config,database:'stackpilot_approval_fresh'});
   const failure=await openLocalPool({...config,database:'stackpilot_approval_failure'});
   try {
    assert.deepEqual(await applyMigrations(fresh,{targetVersion:3}),{version:3,applied:true});
    await applyMigrations(failure,{targetVersion:2});
    await failure.query('ALTER TABLE product_claims ADD COLUMN version text');
    await assert.rejects(applyMigrations(failure,{targetVersion:3}),/Migration failed/);
    assert.equal((await failure.query('SELECT max(version) AS version FROM _platform_migrations')).rows[0].version,2);
    assert.equal((await failure.query("SELECT has_table_privilege('stackpilot_control','product_claims','SELECT') AS allowed")).rows[0].allowed,false);
   } finally {await fresh.end();await failure.end();}
  });
  const keys={owner:generateKeyPairSync('ed25519'),reviewer:generateKeyPairSync('ed25519'),foreign:generateKeyPairSync('ed25519')};
  const principals=Object.entries(keys).map(([role,key])=>({keyId:role+'-key',userId:role+'-user',organizationId:role==='foreign'?'org-beta':'org-alpha',role:role==='foreign'?'owner':role,publicKeySpkiBase64:key.publicKey.export({type:'spki',format:'der'}).toString('base64')}));
  writeFileSync(trustPath,JSON.stringify({schemaVersion:1,principals}));
  for(const org of ['org-alpha','org-beta']) {
   await admin.query('INSERT INTO organizations(id,name) VALUES ($1,$2)',[org,'Synthetic review organization']);
   await admin.query("INSERT INTO categories(organization_id,id,slug,name) VALUES ($1,'category-test','category-test','Synthetic category')",[org]);
   await admin.query("INSERT INTO vendors(organization_id,id,name,website) VALUES ($1,'vendor-test','Synthetic vendor','https://example.com/')",[org]);
   await admin.query("INSERT INTO products(organization_id,id,category_id,vendor_id,slug,name,website) VALUES ($1,'product-test','category-test','vendor-test','product-test','Synthetic product','https://example.com/')",[org]);
   await admin.query("INSERT INTO agents(organization_id,id,role,version) VALUES ($1,'qa-agent','qa',1)",[org]);
   await admin.query("INSERT INTO product_claims(organization_id,id,product_id,statement,caveat) VALUES ($1,'claim-alpha','product-test','Synthetic claim for independent review','Unverified synthetic evidence')",[org]);
   await admin.query("INSERT INTO evidence_sources(organization_id,id,product_id,source_url,collected_at,source_digest) VALUES ($1,'source-alpha','product-test','https://example.com/source',now()-interval '1 day',$2)",[org,'a'.repeat(64)]);
   await admin.query("INSERT INTO claim_evidence(organization_id,id,product_id,claim_id,source_id) VALUES ($1,'link-alpha','product-test','claim-alpha','source-alpha')",[org]);
  }
  for(const principal of principals) await admin.query("INSERT INTO users(organization_id,id,display_name) VALUES ($1,$2,'Synthetic user')",[principal.organizationId,principal.userId]);
  await admin.query('ALTER ROLE stackpilot_control LOGIN');
  pool=await openLocalControlPool({...config,user:'stackpilot_control'});
  const identity=createIdentityService({pool,trustPath,origin:'https://127.0.0.1:55439'});
  async function login(role) {
   const challenge=await identity.createChallenge({keyId:role+'-key'});
   const session=await identity.completeChallenge({keyId:challenge.keyId,challengeId:challenge.challengeId,nonce:challenge.nonce,signature:sign(null,Buffer.from(challenge.message),keys[role].privateKey).toString('base64url')});
   return {handle:await identity.authenticate({keyId:role+'-key',token:session.token}),session,keyId:role+'-key'};
  }
  const ownerLogin=await login('owner'),reviewerLogin=await login('reviewer'),foreignLogin=await login('foreign');
  const owner=ownerLogin.handle,reviewer=reviewerLogin.handle,foreign=foreignLogin.handle;
  const approvals=createApprovalService({identity});
  const denied=work=>assert.rejects(work,error=>error.message==='Approval operation failed'&&!error.cause);
  const capture=(requestId,handle=reviewer)=>approvals.createClaimRequest(handle,{requestId,agentId:'qa-agent',claimId:'claim-alpha'});
  const decide=(captured,decision='approved',handle=owner)=>approvals.decide(handle,{requestId:captured.requestId,requestDigest:captured.requestDigest,expectedVersion:captured.expectedVersion,decision});
  await t.test('forged owner profiles cannot read or decide',async()=>{
   await assert.rejects(approvals.listPending({role:'owner'}),/Approval operation failed/);
  });
  await t.test('real versioned claim schema and migration grants preserve application denial',async()=>{
   const columns=(await admin.query("SELECT column_name FROM information_schema.columns WHERE table_name='product_claims' ORDER BY ordinal_position")).rows.map(row=>row.column_name);
   assert.deepEqual(columns,getTableConfig(approvalSchema.product_claims).columns.map(column=>column.name));
   const app=await openLocalPool({...config,user:'stackpilot_app'});
   try {await assert.rejects(app.query("INSERT INTO approval_decisions(organization_id,id) VALUES ('org-alpha','forged')"),error=>error.code==='42501');}
   finally {await app.end();}
   await assert.rejects(admin.query("UPDATE product_claims SET approved=true"),error=>error.code==='23514');
  });
  await t.test('independent signed owner approves and revokes while history remains immutable',async()=>{
   const captured=await capture('request-alpha');
   assert.equal((await approvals.listPending(owner)).length,1);
   assert.equal((await decide(captured)).version,1);
   assert.equal((await approvals.listPending(owner)).length,0);
   await denied(()=>decide(captured));
   const revoked=await approvals.revoke(owner,{requestId:captured.requestId,requestDigest:captured.requestDigest,expectedVersion:1});
   assert.equal(revoked.version,2);
   assert.deepEqual((await approvals.history(owner,{requestId:captured.requestId})).map(row=>row.decision),['approved','revoked']);
   await denied(()=>approvals.revoke(owner,{requestId:captured.requestId,requestDigest:captured.requestDigest,expectedVersion:2}));
   const stored=(await admin.query("SELECT approved,status FROM product_claims WHERE organization_id='org-alpha'")).rows[0];
   assert.deepEqual(stored,{approved:false,status:'candidate'});
  });
  await t.test('reviewers, self approval, forged identities and cross-tenant requests are denied',async()=>{
   const captured=await capture('request-denials');
   await denied(()=>decide(captured,'approved',reviewer));
   await denied(()=>decide(captured,'approved',foreign));
   await denied(()=>approvals.history(foreign,{requestId:captured.requestId}));
   assert.equal((await approvals.listPending(foreign)).length,0);
   const self=await capture('request-self',owner);
   await denied(()=>decide(self));
   await denied(()=>createApprovalService({identity:{withAuthenticatedTransaction:async()=>({role:'owner'})}}).listPending(owner));
   await denied(()=>approvals.decide(owner,{requestId:captured.requestId,decision:'approved',expectedVersion:0,requestDigest:captured.requestDigest,organizationId:'org-alpha',role:'owner'}));
  });
  await t.test('owner can revoke prior approval after resource and evidence changes',async()=>{
   const captured=await capture('request-stale-revocation');
   await decide(captured);
   try {
    await admin.query("UPDATE product_claims SET version=2 WHERE organization_id='org-alpha'");
    await admin.query("UPDATE evidence_sources SET source_digest=$1 WHERE organization_id='org-alpha'",['b'.repeat(64)]);
    const result=await approvals.revoke(owner,{requestId:captured.requestId,requestDigest:captured.requestDigest,expectedVersion:1});
    assert.equal(result.decision,'revoked');
   } finally {
    await admin.query("UPDATE product_claims SET version=1 WHERE organization_id='org-alpha'");
    await admin.query("UPDATE evidence_sources SET source_digest=$1 WHERE organization_id='org-alpha'",['a'.repeat(64)]);
   }
  });
  await t.test('rejection is terminal and duplicate conflicting decisions serialize',async()=>{
   const rejected=await capture('request-rejected');
   assert.equal((await decide(rejected,'rejected')).decision,'rejected');
   await denied(()=>approvals.revoke(owner,{requestId:rejected.requestId,requestDigest:rejected.requestDigest,expectedVersion:1}));
   const raced=await capture('request-raced');
   const results=await Promise.allSettled([decide(raced),decide(raced,'rejected')]);
   assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
   assert.equal((await approvals.history(owner,{requestId:raced.requestId})).length,1);
  });
  await t.test('stale resource version, payload, evidence, policy and submitted digest fail closed',async()=>{
   const versioned=await capture('request-stale-version');
   await admin.query("UPDATE product_claims SET version=2 WHERE organization_id='org-alpha'");
   await denied(()=>decide(versioned));
   await admin.query("UPDATE product_claims SET version=1 WHERE organization_id='org-alpha'");
   const payload=await capture('request-stale-payload');
   await admin.query("UPDATE product_claims SET statement='Changed synthetic claim' WHERE organization_id='org-alpha'");
   await denied(()=>decide(payload));
   await admin.query("UPDATE product_claims SET statement='Synthetic claim for independent review' WHERE organization_id='org-alpha'");
   const evidence=await capture('request-stale-evidence');
   await admin.query("UPDATE evidence_sources SET source_digest=$1 WHERE organization_id='org-alpha'",['b'.repeat(64)]);
   await denied(()=>decide(evidence));
   await admin.query("UPDATE evidence_sources SET source_digest=$1 WHERE organization_id='org-alpha'",['a'.repeat(64)]);
   const stalePolicy=await capture('request-stale-policy');
   await admin.query('UPDATE approval_request_bindings SET policy_version=2 WHERE request_id=$1',[stalePolicy.requestId]);
   await denied(()=>decide(stalePolicy));
   const wrong=await capture('request-wrong-digest');
   await denied(()=>decide({...wrong,requestDigest:'0'.repeat(64)}));
   await denied(()=>decide({...wrong,expectedVersion:1}));
  });
  await t.test('legacy, unsupported and protected actions cannot be decided',async()=>{
   await admin.query("INSERT INTO approval_requests(organization_id,id,agent_id,action,resource_id,payload_digest,evidence_digest) VALUES ('org-alpha','request-legacy','qa-agent','approve-claim','claim-alpha',$1,$1)",['a'.repeat(64)]);
   await denied(()=>decide({requestId:'request-legacy',requestDigest:'a'.repeat(64),expectedVersion:0}));
   for(const action of ['spend-money','publish-content','activate-affiliate','decide-approval','unknown-action']) {
    const protectedRequest=await capture('request-'+action);
    await admin.query('UPDATE approval_requests SET action=$1 WHERE id=$2',[action,protectedRequest.requestId]);
    await denied(()=>decide(protectedRequest));
   }
   await denied(()=>approvals.createClaimRequest(reviewer,{requestId:'request-extra',agentId:'qa-agent',claimId:'claim-alpha',action:'publish-content'}));
   const pending=await approvals.listPending(owner);
   assert.equal(pending.some(row=>row.requestId==='request-legacy'||row.action!=='approve-claim'||row.requestDigest===null),false);
  });
  await t.test('audit/outbox failure rolls decision back and leaves history unaltered',async()=>{
   const captured=await capture('request-rollback');
   await admin.query('REVOKE INSERT ON outbox_events FROM stackpilot_control');
   try {await denied(()=>decide(captured));}
   finally {await admin.query('GRANT INSERT ON outbox_events TO stackpilot_control');}
   assert.equal((await approvals.history(owner,{requestId:captured.requestId})).length,0);
   const audits=(await admin.query("SELECT count(*) FROM audit_events WHERE action='approval-decision-approved'")).rows[0].count;
   await decide(captured);
   assert.equal(Number((await admin.query("SELECT count(*) FROM audit_events WHERE action='approval-decision-approved'")).rows[0].count),Number(audits)+1);
   await assert.rejects(pool.query('UPDATE approval_decisions SET version=99'),error=>error.code==='42501');
  });
  await t.test('expired, revoked and trust-downgraded owner sessions cannot decide',async()=>{
   const captured=await capture('request-session-denial');
   const revoked=await login('owner');
   await identity.logout({keyId:revoked.keyId,token:revoked.session.token});
   await denied(()=>decide(captured,'approved',revoked.handle));
   const expired=await login('owner');
   await admin.query("UPDATE auth_sessions SET created_at=now()-interval '30 minutes',expires_at=now()-interval '15 minutes' WHERE id=(SELECT id FROM auth_sessions WHERE organization_id='org-alpha' ORDER BY created_at DESC LIMIT 1)");
   await denied(()=>decide(captured,'approved',expired.handle));
   writeFileSync(trustPath,JSON.stringify({schemaVersion:1,principals:principals.map(principal=>principal.organizationId==='org-alpha'?{...principal,role:principal.role==='owner'?'reviewer':'owner'}:principal)}));
   await denied(()=>decide(captured));
   writeFileSync(trustPath,JSON.stringify({schemaVersion:1,principals}));
  });
  await t.test('trust change while waiting to decide rolls back all decision writes',async()=>{
   const captured=await capture('request-trust-race');
   const lock=await admin.connect();
   try {
    await lock.query('BEGIN');
    await lock.query("SELECT pg_advisory_xact_lock(hashtext('org-alpha'),hashtext($1))",[captured.requestId]);
    const pending=denied(()=>decide(captured));
    let waiting=false;
    for(let attempt=0;attempt<50;attempt++) {
     const state=await admin.query("SELECT count(*) FROM pg_locks l JOIN pg_stat_activity a ON a.pid=l.pid WHERE a.datname=current_database() AND l.locktype='advisory' AND NOT l.granted");
     if(Number(state.rows[0].count)>0) {waiting=true;break;}
     await new Promise(resolve=>setTimeout(resolve,20));
    }
    assert.equal(waiting,true);
    writeFileSync(trustPath,JSON.stringify({schemaVersion:1,principals:principals.map(principal=>principal.organizationId==='org-alpha'?{...principal,role:principal.role==='owner'?'reviewer':'owner'}:principal)}));
    await lock.query('COMMIT');
    await pending;
   } finally {
    await lock.query('ROLLBACK');
    lock.release();
    writeFileSync(trustPath,JSON.stringify({schemaVersion:1,principals}));
   }
   assert.equal((await approvals.history(owner,{requestId:captured.requestId})).length,0);
  });
 } finally {
  if(pool) await pool.end();
  await admin.query('ALTER ROLE stackpilot_control NOLOGIN');
  await admin.end();
  const target=realpathSync(root);
  if(dirname(target)!==realpathSync(tmpdir())||!basename(target).startsWith('stackpilot-approval-')) throw new Error('Unsafe fixture cleanup');
  rmSync(target,{recursive:true,force:true});
 }
});
