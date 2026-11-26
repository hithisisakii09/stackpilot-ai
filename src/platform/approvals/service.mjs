import {createHash,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {sql} from 'drizzle-orm';
import {fields,id,integer,json,text} from '../contracts/validation.mjs';
import {parseLockedPolicy,parseCandidateEvidence} from '../contracts/domain.mjs';
import {ACTION_POLICIES} from '../contracts/actions.mjs';
import {withAuthenticatedTransaction} from '../identity/sessions.mjs';

const fail=()=>new Error('Approval operation failed');
const newId=()=> 'approval-'+randomUUID();
const policy=()=>parseLockedPolicy(JSON.parse(readFileSync(new URL('../../../config/operating-policy.json',import.meta.url),'utf8')));
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const digest=value=>createHash('sha256').update(JSON.stringify(canonical(json(value)))).digest('hex');
const hex=value=>{if(typeof value!=='string'||!/^[a-f0-9]{64}$/.test(value)) throw fail();return value;};

async function audit(tx,action,targetId) {
  const auditId=newId();
  await tx.db.execute(sql`INSERT INTO public.audit_events(organization_id,id,actor_id,request_id,action,target_id)
    VALUES (${tx.scope.organizationId},${auditId},${tx.scope.actorId},${tx.scope.requestId},${action},${targetId})`);
  await tx.db.execute(sql`INSERT INTO public.outbox_events(organization_id,id,audit_id,kind)
    VALUES (${tx.scope.organizationId},${newId()},${auditId},${action})`);
}

async function snapshot(tx,claimId,agentId) {
  const result=await tx.db.execute(sql`SELECT c.id,c.product_id,c.statement,c.caveat,c.status,c.approved,c.version,
    p.website,p.status AS product_status,p.affiliate_url,a.role,a.version AS agent_version,a.enabled,a.cost_inr,
    clock_timestamp() AS read_at,
    COALESCE((SELECT jsonb_agg(e ORDER BY e.id) FROM (
      SELECT s.id,s.product_id,s.source_url,s.collected_at,s.status,s.source_digest,ce.id AS link_id
      FROM public.claim_evidence ce JOIN public.evidence_sources s ON s.organization_id=ce.organization_id AND s.id=ce.source_id AND s.product_id=ce.product_id
      WHERE ce.organization_id=c.organization_id AND ce.claim_id=c.id AND ce.product_id=c.product_id
      ORDER BY s.id LIMIT 21) e),'[]'::jsonb) AS sources
    FROM public.product_claims c JOIN public.products p ON p.organization_id=c.organization_id AND p.id=c.product_id
    JOIN public.agents a ON a.organization_id=c.organization_id AND a.id=${agentId}
    WHERE c.organization_id=${tx.scope.organizationId} AND c.id=${claimId}`);
  if(result.rows.length!==1) throw fail();
  const row=result.rows[0];
  if(row.status!=='candidate'||row.approved!==false||row.product_status!=='candidate'||row.affiliate_url!==null||row.enabled!==false||row.cost_inr!==0||row.sources.length<1||row.sources.length>20) throw fail();
  const locked=policy();
  const payload={claim:{id:id(row.id),productId:id(row.product_id),statement:text(row.statement),caveat:text(row.caveat),status:row.status,approved:row.approved,version:integer(row.version,1,2147483647)},
    product:{id:id(row.product_id),website:text(row.website,2048),status:row.product_status,affiliateUrl:row.affiliate_url},
    agent:{id:id(agentId),role:text(row.role,100),version:integer(row.agent_version,1,2147483647),enabled:row.enabled,costINR:row.cost_inr},policy:locked};
  const sources=row.sources.map(source=>{
    const parsed=parseCandidateEvidence({schemaVersion:1,id:source.id,organizationId:tx.scope.organizationId,productId:source.product_id,sourceUrl:source.source_url,collectedAt:new Date(source.collected_at).toISOString(),statement:row.statement,status:source.status},{now:new Date(row.read_at).toISOString()});
    return {id:parsed.id,productId:parsed.productId,sourceUrl:parsed.sourceUrl,collectedAt:parsed.collectedAt,status:parsed.status,sourceDigest:hex(source.source_digest),linkId:id(source.link_id)};
  });
  return {resourceVersion:payload.claim.version,policyVersion:locked.policyVersion,payloadDigest:digest(payload),evidenceDigest:digest(sources),productId:payload.product.id,sourceIds:sources.map(source=>source.id),nowMs:new Date(row.read_at).getTime()};
}

// Internal transaction helpers. Authentication and lifecycle authority stay with the caller's service.
export {snapshot as readClaimReviewSnapshot};

export async function inspectClaimApproval(tx,requestId) {
  id(requestId);
  await tx.db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${tx.scope.organizationId}),hashtext(${requestId}))`);
  const row=await request(tx,requestId);
  validateBinding(row);
  const latest=(await tx.db.execute(sql`SELECT id,decision,version FROM public.approval_decisions WHERE organization_id=${tx.scope.organizationId} AND request_id=${requestId} ORDER BY version DESC LIMIT 1`)).rows[0];
  return Object.freeze({requestId,claimId:row.resource_id,agentId:row.agent_id,requesterUserId:row.requester_user_id,requestDigest:row.request_digest,resourceVersion:row.resource_version,payloadDigest:row.payload_digest,evidenceDigest:row.evidence_digest,decision:latest?.decision??null,decisionId:latest?.id??null,decisionVersion:latest?.version??0});
}

async function request(tx,requestId) {
  const result=await tx.db.execute(sql`SELECT r.*,b.id AS binding_id,b.requester_user_id,b.requester_agent_id,b.resource_type,b.resource_version,b.policy_version,b.risk,b.request_digest
    FROM public.approval_requests r LEFT JOIN public.approval_request_bindings b ON b.organization_id=r.organization_id AND b.request_id=r.id
    WHERE r.organization_id=${tx.scope.organizationId} AND r.id=${requestId}`);
  if(result.rows.length!==1) throw fail();
  return result.rows[0];
}

function requestHash(row) {
  return digest({organizationId:row.organization_id,requestId:row.id,createdAt:new Date(row.created_at).toISOString(),agentId:row.agent_id,action:row.action,resourceId:row.resource_id,payloadDigest:row.payload_digest,evidenceDigest:row.evidence_digest,
    requesterUserId:row.requester_user_id,requesterAgentId:row.requester_agent_id,resourceType:row.resource_type,resourceVersion:row.resource_version,policyVersion:row.policy_version,risk:row.risk});
}

function validateBinding(row) {
  if(!row.binding_id||row.action!=='approve-claim'||ACTION_POLICIES[row.action]?.tier!=='human_approval'||row.resource_type!=='claim'||row.status!=='pending'||row.risk!=='high') throw fail();
  if((row.requester_user_id===null)===(row.requester_agent_id===null)) throw fail();
  integer(row.resource_version,1,2147483647);
  integer(row.policy_version,1,2147483647);
  if(row.request_digest!==requestHash(row)) throw fail();
}

async function validate(tx,row) {
  validateBinding(row);
  const state=await snapshot(tx,row.resource_id,row.agent_id);
  if(row.resource_version!==state.resourceVersion||row.policy_version!==state.policyVersion||row.payload_digest!==state.payloadDigest||row.evidence_digest!==state.evidenceDigest||row.request_digest!==requestHash(row)) throw fail();
  return state;
}

export function createApprovalService(options) {
  fields(options,['identity']);
  const {identity}=options;
  const run=(handle,ownerOnly,work)=>withAuthenticatedTransaction(identity,handle,ownerOnly,async(tx,principal)=>{
    const before=digest(policy());
    const result=await work(tx,principal);
    if(before!==digest(policy())) throw fail();
    return result;
  });
  const safe=work=>async(...args)=>{try{return await work(...args);}catch{throw fail();}};

  async function record(handle,input,revoking) {
    fields(input,revoking?['requestId','expectedVersion','requestDigest']:['requestId','decision','expectedVersion','requestDigest']);
    id(input.requestId);
    integer(input.expectedVersion,0,2147483646);
    hex(input.requestDigest);
    if(!revoking&&!['approved','rejected'].includes(input.decision)) throw fail();
    return run(handle,true,async(tx,principal)=>{
      await tx.db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${tx.scope.organizationId}),hashtext(${input.requestId}))`);
      const row=await request(tx,input.requestId);
      if(row.requester_user_id===principal.userId||row.requester_agent_id===principal.userId) throw fail();
      validateBinding(row);
      const state=revoking?null:await validate(tx,row);
      if(input.requestDigest!==row.request_digest) throw fail();
      const previous=await tx.db.execute(sql`SELECT version,decision,request_digest FROM public.approval_decisions
        WHERE organization_id=${tx.scope.organizationId} AND request_id=${input.requestId} ORDER BY version DESC LIMIT 1`);
      const version=previous.rows[0]?.version??0;
      if(version!==input.expectedVersion||(revoking?!(version===1&&previous.rows[0]?.decision==='approved'):version!==0)) throw fail();
      if(revoking&&previous.rows[0].request_digest!==row.request_digest) throw fail();
      const decision=revoking?'revoked':input.decision;
      const decisionId=newId();
      const inserted=await tx.db.execute(sql`INSERT INTO public.approval_decisions
        (organization_id,id,request_id,decider_user_id,decision,decided_at,request_digest,version)
        VALUES (${tx.scope.organizationId},${decisionId},${input.requestId},${principal.userId},${decision},clock_timestamp(),${row.request_digest},${version+1}) RETURNING id,version,decision,decided_at`);
      await audit(tx,'approval-decision-'+decision,decisionId);
      if(!revoking) {
        const fresh=await validate(tx,row);
        if(fresh.payloadDigest!==state.payloadDigest||fresh.evidenceDigest!==state.evidenceDigest) throw fail();
      }
      return Object.freeze({id:decisionId,requestId:input.requestId,decision,version:version+1,decidedAt:new Date(inserted.rows[0].decided_at).toISOString(),requestDigest:row.request_digest});
    });
  }

  return Object.freeze({
    createClaimRequest:safe(async(handle,input)=>{
      fields(input,['requestId','agentId','claimId']);
      id(input.requestId);id(input.agentId);id(input.claimId);
      return run(handle,false,async(tx,principal)=>{
        const state=await snapshot(tx,input.claimId,input.agentId);
        const inserted=await tx.db.execute(sql`INSERT INTO public.approval_requests(organization_id,id,agent_id,action,resource_id,payload_digest,evidence_digest)
          VALUES (${tx.scope.organizationId},${input.requestId},${input.agentId},'approve-claim',${input.claimId},${state.payloadDigest},${state.evidenceDigest}) RETURNING *`);
        const row={...inserted.rows[0],requester_user_id:principal.userId,requester_agent_id:null,resource_type:'claim',resource_version:state.resourceVersion,policy_version:state.policyVersion,risk:'high'};
        const requestDigest=requestHash(row);
        await tx.db.execute(sql`INSERT INTO public.approval_request_bindings(organization_id,id,request_id,requester_user_id,resource_type,resource_version,policy_version,risk,request_digest)
          VALUES (${tx.scope.organizationId},${newId()},${input.requestId},${principal.userId},'claim',${state.resourceVersion},${state.policyVersion},'high',${requestDigest})`);
        await audit(tx,'approval-request-created',input.requestId);
        return Object.freeze({requestId:input.requestId,requestDigest,expectedVersion:0,resourceVersion:state.resourceVersion});
      });
    }),
    listPending:safe(handle=>run(handle,false,async tx=>{
      const rows=await tx.db.execute(sql`SELECT r.id,r.action,r.resource_id,b.request_digest,b.resource_version FROM public.approval_requests r
        JOIN public.approval_request_bindings b ON b.organization_id=r.organization_id AND b.request_id=r.id
        WHERE r.organization_id=${tx.scope.organizationId} AND r.status='pending' AND r.action='approve-claim' AND b.resource_type='claim' AND b.risk='high'
        AND NOT EXISTS (SELECT FROM public.approval_decisions d WHERE d.organization_id=r.organization_id AND d.request_id=r.id)
        ORDER BY r.id LIMIT 101`);
      if(rows.rows.length>100) throw fail();
      return json(rows.rows.map(row=>({requestId:row.id,action:row.action,resourceId:row.resource_id,requestDigest:row.request_digest,resourceVersion:row.resource_version,expectedVersion:0})));
    })),
    history:safe(async(handle,input)=>{
      fields(input,['requestId']);id(input.requestId);
      return run(handle,false,async tx=>{
        await request(tx,input.requestId);
        const rows=await tx.db.execute(sql`SELECT id,version,decision,decider_user_id,decided_at,request_digest FROM public.approval_decisions WHERE organization_id=${tx.scope.organizationId} AND request_id=${input.requestId} ORDER BY version LIMIT 101`);
        if(rows.rows.length>100) throw fail();
        return json(rows.rows.map(row=>({id:row.id,version:row.version,decision:row.decision,deciderUserId:row.decider_user_id,decidedAt:new Date(row.decided_at).toISOString(),requestDigest:row.request_digest})));
      });
    }),
    decide:safe((handle,input)=>record(handle,input,false)),
    revoke:safe((handle,input)=>record(handle,input,true))
  });
}
