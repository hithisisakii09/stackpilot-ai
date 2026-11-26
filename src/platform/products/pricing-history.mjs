import {sql} from 'drizzle-orm';
import {randomUUID} from 'node:crypto';
import {fields,id,text,integer,choice,json} from '../contracts/validation.mjs';
import {canonicalCandidateUrl} from './discovery.mjs';
import {digest} from '../orchestration/dag.mjs';
import {withAuthenticatedTransaction} from '../identity/sessions.mjs';

export const pricingClaimPrefix='Pricing observation v1 ';
const required=['id','productId','claimId','agentId','sourceId','sourceUrl','sourceDigest','observedAt','collectedAt','expiresAt','plan','region','currency','amountMinor','billingPeriod','unit','taxTreatment','manualReference'];
const currencies=new Set(Intl.supportedValuesOf('currency'));
const fail=()=>new Error('Pricing history operation failed');

function timestamp(value) {
  const time=typeof value==='string'?Date.parse(value):NaN;
  if(!Number.isFinite(time)||time<Date.UTC(2000,0,1)||new Date(time).toISOString()!==value) throw new Error('Invalid pricing timestamp');
  return time;
}

export function normalizePricingObservation(value,options={}) {
  fields(value,required,['kind','status','reviewState']);fields(options,[],['nowMs']);
  const nowMs=options.nowMs===undefined?Date.now():integer(options.nowMs,Date.UTC(2000,0,1),4102444800000);
  if(value.kind!==undefined&&value.kind!=='manual-pricing-observation-v1'||value.status!==undefined&&value.status!=='candidate'||value.reviewState!==undefined&&value.reviewState!=='unreviewed') throw new Error('Invalid pricing authority');
  const observed=timestamp(value.observedAt),collected=timestamp(value.collectedAt),expires=timestamp(value.expiresAt);
  if(observed>collected||collected>nowMs||expires<=observed||expires-observed>90*86400000) throw new Error('Invalid pricing chronology');
  if(typeof value.sourceDigest!=='string'||!/^[a-f0-9]{64}$/.test(value.sourceDigest)) throw new Error('Invalid pricing source digest');
  if(typeof value.region!=='string'||!/^[A-Z]{2}$/.test(value.region)) throw new Error('Invalid pricing region');
  if(value.currency!==null&&!currencies.has(value.currency)) throw new Error('Invalid pricing currency');
  return json({kind:'manual-pricing-observation-v1',id:id(value.id),productId:id(value.productId),claimId:id(value.claimId),agentId:id(value.agentId),sourceId:id(value.sourceId),sourceUrl:canonicalCandidateUrl(value.sourceUrl),sourceDigest:value.sourceDigest,observedAt:value.observedAt,collectedAt:value.collectedAt,expiresAt:value.expiresAt,plan:text(value.plan,100),region:value.region,currency:value.currency,amountMinor:value.amountMinor===null?null:integer(value.amountMinor,0,1000000000000),billingPeriod:choice(value.billingPeriod,['month','year','one-time','usage','unknown']),unit:choice(value.unit,['seat','workspace','organization','usage-unit','unknown']),taxTreatment:choice(value.taxTreatment,['included','excluded','unknown']),manualReference:text(value.manualReference,128),status:'candidate',reviewState:'unreviewed'});
}

export function pricingClaimStatement(value,options={}) {
  return text(pricingClaimPrefix+JSON.stringify(normalizePricingObservation(value,options)),2000);
}

export async function isCurrentPricingBinding(tx,record) {
  const rows=(await tx.db.execute(sql`SELECT c.product_id,c.statement,e.source_url,e.source_digest,e.collected_at,
    EXISTS(SELECT FROM public.evidence_revocations r WHERE r.organization_id=e.organization_id AND r.source_id=e.id) AS revoked,
    floor(extract(epoch FROM clock_timestamp())*1000)::bigint AS now_ms
    FROM public.product_claims c JOIN public.claim_evidence ce ON ce.organization_id=c.organization_id AND ce.product_id=c.product_id AND ce.claim_id=c.id
    JOIN public.evidence_sources e ON e.organization_id=ce.organization_id AND e.product_id=ce.product_id AND e.id=ce.source_id
    JOIN public.agents a ON a.organization_id=c.organization_id AND a.id=${record.agentId}
    WHERE c.organization_id=${tx.scope.organizationId} AND c.id=${record.claimId} AND e.id=${record.sourceId}`)).rows;
  if(rows.length!==1) return false;
  const row=rows[0];
  return row.product_id===record.productId&&row.source_url===record.sourceUrl&&row.source_digest===record.sourceDigest&&new Date(row.collected_at).toISOString()===record.collectedAt&&!row.revoked&&row.statement===pricingClaimStatement(record,{nowMs:Number(row.now_ms)});
}

