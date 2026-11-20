import {sql} from 'drizzle-orm';
import {fields,id,integer,dataArray,text} from '../contracts/validation.mjs';
import {normalizePricingObservation,pricingClaimStatement,pricingClaimPrefix,readPricingHistory,isCurrentPricingBinding} from './pricing-history.mjs';
import {withAuthenticatedTransaction} from '../identity/sessions.mjs';
import {inspectClaimLifecycle} from './claims.mjs';

const contextKeys=['plan','region','currency','billingPeriod','unit','taxTreatment'];
const fail=()=>new Error('Product projection operation failed');

export function projectPricingHistory(value) {
  fields(value,['observations','eligibleIds','nowMs']);
  const nowMs=integer(value.nowMs,Date.UTC(2000,0,1),4102444800000);
  const observations=dataArray(value.observations,100).map(record=>normalizePricingObservation(record,{nowMs}));
  if(new Set(observations.map(record=>record.id)).size!==observations.length) throw new Error('Duplicate pricing identity');
  const eligible=dataArray(value.eligibleIds,100).map(id);
  if(new Set(eligible).size!==eligible.length||eligible.some(selected=>!observations.some(record=>record.id===selected))) throw new Error('Unknown pricing eligibility');
  const groups=new Map();
  for(const record of observations) {
    const key=JSON.stringify(contextKeys.map(name=>record[name]));
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(record);
  }
  return Object.freeze([...groups].sort(([left],[right])=>left<right?-1:left>right?1:0).map(([,records])=>{
    records.sort((left,right)=>right.observedAt.localeCompare(left.observedAt));
    const latest=records.filter(record=>record.observedAt===records[0].observedAt),record=latest[0];
    let reason=null;
    if(latest.length!==1) reason='ambiguous-latest-observation';
    else if(new Date(record.expiresAt).getTime()<=nowMs) reason='observation-expired';
    else if(record.amountMinor===null||record.currency===null||[record.billingPeriod,record.unit,record.taxTreatment].includes('unknown')) reason='incomplete-price-context';
    else if(!eligible.includes(record.id)) reason='unreviewed-latest-observation';
    return Object.freeze({...Object.fromEntries(contextKeys.map(name=>[name,record[name]])),status:reason?'UNKNOWN':'reviewed-observation',amountMinor:reason?null:record.amountMinor,reason,observationIds:Object.freeze(latest.map(row=>row.id).sort()),expiresAt:record.expiresAt});
  }));
}

export function createProductProjectionService(options) {
  fields(options,['identity']);const {identity}=options;
  return Object.freeze({read:async(handle,input)=>{
    try {
      fields(input,['productId','agentId']);const productId=id(input.productId),agentId=id(input.agentId);
      return await withAuthenticatedTransaction(identity,handle,false,async tx=>{
        await tx.db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${tx.scope.organizationId}),hashtext('claim-lifecycle-v1'))`);
        const product=(await tx.db.execute(sql`SELECT id,name,website,status,affiliate_url FROM public.products WHERE organization_id=${tx.scope.organizationId} AND id=${productId}`)).rows[0];
        if(!product||product.status!=='candidate'||product.affiliate_url!==null) throw fail();
        const rows=(await tx.db.execute(sql`SELECT c.id,c.statement,c.caveat,c.version,e.status,e.agent_id FROM public.product_claims c LEFT JOIN LATERAL
          (SELECT status,agent_id FROM public.claim_lifecycle_events WHERE organization_id=c.organization_id AND claim_id=c.id ORDER BY version DESC LIMIT 1) e ON true
          WHERE c.organization_id=${tx.scope.organizationId} AND c.product_id=${productId} ORDER BY c.id LIMIT 21`)).rows;
        if(rows.length>20) throw fail();
        const observations=await readPricingHistory(tx,productId);
        const states=new Map();
        for(const row of rows) {
          if(row.status==='approved'&&row.agent_id===agentId) states.set(row.id,await inspectClaimLifecycle(tx,row.id,agentId));
        }
        const eligible=[];
        for(const record of observations) {
          const state=states.get(record.claimId),row=rows.find(row=>row.id===record.claimId);
          if(state?.effective.status==='approved'&&record.agentId===agentId&&state.current.snapshot.productId===record.productId&&state.current.snapshot.sourceIds.includes(record.sourceId)&&row.statement===pricingClaimStatement(record)&&await isCurrentPricingBinding(tx,record)) eligible.push(record.id);
        }
        const clock=(await tx.db.execute(sql`SELECT floor(extract(epoch FROM clock_timestamp())*1000)::bigint AS now_ms`)).rows[0];
        const nowMs=Number(clock.now_ms);
        const prices=projectPricingHistory({observations,eligibleIds:eligible,nowMs});
        const visiblePricingIds=new Set(prices.filter(price=>price.status==='reviewed-observation').flatMap(price=>price.observationIds));
        const visiblePricingClaims=new Set(observations.filter(record=>visiblePricingIds.has(record.id)).map(record=>record.claimId));
        const claims=[];
        for(const row of rows) {
          const state=states.get(row.id);
          if(state?.effective.status!=='approved'||row.statement.startsWith(pricingClaimPrefix)&&!visiblePricingClaims.has(row.id)) continue;
          claims.push(Object.freeze({id:row.id,statement:text(row.statement),caveat:text(row.caveat),version:row.version,expiresAt:new Date(state.latest.valid_until).toISOString()}));
        }
        for(const [claimId,state] of states) {
          const fresh=await inspectClaimLifecycle(tx,claimId,agentId);
          if(fresh.latest.id!==state.latest.id||fresh.effective.status!==state.effective.status||fresh.current.snapshot.payloadDigest!==state.current.snapshot.payloadDigest||fresh.current.snapshot.evidenceDigest!==state.current.snapshot.evidenceDigest) throw fail();
        }
        for(const record of observations) {
          if(eligible.includes(record.id)&&!await isCurrentPricingBinding(tx,record)) throw fail();
        }
        const pricing=Object.freeze(prices.map(price=>{
          if(price.status!=='reviewed-observation') return price;
          const record=observations.find(row=>row.id===price.observationIds[0]),state=states.get(record.claimId);
          return Object.freeze({...price,expiresAt:new Date(Math.min(new Date(price.expiresAt).getTime(),new Date(state.latest.valid_until).getTime())).toISOString()});
        }));
        const result=Object.freeze({product:Object.freeze({id:product.id,name:text(product.name,100),website:product.website}),generatedAt:new Date(nowMs).toISOString(),claims:Object.freeze(claims),pricing});
        if(Buffer.byteLength(JSON.stringify(result))>65536) throw fail();
        return result;
      });
    } catch {throw fail();}
  }});
}
