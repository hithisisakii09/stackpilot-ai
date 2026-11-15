import {randomUUID} from 'node:crypto';
import {sql} from 'drizzle-orm';
import {fields, id, text} from '../contracts/validation.mjs';
import {withAuthenticatedTransaction} from '../identity/sessions.mjs';
import {readClaimReviewSnapshot, inspectClaimApproval} from '../approvals/service.mjs';
import {digest} from '../orchestration/dag.mjs';
import {normalizeLifecycleInput, evaluateClaimTransition, effectiveClaimState} from './lifecycle.mjs';

const fail=()=>new Error('Claim lifecycle operation failed');
const recordId=()=> 'lifecycle-'+randomUUID();
const date=value=>new Date(value).toISOString();
const sameBinding=(row,snapshot)=>row.claim_version===snapshot.resourceVersion&&row.payload_digest===snapshot.payloadDigest&&row.evidence_digest===snapshot.evidenceDigest;

async function audit(tx,action,targetId) {
  const auditId=recordId();
  await tx.db.execute(sql`INSERT INTO public.audit_events(organization_id,id,actor_id,request_id,action,target_id) VALUES (${tx.scope.organizationId},${auditId},${tx.scope.actorId},${tx.scope.requestId},${action},${targetId})`);
  await tx.db.execute(sql`INSERT INTO public.outbox_events(organization_id,id,audit_id,kind) VALUES (${tx.scope.organizationId},${recordId()},${auditId},${action})`);
}

async function facts(tx,claimId,agentId) {
  const snapshot=await readClaimReviewSnapshot(tx,claimId,agentId);
  const sources=sql.join(snapshot.sourceIds.map(sourceId=>sql`${sourceId}`),sql`, `);
  const revoked=(await tx.db.execute(sql`SELECT id FROM public.evidence_revocations WHERE organization_id=${tx.scope.organizationId} AND source_id IN (${sources}) LIMIT 1`)).rows.length!==0;
  return {snapshot,revoked};
}

async function inspect(tx,claimId,agentId) {
  const history=(await tx.db.execute(sql`SELECT * FROM public.claim_lifecycle_events WHERE organization_id=${tx.scope.organizationId} AND claim_id=${claimId} ORDER BY version LIMIT 101`)).rows;
  if(history.length>100||history.some((row,index)=>row.version!==index+1||row.previous_event_id!==(history[index-1]?.id??null))) throw fail();
  const latest=history.at(-1), current=await facts(tx,claimId,agentId);
  if(latest&&latest.agent_id!==agentId) throw fail();
  const review=latest?.review_event_id?history.find(row=>row.id===latest.review_event_id):null;
  const approval=review?await inspectClaimApproval(tx,review.request_id):null;
  if(review&&(review.status!=='needs-review'||approval.claimId!==claimId||approval.agentId!==agentId||approval.requestDigest!==review.request_digest)) throw fail();
  const bindingMatches=!latest||sameBinding(latest,current.snapshot);
  const effective=effectiveClaimState({recordedStatus:latest?.status??'candidate',bindingMatches,evidenceRevoked:current.revoked,expired:!!latest&&new Date(latest.valid_until).getTime()<=current.snapshot.nowMs,decision:approval?.decision??null});
  return {history,latest,current,review,approval,effective};
}

function publicState(state) {
  return Object.freeze({version:state.latest?.version??0,recordedStatus:state.latest?.status??'candidate',effectiveStatus:state.effective.status,reason:state.effective.reason,history:Object.freeze(state.history.map(row=>Object.freeze({id:row.id,version:row.version,status:row.status,claimVersion:row.claim_version,expiresAt:date(row.valid_until),actorId:row.actor_id,createdAt:date(row.created_at)})))});
}

