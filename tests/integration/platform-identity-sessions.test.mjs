import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,randomBytes} from 'node:crypto';
import {mkdtempSync,writeFileSync,rmSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,basename} from 'node:path';
import {openLocalPool,openLocalControlPool} from '../../src/platform/persistence/connection.mjs';
import {applyMigrations} from '../../src/platform/persistence/migrate.mjs';
import {createIdentityService} from '../../src/platform/identity/sessions.mjs';

const config=JSON.parse(process.env.STACKPILOT_TEST_DB??'null');
if(config?.database!=='stackpilot_identity_test') throw new Error('Use the disposable test harness');
const admin=await openLocalPool(config);
const root=realpathSync(mkdtempSync(join(tmpdir(),'stackpilot-identity-')));
const trustPath=join(root,'trust.json');
const owner=generateKeyPairSync('ed25519'),reviewer=generateKeyPairSync('ed25519');
const principal=(keyId,userId,role,key)=>({keyId,userId,organizationId:'org-alpha',role,publicKeySpkiBase64:key.publicKey.export({type:'spki',format:'der'}).toString('base64')});
const pinnedOwner=principal('owner-key','owner-user','owner',owner);
const pinnedReviewer=principal('reviewer-key','reviewer-user','reviewer',reviewer);
const trust=principals=>writeFileSync(trustPath,JSON.stringify({schemaVersion:1,principals}));
const origin='https://127.0.0.1:55439';
const proof=(challenge,key=owner)=>({keyId:challenge.keyId,challengeId:challenge.challengeId,nonce:challenge.nonce,signature:sign(null,Buffer.from(challenge.message),key.privateKey).toString('base64url')});
const denied=work=>assert.rejects(work,error=>error.message==='Identity operation failed'&&!error.cause);
let control;

