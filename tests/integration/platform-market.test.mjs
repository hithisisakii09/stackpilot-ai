import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openLocalPool} from '../../src/platform/persistence/connection.mjs';
import {applyMigrations} from '../../src/platform/persistence/migrate.mjs';
import {createStore,importCandidates} from '../../src/platform/persistence/repositories.mjs';
import {openMarketObservationStore} from '../../src/platform/market/store.mjs';
import {prepareMarketImport} from '../../src/platform/market/observations.mjs';
import pg from 'pg';

const config=JSON.parse(process.env.STACKPILOT_TEST_DB??'null');
if(config?.database!=='stackpilot_market_test')throw new Error('Use disposable market harness');
const admin=await openLocalPool(config);
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const candidateInput={products:read('../../src/data/products.json'),evidenceLeads:read('../../src/data/evidence-leads.json'),claims:read('../../src/data/research-claims.json')};
const weights={'demand-index':1,'competition-index':1,'feasibility-index':1};
let market,source,initial;
const request=(key,observations)=>({idempotencyKey:key,observations});
function observation(metric,value,seriesId='market-'+metric){
 return {seriesId,revision:1,supersedesId:null,categoryId:source.category_id,subjectId:source.product_id,sourceId:source.source_id,sourceUrl:source.source_url,collectedAt:'2026-01-31T00:00:00.000Z',eventAt:'2026-01-30T12:00:00.000Z',metric,value,unit:'index-0-100',region:'IN',periodStart:'2026-01-01T00:00:00.000Z',periodEnd:'2026-01-30T00:00:00.000Z',evidenceDigest:source.source_digest,provenance:{method:'manual',reference:'synthetic-document'},missing:[]};
}

