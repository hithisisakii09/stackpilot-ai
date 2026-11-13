import {createHash,createHmac,createPublicKey,randomBytes,randomUUID,timingSafeEqual,verify} from 'node:crypto';
import {sql} from 'drizzle-orm';
import {fields,id} from '../contracts/validation.mjs';
import {loadTrustConfiguration} from './trust.mjs';
import {withControlTransaction} from '../persistence/transaction.mjs';

const failure=()=>new Error('Identity operation failed');
const hash=value=>createHash('sha256').update(value).digest('hex');
const recordId=prefix=>prefix+'-'+randomUUID();
const services=new WeakMap();

export async function withAuthenticatedTransaction(service,handle,ownerOnly,work) {
  const run=services.get(service);
  if(!run||typeof ownerOnly!=='boolean'||typeof work!=='function') throw failure();
  return run(handle,ownerOnly,work);
}

function decode(value,bytes) {
  if(typeof value!=='string'||value.length!==Math.ceil(bytes*8/6)||!/^[A-Za-z0-9_-]+$/.test(value)) throw failure();
  const decoded=Buffer.from(value,'base64url');
  if(decoded.length!==bytes||decoded.toString('base64url')!==value) throw failure();
  return decoded;
}

function fingerprint(key) {
  return hash(JSON.stringify(['stackpilot-principal-v1',key.keyId,key.organizationId,key.userId,key.role,key.keyFingerprint]));
}

function challengeMessage(key,origin,challengeId,nonce,expiresAt) {
  return JSON.stringify(['stackpilot-auth-v1',origin,key.keyId,key.organizationId,key.userId,fingerprint(key),challengeId,nonce,new Date(expiresAt).toISOString()]);
}

async function audit(tx,action,targetId) {
  const auditId=recordId('event');
  await tx.db.execute(sql`INSERT INTO audit_events(organization_id,id,actor_id,request_id,action,target_id)
    VALUES (${tx.scope.organizationId},${auditId},${tx.scope.actorId},${tx.scope.requestId},${action},${targetId})`);
  await tx.db.execute(sql`INSERT INTO outbox_events(organization_id,id,audit_id,kind)
    VALUES (${tx.scope.organizationId},${recordId('event')},${auditId},${action})`);
}