export function createClaimLifecycleService(options) {
  fields(options,['identity']);
  const {identity}=options;
  const safe=work=>async(...args)=>{try{return await work(...args);}catch{throw fail();}};
  const run=(handle,ownerOnly,work)=>withAuthenticatedTransaction(identity,handle,ownerOnly,async(tx,principal)=>{
    await tx.db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${tx.scope.organizationId}),hashtext('claim-lifecycle-v1'))`);
    return work(tx,principal);
  });
  return Object.freeze({
    inspect:safe(async(handle,input)=>{
      fields(input,['claimId','agentId']);
      const claimId=id(input.claimId),agentId=id(input.agentId);
      return run(handle,false,async tx=>publicState(await inspect(tx,claimId,agentId)));
    }),
    transition:safe(async(handle,input)=>{
      const captured=normalizeLifecycleInput(input), inputDigest=digest(captured);
      return run(handle,false,async(tx,principal)=>{
        const state=await inspect(tx,captured.claimId,captured.agentId);
        const prior=(await tx.db.execute(sql`SELECT id,input_digest,status FROM public.claim_lifecycle_events WHERE organization_id=${tx.scope.organizationId} AND idempotency_key=${captured.idempotencyKey}`)).rows[0];
        if(prior) {
          if(prior.input_digest!==inputDigest||state.latest?.id!==prior.id||state.effective.status!==prior.status) throw fail();
          return Object.freeze({id:prior.id,version:state.latest.version,status:prior.status,replayed:true});
        }
        const previous=state.latest, version=previous?.version??0;
        if(version!==captured.expectedVersion||version>=100) throw fail();
        let approval=state.approval;
        if(captured.to==='needs-review') {
          approval=await inspectClaimApproval(tx,captured.requestId);
          if(approval.decision!==null||approval.requesterUserId!==principal.userId||approval.claimId!==captured.claimId||approval.agentId!==captured.agentId||approval.resourceVersion!==state.current.snapshot.resourceVersion||approval.payloadDigest!==state.current.snapshot.payloadDigest||approval.evidenceDigest!==state.current.snapshot.evidenceDigest) throw fail();
        }
        const isCurrent=state.effective.status===(previous?.status??'candidate')&&!state.current.revoked&&(!previous||sameBinding(previous,state.current.snapshot)&&new Date(previous.valid_until).getTime()>state.current.snapshot.nowMs);
        if(['stale','reverification-required'].includes(captured.to)&&state.effective.status!==captured.to) throw fail();
        evaluateClaimTransition({from:previous?.status??'candidate',to:captured.to,role:principal.role,decision:approval?.decision??null,requesterUserId:approval?.requesterUserId??null,actorId:principal.userId,current:isCurrent});
        const collecting=captured.to==='evidence-collected';
        if(collecting&&state.current.revoked) throw fail();
        const validUntil=collecting?captured.expiresAt:date(previous.valid_until);
        const remaining=new Date(validUntil).getTime()-state.current.snapshot.nowMs;
        if(collecting&&(remaining<=0||remaining>90*86400000)) throw fail();
        const eventId=recordId(),reviewEventId=collecting?null:captured.to==='needs-review'?eventId:previous.review_event_id;
        const requestId=captured.to==='needs-review'?captured.requestId:null;
        const requestDigest=requestId?approval.requestDigest:null;
        const decisionId=['verified','approved','rejected'].includes(captured.to)?approval.decisionId:null;
        const snapshot=state.current.snapshot;
        await tx.db.execute(sql`INSERT INTO public.claim_lifecycle_events(organization_id,id,claim_id,product_id,agent_id,version,previous_event_id,status,claim_version,payload_digest,evidence_digest,valid_until,review_event_id,request_id,request_digest,decision_id,actor_id,idempotency_key,input_digest)
          VALUES (${tx.scope.organizationId},${eventId},${captured.claimId},${snapshot.productId},${captured.agentId},${version+1},${previous?.id??null},${captured.to},${snapshot.resourceVersion},${snapshot.payloadDigest},${snapshot.evidenceDigest},${validUntil},${reviewEventId},${requestId},${requestDigest},${decisionId},${principal.userId},${captured.idempotencyKey},${inputDigest})`);
        await audit(tx,'claim-lifecycle-transitioned',eventId);
        const fresh=await facts(tx,captured.claimId,captured.agentId);
        if(fresh.snapshot.payloadDigest!==snapshot.payloadDigest||fresh.snapshot.evidenceDigest!==snapshot.evidenceDigest||fresh.revoked!==state.current.revoked||!['stale','reverification-required'].includes(captured.to)&&new Date(validUntil).getTime()<=fresh.snapshot.nowMs) throw fail();
        if(approval) {
          const decision=await inspectClaimApproval(tx,approval.requestId);
          if(decision.decisionId!==approval.decisionId||decision.requestDigest!==approval.requestDigest) throw fail();
        }
        return Object.freeze({id:eventId,version:version+1,status:captured.to,replayed:false});
      });
    }),
    revokeEvidence:safe(async(handle,input)=>{
      fields(input,['sourceId','sourceDigest','reason']);
      const sourceId=id(input.sourceId),reason=text(input.reason,1000),sourceDigest=input.sourceDigest;
      if(typeof sourceDigest!=='string'||!/^[a-f0-9]{64}$/.test(sourceDigest)) throw fail();
      return run(handle,true,async(tx,principal)=>{
        const source=(await tx.db.execute(sql`SELECT source_digest FROM public.evidence_sources WHERE organization_id=${tx.scope.organizationId} AND id=${sourceId}`)).rows[0];
        if(!source||source.source_digest!==sourceDigest) throw fail();
        const prior=(await tx.db.execute(sql`SELECT id,source_digest,reason FROM public.evidence_revocations WHERE organization_id=${tx.scope.organizationId} AND source_id=${sourceId}`)).rows[0];
        if(prior) {
          if(prior.source_digest!==sourceDigest||prior.reason!==reason) throw fail();
          return Object.freeze({id:prior.id,replayed:true});
        }
        const eventId=recordId();
        await tx.db.execute(sql`INSERT INTO public.evidence_revocations(organization_id,id,source_id,source_digest,reason,actor_id) VALUES (${tx.scope.organizationId},${eventId},${sourceId},${sourceDigest},${reason},${principal.userId})`);
        await audit(tx,'claim-evidence-revoked',eventId);
        return Object.freeze({id:eventId,replayed:false});
      });
    }),
  });
}