async function binding(tx,record) {
  if(!await isCurrentPricingBinding(tx,record)) throw fail();
}

export function createPricingHistoryService(options) {
  fields(options,['identity']);const {identity}=options;
  const safe=work=>async(...args)=>{try{return await work(...args);}catch{throw fail();}};
  const run=(handle,work)=>withAuthenticatedTransaction(identity,handle,false,async(tx,principal)=>{
    await tx.db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${tx.scope.organizationId}),hashtext('claim-lifecycle-v1'))`);
    return work(tx,principal);
  });
  return Object.freeze({
    record:safe(async(handle,input)=>{
      const record=normalizePricingObservation(input),recordDigest=digest(record);
      return run(handle,async(tx,principal)=>{
        await binding(tx,record);
        const prior=(await tx.db.execute(sql`SELECT record_digest FROM public.pricing_observations WHERE organization_id=${tx.scope.organizationId} AND id=${record.id}`)).rows[0];
        if(prior) {
          if(prior.record_digest!==recordDigest) throw fail();
          return Object.freeze({id:record.id,replayed:true});
        }
        const count=(await tx.db.execute(sql`SELECT count(*) AS count FROM public.pricing_observations WHERE organization_id=${tx.scope.organizationId} AND product_id=${record.productId}`)).rows[0];
        if(Number(count.count)>=100) throw fail();
        await tx.db.execute(sql`INSERT INTO public.pricing_observations(organization_id,id,product_id,claim_id,agent_id,source_id,observed_at,collected_at,expires_at,record,record_digest,actor_id)
          VALUES (${tx.scope.organizationId},${record.id},${record.productId},${record.claimId},${record.agentId},${record.sourceId},${record.observedAt},${record.collectedAt},${record.expiresAt},${JSON.stringify(record)}::jsonb,${recordDigest},${principal.userId})`);
        const auditId='pricing-'+randomUUID();
        await tx.db.execute(sql`INSERT INTO public.audit_events(organization_id,id,actor_id,request_id,action,target_id) VALUES (${tx.scope.organizationId},${auditId},${principal.userId},${tx.scope.requestId},'pricing-observation-recorded',${record.id})`);
        await tx.db.execute(sql`INSERT INTO public.outbox_events(organization_id,id,audit_id,kind) VALUES (${tx.scope.organizationId},${'pricing-'+randomUUID()},${auditId},'pricing-observation-recorded')`);
        await binding(tx,record);
        return Object.freeze({id:record.id,replayed:false});
      });
    }),
    history:safe(async(handle,input)=>{
      fields(input,['productId']);const productId=id(input.productId);
      return run(handle,async tx=>{
        const product=(await tx.db.execute(sql`SELECT id FROM public.products WHERE organization_id=${tx.scope.organizationId} AND id=${productId}`)).rows;
        if(product.length!==1) throw fail();
        return readPricingHistory(tx,productId);
      });
    }),
  });
}

export async function readPricingHistory(tx,productId) {
  const rows=(await tx.db.execute(sql`SELECT id,product_id,claim_id,agent_id,source_id,observed_at,collected_at,expires_at,record,record_digest,floor(extract(epoch FROM statement_timestamp())*1000)::bigint AS now_ms
    FROM public.pricing_observations WHERE organization_id=${tx.scope.organizationId} AND product_id=${productId} ORDER BY observed_at,id LIMIT 101`)).rows;
  if(rows.length>100) throw fail();
  return Object.freeze(rows.map(row=>{
    const record=normalizePricingObservation(row.record,{nowMs:Number(row.now_ms)});
    if(row.id!==record.id||row.product_id!==record.productId||row.claim_id!==record.claimId||row.agent_id!==record.agentId||row.source_id!==record.sourceId||new Date(row.observed_at).toISOString()!==record.observedAt||new Date(row.collected_at).toISOString()!==record.collectedAt||new Date(row.expires_at).toISOString()!==record.expiresAt||row.record_digest!==digest(record)) throw fail();
    return record;
  }));
}
