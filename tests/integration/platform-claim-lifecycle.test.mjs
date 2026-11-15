import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, sign} from 'node:crypto';
import {mkdtempSync, writeFileSync, realpathSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname, basename} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {openLocalPool, openLocalControlPool} from '../../src/platform/persistence/connection.mjs';
import {applyMigrations} from '../../src/platform/persistence/migrate.mjs';
import {createIdentityService} from '../../src/platform/identity/sessions.mjs';
import {createApprovalService} from '../../src/platform/approvals/service.mjs';
import {createClaimLifecycleService} from '../../src/platform/products/claims.mjs';

const config=JSON.parse(process.env.STACKPILOT_TEST_DB??'null');
if(config?.database!=='stackpilot_lifecycle_test') throw new Error('Use disposable lifecycle harness');
const admin=await openLocalPool(config);
const root=realpathSync(mkdtempSync(join(tmpdir(),'stackpilot-lifecycle-')));
const trustPath=join(root,'trust.json');
let pool, identity, lifecycle, approvals, owner, reviewer, foreign;
const expiry=()=>new Date(Date.now()+3600000).toISOString();
const command=(name,to,expectedVersion,patch={})=>({claimId:'claim-'+name,agentId:'qa-agent',idempotencyKey:'transition-'+name+'-'+expectedVersion,to,expectedVersion,...patch});
const counts=async()=>(await admin.query('SELECT (SELECT count(*) FROM claim_lifecycle_events) AS events,(SELECT count(*) FROM evidence_revocations) AS revocations,(SELECT count(*) FROM audit_events) AS audits,(SELECT count(*) FROM outbox_events) AS outbox')).rows[0];
async function fixture(name) {
  await admin.query("INSERT INTO product_claims(organization_id,id,product_id,statement,caveat) VALUES ('org-alpha',$1,'product-test','Synthetic claim','Unverified fixture')",['claim-'+name]);
  await admin.query("INSERT INTO evidence_sources(organization_id,id,product_id,source_url,collected_at,source_digest) VALUES ('org-alpha',$1,'product-test',$2,now()-interval '1 day',repeat('a',64))",['source-'+name,'https://example.com/source/'+name]);
  await admin.query("INSERT INTO claim_evidence(organization_id,id,product_id,claim_id,source_id) VALUES ('org-alpha',$1,'product-test',$2,$3)",['link-'+name,'claim-'+name,'source-'+name]);
}
async function request(name, handle=reviewer, suffix='review') {
  return approvals.createClaimRequest(handle,{requestId:'request-'+name+'-'+suffix,claimId:'claim-'+name,agentId:'qa-agent'});
}
const decide=(captured,decision='approved',handle=owner)=>approvals.decide(handle,{requestId:captured.requestId,requestDigest:captured.requestDigest,expectedVersion:0,decision});
async function reviewCycle(name) {
  await fixture(name);
  await lifecycle.transition(reviewer,command(name,'evidence-collected',0,{expiresAt:expiry()}));
  const captured=await request(name);
  await lifecycle.transition(reviewer,command(name,'needs-review',1,{requestId:captured.requestId}));
  await decide(captured);
  return captured;
}
async function approveCycle(name) {
  const captured=await reviewCycle(name);
  await lifecycle.transition(owner,command(name,'verified',2));
  await lifecycle.transition(owner,command(name,'approved',3));
  return captured;
}

