import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {mkdtempSync,writeFileSync,realpathSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,basename} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {openLocalPool,openLocalControlPool} from '../../src/platform/persistence/connection.mjs';
import {applyMigrations} from '../../src/platform/persistence/migrate.mjs';
import {createIdentityService} from '../../src/platform/identity/sessions.mjs';
import {createApprovalService} from '../../src/platform/approvals/service.mjs';
import {createClaimLifecycleService} from '../../src/platform/products/claims.mjs';
import {createPricingHistoryService,pricingClaimStatement} from '../../src/platform/products/pricing-history.mjs';
import {createProductProjectionService} from '../../src/platform/products/projection.mjs';

const config=JSON.parse(process.env.STACKPILOT_TEST_DB??'null');
if(config?.database!=='stackpilot_pricing_test') throw new Error('Use disposable pricing harness');
const admin=await openLocalPool(config),root=realpathSync(mkdtempSync(join(tmpdir(),'stackpilot-pricing-'))),trustPath=join(root,'trust.json');
const baseTime=Date.now();
let pool,identity,owner,reviewer,foreign,pricing,projection,lifecycle,approvals;
const observation=(name,patch={})=>({id:'price-'+name,productId:'product-'+name,claimId:'claim-'+name,agentId:'qa-agent',sourceId:'source-'+name,sourceUrl:'https://example.com/pricing/'+name,sourceDigest:'a'.repeat(64),observedAt:new Date(baseTime-60000).toISOString(),collectedAt:new Date(baseTime-1000).toISOString(),expiresAt:new Date(baseTime+3600000).toISOString(),plan:'Professional',region:'IN',currency:'INR',amountMinor:10000,billingPeriod:'month',unit:'seat',taxTreatment:'excluded',manualReference:'synthetic-only',...patch});
const read=record=>projection.read(reviewer,{productId:record.productId,agentId:record.agentId});
async function seed(record,statement=pricingClaimStatement(record)) {
  await admin.query("INSERT INTO products(organization_id,id,category_id,vendor_id,slug,name,website) VALUES ('org-alpha',$1,'category-test','vendor-test',$1,'Fixture','https://example.com/') ON CONFLICT DO NOTHING",[record.productId]);
  await admin.query("INSERT INTO product_claims(organization_id,id,product_id,statement,caveat) VALUES ('org-alpha',$1,$2,$3,'Unreviewed synthetic observation')",[record.claimId,record.productId,statement]);
  await admin.query("INSERT INTO evidence_sources(organization_id,id,product_id,source_url,collected_at,source_digest) VALUES ('org-alpha',$1,$2,$3,$4,$5)",[record.sourceId,record.productId,record.sourceUrl,record.collectedAt,record.sourceDigest]);
  await admin.query("INSERT INTO claim_evidence(organization_id,id,product_id,claim_id,source_id) VALUES ('org-alpha',$1,$2,$3,$4)",['link-'+record.id,record.productId,record.claimId,record.sourceId]);
}
async function approve(record,suffix='initial',version=0) {
  const command=(to,expectedVersion,extra={})=>({claimId:record.claimId,agentId:record.agentId,to,expectedVersion,idempotencyKey:record.id+'-'+suffix+'-'+expectedVersion,...extra});
  await lifecycle.transition(reviewer,command('evidence-collected',version,{expiresAt:new Date(Date.now()+3600000).toISOString()}));
  const request=await approvals.createClaimRequest(reviewer,{requestId:record.id+'-'+suffix+'-review',claimId:record.claimId,agentId:record.agentId});
  await lifecycle.transition(reviewer,command('needs-review',version+1,{requestId:request.requestId}));
  await approvals.decide(owner,{requestId:request.requestId,requestDigest:request.requestDigest,expectedVersion:0,decision:'approved'});
  await lifecycle.transition(owner,command('verified',version+2));
  await lifecycle.transition(owner,command('approved',version+3));
  return request;
}
const counts=async()=>(await admin.query('SELECT (SELECT count(*) FROM pricing_observations) AS prices,(SELECT count(*) FROM audit_events) AS audits,(SELECT count(*) FROM outbox_events) AS outbox,(SELECT count(*) FROM claim_lifecycle_events) AS lifecycle')).rows[0];