test('manual market observations under restricted PostgreSQL',async t=>{
 try{
  await t.test('explicit forward migration and existing candidate fixture initialization',async()=>{
   assert.deepEqual(await applyMigrations(admin,{targetVersion:6}),{version:6,applied:true});
   assert.deepEqual(await applyMigrations(admin,{targetVersion:6}),{version:6,applied:false});
   const app=await openLocalPool({...config,user:'stackpilot_app'});
   try{for(const organizationId of ['org-alpha','org-beta']){
    const context={organizationId,actorId:'fixture-owner',requestId:'fixture-request'};
    await createStore(app).transaction(context,r=>r.identity.createOrganization({name:organizationId}));
    await importCandidates(app,context,candidateInput);
   }}finally{await app.end();}
   source=(await admin.query("SELECT p.id AS product_id,p.category_id,s.id AS source_id,s.source_url,s.source_digest FROM products p JOIN evidence_sources s ON s.organization_id=p.organization_id AND s.product_id=p.id WHERE p.organization_id='org-alpha' ORDER BY p.id,s.id LIMIT 1")).rows[0];
   market=await openMarketObservationStore(config);
   initial=request('initial-market-import',[observation('demand-index',80),observation('competition-index',20),observation('feasibility-index',60)]);
  });
  await t.test('connection-free dry run, explicit apply and concurrent duplicate imports are idempotent',async()=>{
   const prepared=prepareMarketImport(initial);assert.equal(prepared.dryRun,true);
   const a=market.scope('org-alpha');await assert.rejects(a.apply(initial));
   const results=await Promise.all([a.apply(initial,{apply:true}),a.apply(initial,{apply:true})]);
   assert.equal(results.filter(x=>x.applied).length,1);assert.equal((await admin.query('SELECT count(*) FROM market_observations')).rows[0].count,'3');
   await assert.rejects(a.apply({...initial,observations:[{...initial.observations[0],value:2}]},{apply:true}));
  });
  await t.test('analysis is reproducible and tenant isolation protects reads, writes and source bindings',async()=>{
   const a=market.scope('org-alpha'),b=market.scope('org-beta');
   const result=await a.analyze({subjectIds:[source.product_id],weights,mode:'opportunity'});assert.equal(result.opportunities[0].score,73.33);assert.equal(result.opportunities[0].evidenceConfidence,'UNKNOWN');
   const mutableWeights={...weights};const analyzing=a.analyze({subjectIds:[source.product_id],weights:mutableWeights,mode:'opportunity'});mutableWeights['demand-index']=2;assert.equal((await analyzing).opportunities[0].score,73.33);
   assert.equal((await b.history(initial.observations[0].seriesId)).rows.length,0);assert.equal((await b.analyze({subjectIds:[source.product_id],weights,mode:'opportunity'})).opportunities.length,0);
   for(const patch of [{categoryId:'foreign-category'},{subjectId:'foreign-product'},{sourceId:'foreign-source'},{sourceUrl:'https://example.com/altered'},{evidenceDigest:'0'.repeat(64)}])await assert.rejects(a.apply(request('foreign-'+Object.keys(patch)[0].toLowerCase(),[{...initial.observations[0],seriesId:'foreign-series',...patch}]),{apply:true}));
   await admin.query("INSERT INTO evidence_sources(organization_id,id,product_id,source_url,collected_at,source_digest) VALUES ('org-beta','source-beta-only',$1,'https://example.com/beta-only',CURRENT_TIMESTAMP,repeat('b',64))",[source.product_id]);
   await assert.rejects(a.apply(request('real-foreign-source',[{...initial.observations[0],seriesId:'real-foreign-series',sourceId:'source-beta-only',sourceUrl:'https://example.com/beta-only',evidenceDigest:'b'.repeat(64)}]),{apply:true}));
  });
  await t.test('a whole multi-series revision batch and analysis observe consistent snapshots',async()=>{
   const a=market.scope('org-alpha'),prior=prepareMarketImport(initial).observations;
   const revisions=prior.map(record=>({...record,revision:2,supersedesId:record.id,id:undefined,value:record.metric==='competition-index'?10:90}));
   for(const record of revisions)delete record.id;
   const [analysis]=await Promise.all([a.analyze({subjectIds:[source.product_id],weights,mode:'opportunity'}),a.apply(request('revision-import',revisions),{apply:true})]);
   assert.ok([73.33,90].includes(analysis.opportunities[0].score));
   assert.equal((await a.analyze({subjectIds:[source.product_id],weights,mode:'opportunity'})).opportunities[0].score,90);
   const history=await a.history('market-demand-index');assert.equal(history.rows.length,2);assert.deepEqual(history.rows.map(x=>x.value),[80,90]);
   await assert.rejects(a.apply(request('bad-revision',[{...revisions[0],revision:3,supersedesId:'unknown-observation'}]),{apply:true}));
  });
  await t.test('caller mutation after an async operation starts cannot replace its captured request',async()=>{
   const b=market.scope('org-beta'),record=observation('demand-index',10,'captured-input-series');const input=request('captured-import',[record]);
   const pending=b.apply(input,{apply:true});record.value=99;await pending;
   assert.equal((await b.history(record.seriesId)).rows[0].value,10);
   const a=market.scope('org-alpha'),analysisInput={subjectIds:[source.product_id],weights:{...weights},mode:'opportunity'};
   const analyzing=a.analyze(analysisInput);analysisInput.mode='seasonal';await assert.doesNotReject(analyzing);
   assert.equal((await analyzing).mode,'opportunity');
  });
  await t.test('analysis source bindings come from the same statement snapshot as observations',async context=>{
   const query=pg.Client.prototype.query;let changed=false;
   const mocked=context.mock.method(pg.Client.prototype,'query',function(...args){
    const text=typeof args[0]==='string'?args[0]:args[0]?.text;
    const result=query.apply(this,args);
    if(!changed&&text?.includes('DISTINCT ON')&&text.includes('market_observations')&&result?.then){
     changed=true;
     return result.then(async rows=>{await admin.query("UPDATE evidence_sources SET source_digest=repeat('f',64) WHERE organization_id='org-alpha' AND id=$1",[source.source_id]);return rows;});
    }
    return result;
   });
   try{const result=await market.scope('org-alpha').analyze({subjectIds:[source.product_id],weights,mode:'opportunity'});assert.equal(result.opportunities[0].score,90);assert.equal(changed,true);}
   finally{mocked.mock.restore();await admin.query("UPDATE evidence_sources SET source_digest=$1 WHERE organization_id='org-alpha' AND id=$2",[source.source_digest,source.source_id]);}
  });
  await t.test('observation/audit/outbox writes roll back atomically on an actual database failure',async()=>{
   const a=market.scope('org-alpha'),before=(await admin.query('SELECT count(*) FROM market_observations')).rows[0].count;
   await admin.query("CREATE FUNCTION fixture_market_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='manual-market-imported' THEN RAISE EXCEPTION 'fixture'; END IF; RETURN NEW; END $$; CREATE TRIGGER fixture_market_failure BEFORE INSERT ON outbox_events FOR EACH ROW EXECUTE FUNCTION fixture_market_failure()");
   const input=request('rollback-market-import',[observation('demand-index',33,'rollback-market-series')]);
   try{await assert.rejects(a.apply(input,{apply:true}));assert.equal((await admin.query('SELECT count(*) FROM market_observations')).rows[0].count,before);}
   finally{await admin.query('DROP TRIGGER fixture_market_failure ON outbox_events; DROP FUNCTION fixture_market_failure()');}
   assert.equal((await a.apply(input,{apply:true})).applied,true);
  });
  await t.test('concurrent conflicting revisions permit one immutable successor and app role cannot rewrite history',async()=>{
   const a=market.scope('org-alpha');const original=observation('demand-index',40,'race-market-series');await a.apply(request('race-initial',[original]),{apply:true});
   const parent=prepareMarketImport(request('race-initial',[original])).observations[0];
   const outcome=await Promise.allSettled([41,42].map(value=>a.apply(request('race-revision-'+value,[{...original,revision:2,supersedesId:parent.id,value}]),{apply:true})));
   assert.equal(outcome.filter(x=>x.status==='fulfilled').length,1);assert.equal((await a.history(original.seriesId)).rows.length,2);
   const app=await openLocalPool({...config,user:'stackpilot_app'});
   try{await assert.rejects(app.query('UPDATE market_observations SET observation=observation'));await assert.rejects(app.query('DELETE FROM market_observations'));}finally{await app.end();}
  });
  await t.test('partial provenance and changed source bindings cannot become trusted market scores',async()=>{
   const a=market.scope('org-alpha');const partial={...observation('demand-index',10,'incomplete-series'),sourceId:null,evidenceDigest:null,provenance:{method:'manual',reference:null},missing:['sourceId','evidenceDigest','sourceReference']};
   await a.apply(request('partial-market-import',[partial]),{apply:true});
   const result=await a.analyze({subjectIds:[source.product_id],weights,mode:'opportunity'});assert.equal(result.opportunities[0].status,'UNKNOWN');
   await admin.query("UPDATE evidence_sources SET source_digest=repeat('f',64) WHERE organization_id='org-alpha' AND id=$1",[source.source_id]);
   try{await assert.rejects(a.analyze({subjectIds:[source.product_id],weights,mode:'opportunity'}));}
   finally{await admin.query("UPDATE evidence_sources SET source_digest=$1 WHERE organization_id='org-alpha' AND id=$2",[source.source_digest,source.source_id]);}
   assert.equal((await a.analyze({subjectIds:[source.product_id],weights,mode:'seasonal'})).status,'insufficient-evidence');
  });
 }finally{await market?.close();await admin.end();}
});
