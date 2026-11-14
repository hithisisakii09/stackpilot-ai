import {sql} from 'drizzle-orm';
import {fields,id,integer,dataArray,json} from '../contracts/validation.mjs';
import {normalizeLocalConnection} from '../persistence/connection.mjs';
import {openPreparationStore,appendPreparationEvent} from '../orchestration/preparation-store.mjs';
import {digest} from '../orchestration/dag.mjs';
import {prepareMarketImport,normalizeMarketObservation,marketRecordKind} from './observations.mjs';
import {analyzeMarketObservations} from './scoring.mjs';

const opportunityId=record=>'opportunity-'+digest([record.categoryId,record.subjectId]).slice(0,48);

async function assertReferences(tx,record){
 const organizationId=tx.scope.organizationId;
 const product=(await tx.db.execute(sql`SELECT category_id FROM products WHERE organization_id=${organizationId} AND id=${record.subjectId}`)).rows[0];
 if(!product||product.category_id!==record.categoryId)throw new Error('Invalid market subject binding');
 if(record.sourceId!==null){
  const source=(await tx.db.execute(sql`SELECT id,source_url,source_digest FROM evidence_sources WHERE organization_id=${organizationId} AND product_id=${record.subjectId} AND id=${record.sourceId}`)).rows[0];
  if(!source||source.source_url!==record.sourceUrl||record.evidenceDigest!==null&&source.source_digest!==record.evidenceDigest)throw new Error('Invalid market source binding');
 }
}

function assertStored(row,record){
 if(row.id!==record.id||row.source_url!==record.sourceUrl||row.event_at!==record.eventAt||row.opportunity_id!==opportunityId(record)||row.status!=='candidate')throw new Error('Invalid market storage binding');
}

