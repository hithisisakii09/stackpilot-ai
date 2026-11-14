import {fields,dataArray,integer} from '../contracts/validation.mjs';
import {digest} from '../orchestration/dag.mjs';
import {normalizeMarketObservation,marketMetrics,compareKeys,validateSeriesRevisions} from './observations.mjs';

function normalizeWeights(value){
 fields(value,marketMetrics);
 for(const metric of marketMetrics)if(typeof value[metric]!=='number'||!Number.isFinite(value[metric])||value[metric]<0.000001||value[metric]>1000000)throw new Error('Invalid market weight');
 const total=marketMetrics.reduce((sum,metric)=>sum+value[metric],0);
 return Object.freeze(Object.fromEntries(marketMetrics.map(metric=>[metric,value[metric]/total])));
}

export function analyzeMarketObservations(value,options={}){
 fields(value,['observations','weights','mode']);fields(options,[],['nowMs']);
 const weights=normalizeWeights(value.weights);
 if(!['opportunity','seasonal','historical'].includes(value.mode))throw new Error('Unsupported comparison type');
 const nowMs=options.nowMs===undefined?Date.now():integer(options.nowMs,Date.UTC(2000,0,1),4102444800000);
 const records=dataArray(value.observations,100).map(record=>normalizeMarketObservation(record,nowMs));
 validateSeriesRevisions(records);
 const latest=new Map();const identities=new Map();
 for(const record of records){
  if(identities.has(record.id)&&digest(identities.get(record.id))!==digest(record))throw new Error('Conflicting market revision');
  identities.set(record.id,record);
  const prior=latest.get(record.seriesId);
  if(!prior||prior.revision<record.revision)latest.set(record.seriesId,record);
 }
 const observations=[...latest.values()].sort((a,b)=>compareKeys(a.id,b.id));
 const formulaVersion='market-opportunity-v1';
 const inputDigest=digest({formulaVersion,mode:value.mode,weights,observations:observations.map(record=>digest(record))});
 if(value.mode!=='opportunity')return Object.freeze({status:'insufficient-evidence',reason:'comparable-history-and-reviewed-method-required',mode:value.mode,inputDigest,opportunities:Object.freeze([])});
 const groups=new Map();
 for(const record of observations){
  const key=JSON.stringify([record.categoryId,record.subjectId,record.region]);
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(record);
 }
 const opportunities=[];
 for(const [key,group] of groups){
  const first=group[0],reasons=[];
  const coverage={requiredMetrics:marketMetrics.length,presentMetrics:new Set(group.map(record=>record.metric)).size,observationCount:group.length};
  if(coverage.presentMetrics!==marketMetrics.length)reasons.push('missing-metrics');
  if(group.some(record=>record.missing.length))reasons.push('missing-information');
  if(group.some(record=>record.unit!=='index-0-100'))reasons.push('incompatible-units');
  if(new Set(group.map(record=>JSON.stringify([record.periodStart,record.periodEnd]))).size!==1)reasons.push('incompatible-periods');
  const normalized={};
  for(const metric of marketMetrics){
   const sources=group.filter(record=>record.metric===metric);
   const values=new Set(sources.map(record=>record.value));
   if(values.size>1)reasons.push('contradictory-'+metric);
   if(values.size===1&&!values.has(null))normalized[metric]=metric==='competition-index'?100-sources[0].value:sources[0].value;
  }
  const score=reasons.length?null:Math.round(marketMetrics.reduce((sum,metric)=>sum+normalized[metric]*weights[metric],0)*100)/100;
  opportunities.push(Object.freeze({key,categoryId:first.categoryId,subjectId:first.subjectId,region:first.region,periodStart:first.periodStart,periodEnd:first.periodEnd,status:score===null?'UNKNOWN':'provisional',score,evidenceConfidence:'UNKNOWN',reviewState:'unreviewed',formulaVersion,weights,normalized:Object.freeze(normalized),coverage:Object.freeze(coverage),observationIds:Object.freeze(group.map(record=>record.id).sort(compareKeys)),inputDigest:digest({formulaVersion,mode:value.mode,weights,observations:group.map(record=>digest(record))}),reasons:Object.freeze(reasons),reviewRequirements:Object.freeze(['independent-source-review','observation-review'])}));
 }
 opportunities.sort((a,b)=>a.score===null&&b.score!==null?1:b.score===null&&a.score!==null?-1:(b.score??0)-(a.score??0)||compareKeys(a.key,b.key));
 return Object.freeze({status:opportunities.length?'candidate-analysis':'insufficient-evidence',mode:value.mode,inputDigest,opportunities:Object.freeze(opportunities)});
}