test('signed identity sessions through the real restricted database role',async t=>{
 try {
  await applyMigrations(admin,{targetVersion:2});
  await admin.query("INSERT INTO organizations(id,name) VALUES ('org-alpha','Synthetic identity org')");
  for(const user of ['owner-user','reviewer-user']) await admin.query("INSERT INTO users(organization_id,id,display_name) VALUES ('org-alpha',$1,'Synthetic identity')",[user]);
  await assert.rejects(openLocalControlPool({...config,user:'stackpilot_control'}),/Local database verification failed/);
  // Only this owned disposable cluster enables the role for integration connections.
  await admin.query('ALTER ROLE stackpilot_control LOGIN');
  control=await openLocalControlPool({...config,user:'stackpilot_control'});
  trust([pinnedOwner,pinnedReviewer]);
  const service=createIdentityService({pool:control,trustPath,origin});
  const login=async(keyId='owner-key',key=owner)=>service.completeChallenge(proof(await service.createChallenge({keyId}),key));
  const session=await login();
  assert.match(session.token,/^[A-Za-z0-9_-]{43}$/);
  const handle=await service.authenticate({keyId:'owner-key',token:session.token});
  assert.equal((await service.requireOwner(handle)).userId,'owner-user');

  await t.test('opaque handles, caller role fields and untrusted pools cannot establish owner',async()=>{
   await denied(()=>service.requireOwner({role:'owner',userId:'owner-user',organizationId:'org-alpha'}));
   await denied(()=>service.authenticate({keyId:'owner-key',token:session.token,role:'owner'}));
   const other=createIdentityService({pool:control,trustPath,origin});
   await denied(()=>other.requireOwner(handle));
   const elevated=createIdentityService({pool:admin,trustPath,origin});
   await denied(()=>elevated.createChallenge({keyId:'owner-key'}));
   const app=await openLocalPool({...config,user:'stackpilot_app'});
   try {
    await denied(()=>createIdentityService({pool:app,trustPath,origin}).createChallenge({keyId:'owner-key'}));
   } finally {await app.end();}
   const profile=await service.requirePrincipal(handle);
   assert.ok(Object.isFrozen(profile));
   assert.deepEqual(Reflect.ownKeys(handle),[]);
  });
  await t.test('challenge replay, wrong signatures/nonces and concurrent consumption are denied',async()=>{
   const challenge=await service.createChallenge({keyId:'owner-key'});
   await denied(()=>service.completeChallenge(proof(challenge,reviewer)));
   await denied(()=>service.completeChallenge({...proof(challenge),nonce:randomBytes(32).toString('base64url')}));
   const results=await Promise.allSettled([service.completeChallenge(proof(challenge)),service.completeChallenge(proof(challenge))]);
   assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
   await denied(()=>service.completeChallenge(proof(challenge)));
   assert.equal((await admin.query('SELECT count(*) FROM auth_sessions WHERE challenge_id=$1',[challenge.challengeId])).rows[0].count,'1');
  });
  await t.test('signature domain binds the configured origin',async()=>{
   const challenge=await service.createChallenge({keyId:'owner-key'});
   const other=createIdentityService({pool:control,trustPath,origin:'https://127.0.0.1:55440'});
   await denied(()=>other.completeChallenge(proof(challenge)));
   await service.completeChallenge(proof(challenge));
  });
  await t.test('cross-organization key, challenge and token substitutions fail closed',async()=>{
   const foreign=generateKeyPairSync('ed25519');
   const pinnedForeign={...principal('foreign-key','foreign-user','owner',foreign),organizationId:'org-beta'};
   await admin.query("INSERT INTO organizations(id,name) VALUES ('org-beta','Synthetic foreign org')");
   await admin.query("INSERT INTO users(organization_id,id,display_name) VALUES ('org-beta','foreign-user','Synthetic foreign user')");
   trust([pinnedOwner,pinnedReviewer,pinnedForeign]);
   const alphaChallenge=await service.createChallenge({keyId:'owner-key'});
   const betaChallenge=await service.createChallenge({keyId:'foreign-key'});
   await denied(()=>service.completeChallenge({...proof(alphaChallenge),keyId:'foreign-key'}));
   await denied(()=>service.completeChallenge(proof(betaChallenge,owner)));
   const betaSession=await service.completeChallenge(proof(betaChallenge,foreign));
   await denied(()=>service.authenticate({keyId:'foreign-key',token:session.token}));
   await denied(()=>service.authenticate({keyId:'owner-key',token:betaSession.token}));
   const betaHandle=await service.authenticate({keyId:'foreign-key',token:betaSession.token});
   assert.equal((await service.requirePrincipal(betaHandle)).organizationId,'org-beta');
   trust([pinnedOwner,pinnedReviewer]);
  });
  await t.test('reviewer sessions cannot satisfy owner and trust role changes invalidate existing handles',async()=>{
   const reviewerSession=await login('reviewer-key',reviewer);
   const reviewerHandle=await service.authenticate({keyId:'reviewer-key',token:reviewerSession.token});
   await denied(()=>service.requireOwner(reviewerHandle));
   trust([{...pinnedOwner,role:'reviewer'},{...pinnedReviewer,role:'owner'}]);
   await denied(()=>service.requireOwner(handle));
   await denied(()=>service.authenticate({keyId:'owner-key',token:session.token}));
   trust([pinnedOwner,pinnedReviewer]);
  });
  await t.test('trust removal and rotation fail closed for sessions',async()=>{
   trust([pinnedReviewer.role==='reviewer'?{...pinnedReviewer,role:'owner'}:pinnedReviewer]);
   await denied(()=>service.requirePrincipal(handle));
   trust([{...pinnedOwner,publicKeySpkiBase64:generateKeyPairSync('ed25519').publicKey.export({type:'spki',format:'der'}).toString('base64')},pinnedReviewer]);
   await denied(()=>service.requirePrincipal(handle));
   trust([pinnedOwner,pinnedReviewer]);
  });
  await t.test('CSRF tokens are session-bound and logout revokes existing handles',async()=>{
   assert.equal(await service.verifyCsrf(handle,session.csrfToken),true);
   await denied(()=>service.verifyCsrf(handle,randomBytes(32).toString('base64url')));
   await service.logout({keyId:'owner-key',token:session.token});
   await denied(()=>service.requirePrincipal(handle));
   await denied(()=>service.authenticate({keyId:'owner-key',token:session.token}));
   await service.logout({keyId:'owner-key',token:session.token});
  });
  await t.test('expiry and absent user profiles are rejected using database state',async()=>{
   const challenge=await service.createChallenge({keyId:'owner-key'});
   const expired=(await admin.query("UPDATE auth_challenges SET created_at=now()-interval '120 seconds',expires_at=now()-interval '60 seconds' WHERE id=$1 RETURNING expires_at",[challenge.challengeId])).rows[0];
   const message=JSON.parse(challenge.message);
   message[8]=expired.expires_at.toISOString();
   await denied(()=>service.completeChallenge(proof({...challenge,message:JSON.stringify(message)})));
   const expiring=await login();
   await admin.query("UPDATE auth_sessions SET created_at=now()-interval '30 minutes',expires_at=now()-interval '15 minutes' WHERE token_hash IS NOT NULL");
   await denied(()=>service.authenticate({keyId:'owner-key',token:expiring.token}));
   trust([{...pinnedOwner,userId:'missing-user'},pinnedReviewer]);
   await denied(()=>service.createChallenge({keyId:'owner-key'}));
   trust([pinnedOwner,pinnedReviewer]);
  });
  await t.test('effective column privilege drift rejects control operations',async()=>{
   await admin.query('GRANT UPDATE(decision) ON approval_decisions TO stackpilot_control');
   try {await denied(()=>service.createChallenge({keyId:'owner-key'}));}
   finally {await admin.query('REVOKE UPDATE(decision) ON approval_decisions FROM stackpilot_control');}
  });
  await t.test('persistent challenge issuance is bounded and database contains hashes only',async()=>{
   await admin.query("UPDATE auth_challenges SET created_at=now()-interval '120 seconds',expires_at=now()-interval '60 seconds'");
   for(let i=0;i<10;i++) await service.createChallenge({keyId:'reviewer-key'});
   await denied(()=>service.createChallenge({keyId:'reviewer-key'}));
   const rows=await admin.query('SELECT token_hash FROM auth_sessions');
   assert.ok(rows.rows.every(r=>/^[a-f0-9]{64}$/.test(r.token_hash)&&r.token_hash!==session.token));
   assert.equal((await admin.query("SELECT count(*) FROM audit_events WHERE action='identity-session-issued'")).rows[0].count,(await admin.query('SELECT count(*) FROM auth_sessions')).rows[0].count);
  });
 } finally {
  if(control) await control.end();
  await admin.query('ALTER ROLE stackpilot_control NOLOGIN');
  await admin.end();
  const target=realpathSync(root);
  if(dirname(target)!==realpathSync(tmpdir())||!basename(target).startsWith('stackpilot-identity-')) throw new Error('Unsafe fixture cleanup');
  rmSync(target,{recursive:true,force:true});
 }
});