export async function openMarketObservationStore(value){
 const config=normalizeLocalConnection(value);
 if(config.database!=='stackpilot_market_test'||process.env.STACKPILOT_MARKET_TEST!=='1')throw new Error('Market observation store unavailable');
 const store=await openPreparationStore(config);
 try{await store.transaction('market-readiness',async tx=>{
  const index=(await tx.db.execute(sql`SELECT i.indisunique,i.indisvalid FROM pg_index i WHERE i.indexrelid=to_regclass('public.market_observations_manual_revision')`)).rows[0];
  if(!index?.indisunique||!index.indisvalid)throw new Error('Market migration unavailable');
 });}catch{await store.close();throw new Error('Market observation store unavailable');}

 function scope(organizationId){
  id(organizationId);
  return Object.freeze({
   async apply(input,options){
    fields(options,['apply']);if(options.apply!==true)throw new Error('Explicit market apply required');
    const captured=prepareMarketImport(input);
    return store.transaction(organizationId,async tx=>{
     const clock=(await tx.db.execute(sql`SELECT floor(extract(epoch FROM clock_timestamp())*1000)::bigint AS now_ms`)).rows[0];
     const prepared=prepareMarketImport({idempotencyKey:captured.idempotencyKey,observations:captured.observations},{nowMs:Number(clock.now_ms)});
     const key='market-import-'+digest(prepared.idempotencyKey).slice(0,48);
     const prior=(await tx.db.execute(sql`SELECT operation,source_digest,result FROM idempotency_keys WHERE organization_id=${organizationId} AND id=${key}`)).rows[0];
     if(prior){
      if(prior.operation!=='manual-market-import'||prior.source_digest!==prepared.sourceDigest)throw new Error('Market import conflict');
      return Object.freeze({applied:false,count:0,sourceDigest:prepared.sourceDigest,observationIds:Object.freeze(prior.result.observationIds)});
     }
     let count=0;
     for(const record of prepared.observations){
      await assertReferences(tx,record);
      const existing=(await tx.db.execute(sql`SELECT id,observation,source_url,opportunity_id,status,to_char(observed_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS event_at FROM market_observations WHERE organization_id=${organizationId} AND id=${record.id}`)).rows[0];
      if(existing){assertStored(existing,record);if(digest(existing.observation)!==digest(record))throw new Error('Immutable market observation conflict');continue;}
      const previous=(await tx.db.execute(sql`SELECT id,observation FROM market_observations WHERE organization_id=${organizationId} AND observation->>'kind'=${marketRecordKind} AND observation->>'seriesId'=${record.seriesId} ORDER BY (observation->>'revision')::integer DESC LIMIT 1`)).rows[0];
      if(previous){
       const ancestor=normalizeMarketObservation(previous.observation,Number(clock.now_ms));
       if(record.supersedesId!==ancestor.id||record.revision!==ancestor.revision+1||['categoryId','subjectId','sourceId','metric','region'].some(key=>ancestor[key]!==record[key]))throw new Error('Invalid market revision ancestry');
      }else if(record.revision!==1||record.supersedesId!==null)throw new Error('Missing market ancestor');
      const opportunity=opportunityId(record);
      await tx.db.execute(sql`INSERT INTO market_opportunities(organization_id,id,category_id,observation) VALUES (${organizationId},${opportunity},${record.categoryId},${JSON.stringify({kind:'manual-market-subject-v1',subjectId:record.subjectId})}::jsonb) ON CONFLICT DO NOTHING`);
      const binding=(await tx.db.execute(sql`SELECT category_id,observation FROM market_opportunities WHERE organization_id=${organizationId} AND id=${opportunity}`)).rows[0];
      if(binding.category_id!==record.categoryId||binding.observation.subjectId!==record.subjectId||binding.observation.kind!=='manual-market-subject-v1')throw new Error('Invalid market opportunity binding');
      await tx.db.execute(sql`INSERT INTO market_observations(organization_id,id,opportunity_id,source_url,observed_at,observation) VALUES (${organizationId},${record.id},${opportunity},${record.sourceUrl},${record.eventAt}::timestamptz AT TIME ZONE 'UTC',${JSON.stringify(record)}::jsonb)`);
      count++;
     }
     const observationIds=prepared.observations.map(record=>record.id);
     await tx.db.execute(sql`INSERT INTO idempotency_keys(organization_id,id,operation,source_digest,result) VALUES (${organizationId},${key},'manual-market-import',${prepared.sourceDigest},${JSON.stringify({observationIds,count})}::jsonb)`);
     await appendPreparationEvent(tx,'manual-market-imported',key);
     return Object.freeze({applied:count>0,count,sourceDigest:prepared.sourceDigest,observationIds:Object.freeze(observationIds)});
    });
   },
   async history(seriesId,options={}){
    id(seriesId);fields(options,[],['limit','afterRevision']);
    const limit=options.limit===undefined?20:integer(options.limit,1,50),after=options.afterRevision===undefined?0:integer(options.afterRevision,0,999);
    return store.transaction(organizationId,async tx=>{
     const rows=(await tx.db.execute(sql`SELECT observation FROM market_observations WHERE organization_id=${organizationId} AND observation->>'kind'=${marketRecordKind} AND observation->>'seriesId'=${seriesId} AND (observation->>'revision')::integer>${after} ORDER BY (observation->>'revision')::integer LIMIT ${limit+1}`)).rows;
     const selected=rows.slice(0,limit).map(row=>normalizeMarketObservation(row.observation));
     return Object.freeze({rows:Object.freeze(selected),nextRevision:rows.length>limit?selected.at(-1).revision:null});
    });
   },
   async analyze(value){
    fields(value,['subjectIds','weights','mode']);
    const subjects=dataArray(value.subjectIds,10).map(id);
    if(!subjects.length||new Set(subjects).size!==subjects.length)throw new Error('Invalid analysis subjects');
    const weights=json(value.weights),mode=value.mode;
    analyzeMarketObservations({observations:[],weights,mode});
    return store.transaction(organizationId,async tx=>{
     const selected=sql.join(subjects.map(subject=>sql`${subject}`),sql`, `);
     const present=(await tx.db.execute(sql`SELECT id FROM products WHERE organization_id=${organizationId} AND id IN (${selected})`)).rows;
     if(present.length!==subjects.length)throw new Error('Unknown market subject');
     const records=(await tx.db.execute(sql`SELECT m.*,p.category_id AS current_category,e.id AS current_source_id,e.source_url AS current_source_url,e.source_digest AS current_digest,o.category_id AS opportunity_category,o.observation AS opportunity_binding,floor(extract(epoch FROM statement_timestamp())*1000)::bigint AS now_ms
      FROM (SELECT DISTINCT ON (observation->>'seriesId') id,observation,source_url,opportunity_id,status,to_char(observed_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS event_at FROM market_observations WHERE organization_id=${organizationId} AND observation->>'kind'=${marketRecordKind} AND observation->>'subjectId' IN (${selected}) ORDER BY observation->>'seriesId',(observation->>'revision')::integer DESC LIMIT 101) m
      LEFT JOIN products p ON p.organization_id=${organizationId} AND p.id=m.observation->>'subjectId'
      LEFT JOIN evidence_sources e ON e.organization_id=${organizationId} AND e.product_id=p.id AND e.id=m.observation->>'sourceId'
      LEFT JOIN market_opportunities o ON o.organization_id=${organizationId} AND o.id=m.opportunity_id`)).rows;
     if(records.length>100)throw new Error('Market analysis observation limit');
     const observations=[];
     for(const row of records){
      const record=normalizeMarketObservation(row.observation,Number(row.now_ms));assertStored(row,record);
      if(row.current_category!==record.categoryId||row.opportunity_category!==record.categoryId||row.opportunity_binding?.kind!=='manual-market-subject-v1'||row.opportunity_binding.subjectId!==record.subjectId)throw new Error('Invalid market subject snapshot');
      if(record.sourceId!==null&&(row.current_source_id!==record.sourceId||row.current_source_url!==record.sourceUrl||record.evidenceDigest!==null&&row.current_digest!==record.evidenceDigest))throw new Error('Changed market source snapshot');
      observations.push(record);
     }
     const nowMs=records.length?Number(records[0].now_ms):Date.now();
     return Object.freeze({...analyzeMarketObservations({observations,weights,mode},{nowMs}),snapshotAt:new Date(nowMs).toISOString()});
    });
   }
  });
 }
 return Object.freeze({scope,close:()=>store.close()});
}