test('authenticated pricing history and live evidence-bound internal projections',async t=>{
  try {
    await t.test('migration ten upgrades, fresh installs, DDL rollback and explicit CLI preserve narrow grants',async()=>{
      await applyMigrations(admin,{targetVersion:9});
      assert.deepEqual(await applyMigrations(admin,{targetVersion:10}),{version:10,applied:true});
      assert.deepEqual(await applyMigrations(admin,{targetVersion:10}),{version:10,applied:false});
      const fresh=await openLocalPool({...config,database:'stackpilot_pricing_fresh'}),failure=await openLocalPool({...config,database:'stackpilot_pricing_failure'});
      try {
        await applyMigrations(fresh,{targetVersion:10});await applyMigrations(failure,{targetVersion:9});
        await failure.query('CREATE TABLE pricing_observations(fixture integer)');
        await assert.rejects(applyMigrations(failure,{targetVersion:10}));
        assert.equal((await failure.query('SELECT max(version) AS version FROM _platform_migrations')).rows[0].version,9);
      } finally {await fresh.end();await failure.end();}
      const cli=spawnSync(process.execPath,[fileURLToPath(new URL('../../scripts/platform-db-migrate.mjs',import.meta.url)),'--apply','--target-version','10'],{encoding:'utf8',windowsHide:true,env:{...process.env,STACKPILOT_LOCAL_DATABASE:JSON.stringify(config)}});
      assert.equal(cli.status,0);
      const keys={owner:generateKeyPairSync('ed25519'),reviewer:generateKeyPairSync('ed25519'),foreign:generateKeyPairSync('ed25519')};
      const principals=Object.entries(keys).map(([role,key])=>({keyId:role+'-key',userId:role+'-user',organizationId:role==='foreign'?'org-beta':'org-alpha',role:role==='foreign'?'owner':role,publicKeySpkiBase64:key.publicKey.export({type:'spki',format:'der'}).toString('base64')}));
      writeFileSync(trustPath,JSON.stringify({schemaVersion:1,principals}));
      for(const org of ['org-alpha','org-beta']) {
        await admin.query('INSERT INTO organizations(id,name) VALUES ($1,$1)',[org]);
        await admin.query("INSERT INTO categories(organization_id,id,slug,name) VALUES ($1,'category-test','category-test','Fixture')",[org]);
        await admin.query("INSERT INTO vendors(organization_id,id,name,website) VALUES ($1,'vendor-test','Fixture','https://example.com/')",[org]);
        await admin.query("INSERT INTO agents(organization_id,id,role,version) VALUES ($1,'qa-agent','qa',1)",[org]);
      }
      for(const principal of principals) await admin.query('INSERT INTO users(organization_id,id,display_name) VALUES ($1,$2,$2)',[principal.organizationId,principal.userId]);
      await admin.query("ALTER DATABASE stackpilot_pricing_test SET timezone='Asia/Kolkata'");
      await admin.query('ALTER ROLE stackpilot_control LOGIN');pool=await openLocalControlPool({...config,user:'stackpilot_control'});
      identity=createIdentityService({pool,trustPath,origin:'https://127.0.0.1:55439'});
      async function login(role) {
        const challenge=await identity.createChallenge({keyId:role+'-key'});
        const session=await identity.completeChallenge({keyId:challenge.keyId,challengeId:challenge.challengeId,nonce:challenge.nonce,signature:sign(null,Buffer.from(challenge.message),keys[role].privateKey).toString('base64url')});
        return identity.authenticate({keyId:role+'-key',token:session.token});
      }
      owner=await login('owner');reviewer=await login('reviewer');foreign=await login('foreign');
      pricing=createPricingHistoryService({identity});projection=createProductProjectionService({identity});lifecycle=createClaimLifecycleService({identity});approvals=createApprovalService({identity});
    });
    await t.test('manual history is candidate and exact concurrent retries create one immutable record',async()=>{
      const record=observation('initial');await seed(record);
      const input={...record},pending=pricing.record(reviewer,input);input.amountMinor=999;
      await pending;
      const result=await Promise.all([pricing.record(reviewer,record),pricing.record(reviewer,record)]);
      assert.ok(result.every(row=>row.replayed));
      assert.equal((await pricing.history(reviewer,{productId:record.productId}))[0].amountMinor,10000);
      await assert.rejects(pricing.record(reviewer,{...record,amountMinor:20000}));
      const projected=await read(record);assert.deepEqual(projected.claims,[]);assert.equal(projected.pricing[0].status,'UNKNOWN');
    });
    await t.test('unrelated approved claims and mismatched source/product/digest bindings cannot authorize prices',async()=>{
      const record=observation('unrelated');await seed(record,'Unrelated generic claim');await approve(record);
      await assert.rejects(pricing.record(reviewer,record));
      const valid=observation('binding');await seed(valid);
      for(const patch of [{sourceDigest:'b'.repeat(64)},{sourceUrl:'https://example.com/altered'},{productId:'product-unrelated'},{sourceId:'source-unrelated'},{collectedAt:new Date(baseTime-2000).toISOString()}]) await assert.rejects(pricing.record(reviewer,{...valid,...patch}));
    });
    await t.test('independent lifecycle approval exposes exact reviewed price with bounded effective expiry',async()=>{
      const record=observation('approved');await seed(record);await pricing.record(reviewer,record);await approve(record);
      const before=await counts(),result=await read(record);
      assert.equal(result.pricing[0].status,'reviewed-observation');assert.equal(result.pricing[0].amountMinor,10000);
      assert.equal(result.claims.length,1);assert.equal(result.claims[0].statement,pricingClaimStatement(record));
      assert.deepEqual(result,await read(record).then(next=>({...next,generatedAt:result.generatedAt})));
      assert.deepEqual(await counts(),before);
    });
    await t.test('a newer candidate in the same context suppresses old prices and old pricing claim text',async()=>{
      const old=observation('latest-old');await seed(old);await pricing.record(reviewer,old);await approve(old);
      const latest=observation('latest-new',{productId:old.productId,observedAt:new Date(baseTime-30000).toISOString(),amountMinor:20000});await seed(latest);await pricing.record(reviewer,latest);
      const result=await read(old);assert.equal(result.pricing[0].amountMinor,null);assert.deepEqual(result.claims,[]);
      await approve(latest);assert.equal((await read(old)).pricing[0].amountMinor,20000);
    });
    await t.test('expired or tied prices cannot leak through otherwise approved typed claim text',async()=>{
      const expired=observation('expired',{expiresAt:new Date(baseTime-500).toISOString()});await seed(expired);await pricing.record(reviewer,expired);await approve(expired);
      const stale=await read(expired);assert.equal(stale.pricing[0].amountMinor,null);assert.deepEqual(stale.claims,[]);
      const first=observation('tie-first');await seed(first);await pricing.record(reviewer,first);await approve(first);
      const second=observation('tie-second',{productId:first.productId});await seed(second);await pricing.record(reviewer,second);await approve(second);
      const tied=await read(first);assert.equal(tied.pricing[0].reason,'ambiguous-latest-observation');assert.deepEqual(tied.claims,[]);
    });
    await t.test('approval/source revocation and claim drift immediately hide pricing and claim text',async()=>{
      const record=observation('revoked');await seed(record);await pricing.record(reviewer,record);const request=await approve(record);
      await approvals.revoke(owner,{requestId:request.requestId,requestDigest:request.requestDigest,expectedVersion:1});
      assert.equal((await read(record)).pricing[0].amountMinor,null);assert.deepEqual((await read(record)).claims,[]);
      const source=observation('withdrawn');await seed(source);await pricing.record(reviewer,source);await approve(source);
      await lifecycle.revokeEvidence(owner,{sourceId:source.sourceId,sourceDigest:source.sourceDigest,reason:'Synthetic withdrawal'});
      assert.equal((await read(source)).pricing[0].amountMinor,null);await assert.rejects(pricing.record(reviewer,source));
      const drift=observation('drift');await seed(drift);await pricing.record(reviewer,drift);await approve(drift);
      await admin.query('UPDATE product_claims SET version=2 WHERE id=$1',[drift.claimId]);
      assert.equal((await read(drift)).pricing[0].amountMinor,null);
    });
    await t.test('later approval of changed evidence cannot launder an old price source digest',async()=>{
      const record=observation('source-drift');await seed(record);await pricing.record(reviewer,record);
      await admin.query("UPDATE evidence_sources SET source_digest=repeat('b',64) WHERE id=$1",[record.sourceId]);
      await approve(record);
      assert.equal((await read(record)).pricing[0].amountMinor,null);assert.deepEqual((await read(record)).claims,[]);
    });
    await t.test('forged/foreign handles, tenant substitutions and raw app access fail closed',async()=>{
      const record=observation('initial');
      for(const handle of [{role:'owner'},foreign]) {
        await assert.rejects(pricing.record(handle,record));await assert.rejects(pricing.history(handle,{productId:record.productId}));
        await assert.rejects(projection.read(handle,{productId:record.productId,agentId:record.agentId}));
      }
      await assert.rejects(pricing.record(reviewer,{...record,approved:true}));
      await assert.rejects(createProductProjectionService({identity:{}}).read(owner,{productId:record.productId,agentId:record.agentId}));
      const app=await openLocalPool({...config,user:'stackpilot_app'});
      try {await assert.rejects(app.query('SELECT * FROM pricing_observations'));}
      finally {await app.end();}
      await assert.rejects(pool.query('UPDATE pricing_observations SET record=record'));await assert.rejects(pool.query('DELETE FROM pricing_observations'));
      assert.equal((await pool.query('SELECT count(*) FROM pricing_observations')).rows[0].count,'0');
    });
    await t.test('outbox failure rolls observation/audit back and retry succeeds',async()=>{
      const record=observation('rollback');await seed(record);const before=await counts();
      await admin.query("CREATE FUNCTION fixture_pricing_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='pricing-observation-recorded' THEN RAISE EXCEPTION 'fixture'; END IF; RETURN NEW; END $$; CREATE TRIGGER fixture_pricing_failure BEFORE INSERT ON outbox_events FOR EACH ROW EXECUTE FUNCTION fixture_pricing_failure()");
      try {await assert.rejects(pricing.record(reviewer,record));assert.deepEqual(await counts(),before);}
      finally {await admin.query('DROP TRIGGER fixture_pricing_failure ON outbox_events; DROP FUNCTION fixture_pricing_failure()');}
      assert.equal((await pricing.record(reviewer,record)).replayed,false);
    });
    await t.test('projection after racing revocation remains invalidated and plain approved claims stay scoped',async()=>{
      const record=observation('race');await seed(record);await pricing.record(reviewer,record);const request=await approve(record);
      const racing=await Promise.allSettled([read(record),approvals.revoke(owner,{requestId:request.requestId,requestDigest:request.requestDigest,expectedVersion:1})]);
      assert.equal(racing[1].status,'fulfilled');assert.equal((await read(record)).pricing[0].amountMinor,null);
      const plain=observation('plain');await seed(plain,'Synthetic generic capability');await approve(plain);
      const result=await read(plain);assert.equal(result.claims[0].statement,'Synthetic generic capability');assert.deepEqual(result.pricing,[]);
    });
  } finally {
    if(pool) await pool.end();await admin.query('ALTER ROLE stackpilot_control NOLOGIN');await admin.end();
    const target=realpathSync(root);if(dirname(target)!==realpathSync(tmpdir())||!basename(target).startsWith('stackpilot-pricing-')) throw new Error('Unsafe fixture cleanup');
    rmSync(target,{recursive:true,force:true});
  }
});