export function createIdentityService(options) {
  try {
    fields(options,['pool','trustPath','origin']);
    const {pool,trustPath,origin}=options;
    if(typeof origin!=='string'||!/^https:\/\/127\.0\.0\.1:[1-9][0-9]{3,4}$/.test(origin)) throw failure();
    const port=Number(new URL(origin).port);
    if(port<1024||port>65535||!Number.isInteger(port)) throw failure();
    loadTrustConfiguration(trustPath);
    const handles=new WeakMap();
    const attempts=new Map();

    function keyFor(keyId) {
      id(keyId);
      const key=loadTrustConfiguration(trustPath).principals.find(entry=>entry.keyId===keyId);
      if(!key) throw failure();
      return key;
    }

    function current(key) {
      if(fingerprint(keyFor(key.keyId))!==fingerprint(key)) throw failure();
    }

    function throttle(keyId) {
      const now=performance.now();
      for(const [key,entry] of attempts) if(now-entry.start>=60000) attempts.delete(key);
      const entry=attempts.get(keyId);
      if(entry) {
        if(entry.count>=20) throw failure();
        entry.count++;
      } else {
        if(attempts.size>=64) throw failure();
        attempts.set(keyId,{start:now,count:1});
      }
    }

    async function transaction(key,work) {
      return withControlTransaction(pool,{organizationId:key.organizationId,actorId:key.userId,requestId:recordId('identity')},async tx=>{
        const result=await work(tx);
        current(key);
        return result;
      });
    }

    async function sessionRow(tx,key,tokenHash,lock=false) {
      const result=await tx.db.execute(sql`SELECT s.id,s.expires_at FROM auth_sessions s
        JOIN auth_challenges c ON c.organization_id=s.organization_id AND c.id=s.challenge_id
        WHERE s.organization_id=${key.organizationId} AND s.key_id=${key.keyId}
        AND s.user_id=${key.userId} AND s.key_fingerprint=${fingerprint(key)} AND s.token_hash=${tokenHash}
        AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp() AND c.origin=${origin} ${lock?sql`FOR SHARE OF s`:sql``}`);
      if(result.rows.length!==1) throw failure();
      return result.rows[0];
    }

    const safe=operation=>async(...args)=>{
      try {return await operation(...args);} catch {throw failure();}
    };

    const service={
      createChallenge:safe(async input=>{
        fields(input,['keyId']);
        const key=keyFor(input.keyId);
        const nonce=randomBytes(32).toString('base64url');
        const challengeId=recordId('challenge');
        return transaction(key,async tx=>{
          const profile=await tx.db.execute(sql`SELECT id FROM users WHERE organization_id=${key.organizationId} AND id=${key.userId}`);
          if(profile.rows.length!==1) throw failure();
          await tx.db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${key.organizationId}),hashtext(${key.keyId}))`);
          const issued=await tx.db.execute(sql`SELECT count(*) AS count FROM auth_challenges
            WHERE organization_id=${key.organizationId} AND key_id=${key.keyId} AND created_at>clock_timestamp()-interval '60 seconds'`);
          if(Number(issued.rows[0].count)>=10) throw failure();
          const result=await tx.db.execute(sql`INSERT INTO auth_challenges
            (organization_id,id,user_id,key_id,key_fingerprint,nonce_digest,origin,expires_at)
            VALUES (${key.organizationId},${challengeId},${key.userId},${key.keyId},${fingerprint(key)},${hash(nonce)},${origin},now()+interval '60 seconds') RETURNING expires_at`);
          await audit(tx,'identity-challenge-issued',challengeId);
          const expiresAt=new Date(result.rows[0].expires_at);
          return Object.freeze({keyId:key.keyId,organizationId:key.organizationId,userId:key.userId,challengeId,nonce,origin,expiresAt:expiresAt.toISOString(),message:challengeMessage(key,origin,challengeId,nonce,expiresAt)});
        });
      }),
      completeChallenge:safe(async input=>{
        fields(input,['keyId','challengeId','nonce','signature']);
        const key=keyFor(input.keyId);
        id(input.challengeId);
        decode(input.nonce,32);
        const signature=decode(input.signature,64);
        throttle(key.keyId);
        return transaction(key,async tx=>{
          const result=await tx.db.execute(sql`SELECT expires_at,nonce_digest FROM auth_challenges
            WHERE organization_id=${key.organizationId} AND id=${input.challengeId} AND user_id=${key.userId}
            AND key_id=${key.keyId} AND key_fingerprint=${fingerprint(key)} AND origin=${origin}
            AND consumed_at IS NULL AND expires_at>clock_timestamp() FOR UPDATE`);
          if(result.rows.length!==1) throw failure();
          const row=result.rows[0];
          if(!timingSafeEqual(Buffer.from(row.nonce_digest,'hex'),Buffer.from(hash(input.nonce),'hex'))) throw failure();
          const publicKey=createPublicKey({key:Buffer.from(key.publicKeySpkiBase64,'base64'),type:'spki',format:'der'});
          if(!verify(null,Buffer.from(challengeMessage(key,origin,input.challengeId,input.nonce,row.expires_at)),publicKey,signature)) throw failure();
          const consumed=await tx.db.execute(sql`UPDATE auth_challenges SET consumed_at=clock_timestamp()
            WHERE organization_id=${key.organizationId} AND id=${input.challengeId}
            AND consumed_at IS NULL AND expires_at>clock_timestamp() RETURNING id`);
          if(consumed.rows.length!==1) throw failure();
          const token=randomBytes(32).toString('base64url');
          const sessionId=recordId('session');
          const inserted=await tx.db.execute(sql`INSERT INTO auth_sessions
            (organization_id,id,user_id,key_id,key_fingerprint,challenge_id,token_hash,expires_at)
            VALUES (${key.organizationId},${sessionId},${key.userId},${key.keyId},${fingerprint(key)},${input.challengeId},${hash(token)},now()+interval '15 minutes') RETURNING expires_at`);
          await audit(tx,'identity-session-issued',sessionId);
          const csrfToken=createHmac('sha256',decode(token,32)).update('stackpilot-csrf-v1|'+origin).digest('base64url');
          return Object.freeze({token,csrfToken,expiresAt:new Date(inserted.rows[0].expires_at).toISOString()});
        });
      }),
      authenticate:safe(async input=>{
        fields(input,['keyId','token']);
        const key=keyFor(input.keyId);
        decode(input.token,32);
        const tokenHash=hash(input.token);
        const row=await transaction(key,tx=>sessionRow(tx,key,tokenHash));
        const handle=Object.freeze(Object.create(null));
        const csrfToken=createHmac('sha256',decode(input.token,32)).update('stackpilot-csrf-v1|'+origin).digest('base64url');
        handles.set(handle,{keyId:key.keyId,fingerprint:fingerprint(key),tokenHash,sessionId:row.id,csrfToken});
        return handle;
      }),
      requirePrincipal:safe(async handle=>{
        const state=handles.get(handle);
        if(!state) throw failure();
        const key=keyFor(state.keyId);
        if(fingerprint(key)!==state.fingerprint) throw failure();
        const row=await transaction(key,tx=>sessionRow(tx,key,state.tokenHash));
        if(row.id!==state.sessionId) throw failure();
        return Object.freeze({userId:key.userId,organizationId:key.organizationId,role:key.role,keyId:key.keyId});
      }),
      requireOwner:safe(async handle=>{
        const principal=await service.requirePrincipal(handle);
        if(principal.role!=='owner') throw failure();
        return principal;
      }),
      sessionInformation:safe(async handle=>{
        const principal=await service.requirePrincipal(handle);
        return Object.freeze({...principal,csrfToken:handles.get(handle).csrfToken});
      }),
      verifyCsrf:safe(async(handle,csrfToken)=>{
        decode(csrfToken,32);
        await service.requirePrincipal(handle);
        if(!timingSafeEqual(decode(handles.get(handle).csrfToken,32),decode(csrfToken,32))) throw failure();
        return true;
      }),
      logout:safe(async input=>{
        fields(input,['keyId','token']);
        const key=keyFor(input.keyId);
        decode(input.token,32);
        await transaction(key,async tx=>{
          const result=await tx.db.execute(sql`UPDATE auth_sessions SET revoked_at=clock_timestamp()
            WHERE organization_id=${key.organizationId} AND key_id=${key.keyId} AND key_fingerprint=${fingerprint(key)}
            AND token_hash=${hash(input.token)} AND revoked_at IS NULL RETURNING id`);
          for(const row of result.rows) await audit(tx,'identity-session-revoked',row.id);
        });
        return true;
      })
    };
    services.set(service,safe(async(handle,ownerOnly,work)=>{
      const state=handles.get(handle);
      if(!state) throw failure();
      const key=keyFor(state.keyId);
      if(fingerprint(key)!==state.fingerprint||ownerOnly&&key.role!=='owner') throw failure();
      return transaction(key,async tx=>{
        const row=await sessionRow(tx,key,state.tokenHash,true);
        if(row.id!==state.sessionId) throw failure();
        const principal=Object.freeze({userId:key.userId,organizationId:key.organizationId,role:key.role,keyId:key.keyId});
        const result=await work(tx,principal);
        await sessionRow(tx,key,state.tokenHash);
        return result;
      });
    }));
    return Object.freeze(service);
  } catch {throw failure();}
}