test('authenticated claim lifecycle through signed identities and real restricted PostgreSQL',async t=>{
  try {
    await t.test('explicit migration nine, fresh installation and rollback preserve history and grants',async()=>{
      await applyMigrations(admin,{targetVersion:8});
      assert.deepEqual(await applyMigrations(admin,{targetVersion:9}),{version:9,applied:true});
      assert.deepEqual(await applyMigrations(admin,{targetVersion:9}),{version:9,applied:false});
      const fresh=await openLocalPool({...config,database:'stackpilot_lifecycle_fresh'}), failure=await openLocalPool({...config,database:'stackpilot_lifecycle_failure'});
      try {
        await applyMigrations(fresh,{targetVersion:9});
        await applyMigrations(failure,{targetVersion:8});
        await failure.query('CREATE TABLE evidence_revocations(fixture integer)');
        await assert.rejects(applyMigrations(failure,{targetVersion:9}));
        assert.equal((await failure.query('SELECT max(version) AS version FROM _platform_migrations')).rows[0].version,8);
        assert.equal((await failure.query("SELECT to_regclass('claim_lifecycle_events') AS relation")).rows[0].relation,null);
      } finally {await fresh.end();await failure.end();}
      const cli=spawnSync(process.execPath,[fileURLToPath(new URL('../../scripts/platform-db-migrate.mjs',import.meta.url)),'--apply','--target-version','9'],{encoding:'utf8',windowsHide:true,env:{...process.env,STACKPILOT_LOCAL_DATABASE:JSON.stringify(config)}});
      assert.equal(cli.status,0);
      assert.equal(JSON.parse(cli.stdout).version,9);
      const keys={owner:generateKeyPairSync('ed25519'),reviewer:generateKeyPairSync('ed25519'),foreign:generateKeyPairSync('ed25519')};
      const principals=Object.entries(keys).map(([role,key])=>({keyId:role+'-key',userId:role+'-user',organizationId:role==='foreign'?'org-beta':'org-alpha',role:role==='foreign'?'owner':role,publicKeySpkiBase64:key.publicKey.export({type:'spki',format:'der'}).toString('base64')}));
      writeFileSync(trustPath,JSON.stringify({schemaVersion:1,principals}));
      for(const org of ['org-alpha','org-beta']) {
        await admin.query('INSERT INTO organizations(id,name) VALUES ($1,$1)',[org]);
        await admin.query("INSERT INTO categories(organization_id,id,slug,name) VALUES ($1,'category-test','category-test','Fixture')",[org]);
        await admin.query("INSERT INTO vendors(organization_id,id,name,website) VALUES ($1,'vendor-test','Fixture','https://example.com/')",[org]);
        await admin.query("INSERT INTO products(organization_id,id,category_id,vendor_id,slug,name,website) VALUES ($1,'product-test','category-test','vendor-test','product-test','Fixture','https://example.com/')",[org]);
        await admin.query("INSERT INTO agents(organization_id,id,role,version) VALUES ($1,'qa-agent','qa',1)",[org]);
      }
      for(const principal of principals) await admin.query('INSERT INTO users(organization_id,id,display_name) VALUES ($1,$2,$2)',[principal.organizationId,principal.userId]);
      await admin.query('ALTER ROLE stackpilot_control LOGIN');
      pool=await openLocalControlPool({...config,user:'stackpilot_control'});
      identity=createIdentityService({pool,trustPath,origin:'https://127.0.0.1:55439'});
      async function login(role) {
        const challenge=await identity.createChallenge({keyId:role+'-key'});
        const session=await identity.completeChallenge({keyId:challenge.keyId,challengeId:challenge.challengeId,nonce:challenge.nonce,signature:sign(null,Buffer.from(challenge.message),keys[role].privateKey).toString('base64url')});
        return identity.authenticate({keyId:role+'-key',token:session.token});
      }
      owner=await login('owner');reviewer=await login('reviewer');foreign=await login('foreign');
      lifecycle=createClaimLifecycleService({identity});approvals=createApprovalService({identity});
    });
    await t.test('signed independent owner completes explicit steps with candidate records preserved',async()=>{
      await approveCycle('happy');
      const result=await lifecycle.inspect(reviewer,{claimId:'claim-happy',agentId:'qa-agent'});
      assert.equal(result.effectiveStatus,'approved');assert.equal(result.version,4);
      assert.deepEqual(result.history.map(row=>row.status),['evidence-collected','needs-review','verified','approved']);
      assert.deepEqual((await admin.query("SELECT approved,status FROM product_claims WHERE id='claim-happy'")).rows[0],{approved:false,status:'candidate'});
      assert.equal((await admin.query('SELECT affiliate_url FROM products LIMIT 1')).rows[0].affiliate_url,null);
    });
    await t.test('forged, agent, reviewer and foreign identity cannot approve or revoke evidence',async()=>{
      await reviewCycle('denials');
      for(const handle of [{role:'owner'}, {agentId:'qa-agent'}, reviewer, foreign]) await assert.rejects(lifecycle.transition(handle,command('denials','verified',2)));
      await assert.rejects(lifecycle.inspect(foreign,{claimId:'claim-denials',agentId:'qa-agent'}));
      await assert.rejects(lifecycle.revokeEvidence(reviewer,{sourceId:'source-denials',sourceDigest:'a'.repeat(64),reason:'Fixture'}));
      await assert.rejects(lifecycle.transition(owner,{...command('denials','verified',2),role:'owner'}));
      await assert.rejects(createClaimLifecycleService({identity:{}}).inspect(owner,{claimId:'claim-denials',agentId:'qa-agent'}));
    });
    await t.test('skipped steps, expired collection and completed legacy requests cannot enroll',async()=>{
      await fixture('legacy');
      await assert.rejects(lifecycle.transition(owner,command('legacy','approved',0)));
      await assert.rejects(lifecycle.transition(reviewer,command('legacy','evidence-collected',0,{expiresAt:'2020-01-01T00:00:00.000Z'})));
      const captured=await request('legacy');await decide(captured);
      await lifecycle.transition(reviewer,command('legacy','evidence-collected',0,{expiresAt:expiry()}));
      await assert.rejects(lifecycle.transition(reviewer,command('legacy','needs-review',1,{requestId:captured.requestId})));
      const self=await request('legacy',owner,'self');
      await assert.rejects(lifecycle.transition(reviewer,command('legacy','needs-review',1,{requestId:self.requestId})));
      await assert.rejects(decide(self));
    });
    await t.test('concurrent keys and caller mutation preserve optimistic versions and exact retries',async()=>{
      await fixture('concurrent');
      const input=command('concurrent','evidence-collected',0,{expiresAt:expiry()});
      const pending=lifecycle.transition(reviewer,input);input.claimId='claim-denials';
      const first=await pending;
      const replay=await lifecycle.transition(reviewer,{...input,claimId:'claim-concurrent'});
      assert.equal(first.id,replay.id);assert.equal(replay.replayed,true);
      await assert.rejects(lifecycle.transition(reviewer,{...input,claimId:'claim-concurrent',expiresAt:new Date(Date.now()+7200000).toISOString()}));
      const captured=await request('concurrent');
      const racing=await Promise.allSettled([lifecycle.transition(reviewer,command('concurrent','needs-review',1,{requestId:captured.requestId})),lifecycle.transition(reviewer,command('concurrent','needs-review',1,{idempotencyKey:'other-concurrent-key',requestId:captured.requestId}))]);
      assert.equal(racing.filter(row=>row.status==='fulfilled').length,1);
      await assert.rejects(lifecycle.transition(reviewer,{...input,claimId:'claim-concurrent'}));
    });
    await t.test('claim version, statement, source digest and added evidence invalidate current review binding',async()=>{
      await approveCycle('drift');
      const modifications=[
        ["UPDATE product_claims SET version=2 WHERE id='claim-drift'","UPDATE product_claims SET version=1 WHERE id='claim-drift'"],
        ["UPDATE product_claims SET statement='Changed fixture' WHERE id='claim-drift'","UPDATE product_claims SET statement='Synthetic claim' WHERE id='claim-drift'"],
        ["UPDATE evidence_sources SET source_digest=repeat('b',64) WHERE id='source-drift'","UPDATE evidence_sources SET source_digest=repeat('a',64) WHERE id='source-drift'"],
      ];
      for(const [change,restore] of modifications) {
        await admin.query(change);
        try {assert.equal((await lifecycle.inspect(owner,{claimId:'claim-drift',agentId:'qa-agent'})).effectiveStatus,'reverification-required');}
        finally {await admin.query(restore);}
      }
      await admin.query("INSERT INTO claim_evidence(organization_id,id,product_id,claim_id,source_id) VALUES ('org-alpha','extra-drift-link','product-test','claim-drift','source-happy')");
      assert.equal((await lifecycle.inspect(owner,{claimId:'claim-drift',agentId:'qa-agent'})).effectiveStatus,'reverification-required');
    });
    await t.test('approval revocation invalidates immediately and the consumed request cannot approve a new cycle',async()=>{
      const captured=await approveCycle('revoked');
      await approvals.revoke(owner,{requestId:captured.requestId,requestDigest:captured.requestDigest,expectedVersion:1});
      assert.equal((await lifecycle.inspect(reviewer,{claimId:'claim-revoked',agentId:'qa-agent'})).effectiveStatus,'reverification-required');
      await lifecycle.transition(reviewer,command('revoked','reverification-required',4));
      await lifecycle.transition(reviewer,command('revoked','evidence-collected',5,{expiresAt:expiry()}));
      await assert.rejects(lifecycle.transition(reviewer,command('revoked','needs-review',6,{requestId:captured.requestId})));
      const fresh=await request('revoked',reviewer,'fresh');
      await lifecycle.transition(reviewer,command('revoked','needs-review',6,{requestId:fresh.requestId}));
      await decide(fresh);await lifecycle.transition(owner,command('revoked','verified',7));
    });
    await t.test('a still-pending request consumed by an invalidated cycle cannot be reattached',async()=>{
      await fixture('pending-reuse');
      await lifecycle.transition(reviewer,command('pending-reuse','evidence-collected',0,{expiresAt:expiry()}));
      const captured=await request('pending-reuse');
      await lifecycle.transition(reviewer,command('pending-reuse','needs-review',1,{requestId:captured.requestId}));
      await admin.query("UPDATE product_claims SET statement='Changed fixture' WHERE id='claim-pending-reuse'");
      await lifecycle.transition(reviewer,command('pending-reuse','reverification-required',2));
      await admin.query("UPDATE product_claims SET statement='Synthetic claim' WHERE id='claim-pending-reuse'");
      await lifecycle.transition(reviewer,command('pending-reuse','evidence-collected',3,{expiresAt:expiry()}));
      const before=await counts();
      await assert.rejects(lifecycle.transition(reviewer,command('pending-reuse','needs-review',4,{requestId:captured.requestId})));
      assert.deepEqual(await counts(),before);
    });
    await t.test('expiry marks stale and evidence revocation is owner-only, immutable and tenant-bound',async()=>{
      await approveCycle('expired');
      await admin.query("UPDATE claim_lifecycle_events SET valid_until=clock_timestamp()-interval '1 second' WHERE claim_id='claim-expired'");
      assert.equal((await lifecycle.inspect(owner,{claimId:'claim-expired',agentId:'qa-agent'})).effectiveStatus,'stale');
      await lifecycle.transition(reviewer,command('expired','stale',4));
      await approveCycle('source-revoked');
      const revoke={sourceId:'source-source-revoked',sourceDigest:'a'.repeat(64),reason:'Synthetic evidence withdrawn'};
      await assert.rejects(lifecycle.revokeEvidence(foreign,revoke));
      await assert.rejects(lifecycle.revokeEvidence(owner,{...revoke,sourceDigest:'b'.repeat(64)}));
      const first=await lifecycle.revokeEvidence(owner,revoke), second=await lifecycle.revokeEvidence(owner,revoke);
      assert.equal(first.id,second.id);
      await assert.rejects(lifecycle.revokeEvidence(owner,{...revoke,reason:'Changed reason'}));
      assert.equal((await lifecycle.inspect(reviewer,{claimId:'claim-source-revoked',agentId:'qa-agent'})).effectiveStatus,'reverification-required');
      await lifecycle.transition(reviewer,command('source-revoked','reverification-required',4));
      await assert.rejects(lifecycle.transition(reviewer,command('source-revoked','evidence-collected',5,{expiresAt:expiry()})));
    });
    await t.test('rejection needs an independent rejected decision and publication remains unavailable',async()=>{
      await fixture('rejected');await lifecycle.transition(reviewer,command('rejected','evidence-collected',0,{expiresAt:expiry()}));
      const captured=await request('rejected');await lifecycle.transition(reviewer,command('rejected','needs-review',1,{requestId:captured.requestId}));
      await decide(captured,'rejected');
      await lifecycle.transition(owner,command('rejected','rejected',2));
      await assert.rejects(lifecycle.transition(owner,command('rejected','verified',3)));
      await assert.rejects(lifecycle.transition(owner,command('happy','published',4)));
    });
    await t.test('cross-service decision and revocation races always finish with coherent effective status',async()=>{
      await fixture('enroll-race');
      await lifecycle.transition(reviewer,command('enroll-race','evidence-collected',0,{expiresAt:expiry()}));
      const enrolling=await request('enroll-race');
      const enrollment=await Promise.allSettled([lifecycle.transition(reviewer,command('enroll-race','needs-review',1,{requestId:enrolling.requestId})),decide(enrolling)]);
      assert.equal(enrollment[1].status,'fulfilled');
      const enrolled=await lifecycle.inspect(owner,{claimId:'claim-enroll-race',agentId:'qa-agent'});
      assert.equal(enrolled.recordedStatus,enrollment[0].status==='fulfilled'?'needs-review':'evidence-collected');
      const revoking=await reviewCycle('approval-race');
      await lifecycle.transition(owner,command('approval-race','verified',2));
      const revocation=await Promise.allSettled([lifecycle.transition(owner,command('approval-race','approved',3)),approvals.revoke(owner,{requestId:revoking.requestId,requestDigest:revoking.requestDigest,expectedVersion:1})]);
      assert.equal(revocation[1].status,'fulfilled');
      assert.equal((await lifecycle.inspect(reviewer,{claimId:'claim-approval-race',agentId:'qa-agent'})).effectiveStatus,'reverification-required');
      await fixture('source-race');
      const withdrawal=await Promise.allSettled([lifecycle.transition(reviewer,command('source-race','evidence-collected',0,{expiresAt:expiry()})),lifecycle.revokeEvidence(owner,{sourceId:'source-source-race',sourceDigest:'a'.repeat(64),reason:'Synthetic concurrent withdrawal'})]);
      assert.equal(withdrawal[1].status,'fulfilled');
      assert.equal((await lifecycle.inspect(reviewer,{claimId:'claim-source-race',agentId:'qa-agent'})).effectiveStatus,'reverification-required');
    });
    await t.test('real outbox failure rolls event/audit back and exact retry succeeds',async()=>{
      await fixture('rollback');const before=await counts();
      const input=command('rollback','evidence-collected',0,{expiresAt:expiry()});
      await admin.query("CREATE FUNCTION fixture_lifecycle_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='claim-lifecycle-transitioned' THEN RAISE EXCEPTION 'fixture'; END IF; RETURN NEW; END $$; CREATE TRIGGER fixture_lifecycle_failure BEFORE INSERT ON outbox_events FOR EACH ROW EXECUTE FUNCTION fixture_lifecycle_failure()");
      try {await assert.rejects(lifecycle.transition(reviewer,input));assert.deepEqual(await counts(),before);}
      finally {await admin.query('DROP TRIGGER fixture_lifecycle_failure ON outbox_events; DROP FUNCTION fixture_lifecycle_failure()');}
      assert.equal((await lifecycle.transition(reviewer,input)).version,1);
    });
    await t.test('application role and direct control SQL cannot mutate history or bypass tenant policy',async()=>{
      const app=await openLocalPool({...config,user:'stackpilot_app'});
      try {await assert.rejects(app.query('SELECT * FROM claim_lifecycle_events'));await assert.rejects(app.query('INSERT INTO evidence_revocations(id) VALUES ($1)',['forged']));}
      finally {await app.end();}
      await assert.rejects(pool.query('UPDATE claim_lifecycle_events SET status=status'));
      await assert.rejects(pool.query('DELETE FROM evidence_revocations'));
      assert.equal((await pool.query('SELECT count(*) FROM claim_lifecycle_events')).rows[0].count,'0');
      assert.equal((await lifecycle.inspect(reviewer,{claimId:'claim-happy',agentId:'qa-agent'})).history.length,4);
    });
  } finally {
    if(pool) await pool.end();
    await admin.query('ALTER ROLE stackpilot_control NOLOGIN');await admin.end();
    const target=realpathSync(root);
    if(dirname(target)!==realpathSync(tmpdir())||!basename(target).startsWith('stackpilot-lifecycle-')) throw new Error('Unsafe fixture cleanup');
    rmSync(target,{recursive:true,force:true});
  }
});
