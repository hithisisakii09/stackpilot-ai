import {fields,id,text,integer,dataArray,json} from '../contracts/validation.mjs';
import {digest} from '../orchestration/dag.mjs';

export const marketMetrics=Object.freeze(['demand-index','competition-index','feasibility-index']);
export const marketRecordKind='manual-market-observation-v1';
const required=['seriesId','revision','supersedesId','categoryId','subjectId','sourceId','sourceUrl','collectedAt','eventAt','metric','value','unit','region','periodStart','periodEnd','evidenceDigest','provenance','missing'];
const missingNames=['sourceId','evidenceDigest','sourceReference','value','unit','region','period'];
export const compareKeys=(left,right)=>left<right?-1:left>right?1:0;

function utcDate(value,nowMs){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))throw new Error('Invalid market timestamp');
 const time=Date.parse(value);
 if(!Number.isFinite(time)||time<Date.UTC(2000,0,1)||time>nowMs||new Date(time).toISOString()!==value)throw new Error('Invalid market timestamp');
 return value;
}

export function normalizeMarketObservation(value,nowMs=Date.now()){
 integer(nowMs,Date.UTC(2000,0,1),4102444800000);
 fields(value,required,['id','kind','status','reviewState']);
 if(value.kind!==undefined&&value.kind!==marketRecordKind||value.status!==undefined&&value.status!=='candidate'||value.reviewState!==undefined&&value.reviewState!=='unreviewed')throw new Error('Invalid market authority');
 const result={kind:marketRecordKind,seriesId:id(value.seriesId),revision:integer(value.revision,1,999),supersedesId:value.supersedesId===null?null:id(value.supersedesId),categoryId:id(value.categoryId),subjectId:id(value.subjectId),sourceId:value.sourceId===null?null:id(value.sourceId)};
 if((result.revision===1)!==(result.supersedesId===null))throw new Error('Invalid market revision');
 if(typeof value.sourceUrl!=='string'||value.sourceUrl.length>2048||/[\s\\\x00-\x1f\x7f]/.test(value.sourceUrl))throw new Error('Invalid market URL');
 let url;try{url=new URL(value.sourceUrl);}catch{throw new Error('Invalid market URL');}
 if(url.protocol!=='https:'||url.username||url.password||url.hash||url.search||url.port||url.href!==value.sourceUrl||!url.hostname.includes('.'))throw new Error('Invalid market URL');
 result.sourceUrl=value.sourceUrl;
 result.collectedAt=utcDate(value.collectedAt,nowMs);result.eventAt=utcDate(value.eventAt,nowMs);
 if(result.eventAt>result.collectedAt)throw new Error('Invalid observation chronology');
 if(!marketMetrics.includes(value.metric))throw new Error('Unsupported market metric');
 result.metric=value.metric;
 if(value.unit!==null&&!['index-0-100','percent','count'].includes(value.unit))throw new Error('Invalid market unit');
 if(value.value!==null&&(typeof value.value!=='number'||!Number.isFinite(value.value)||value.value<0||value.value>(value.unit==='count'?1000000000:100)))throw new Error('Invalid market value');
 if(value.unit==='count'&&value.value!==null&&!Number.isSafeInteger(value.value))throw new Error('Invalid count observation');
 result.value=value.value;result.unit=value.unit;
 if(value.region!==null&&(typeof value.region!=='string'||!/^[A-Z]{2,6}$/.test(value.region)))throw new Error('Invalid market region');
 result.region=value.region;
 if((value.periodStart===null)!==(value.periodEnd===null))throw new Error('Incomplete comparison period');
 result.periodStart=value.periodStart===null?null:utcDate(value.periodStart,nowMs);
 result.periodEnd=value.periodEnd===null?null:utcDate(value.periodEnd,nowMs);
 if(result.periodStart!==null&&(result.periodStart>result.periodEnd||result.periodEnd>result.eventAt))throw new Error('Invalid comparison period');
 if(value.evidenceDigest!==null&&(typeof value.evidenceDigest!=='string'||!/^[a-f0-9]{64}$/.test(value.evidenceDigest)))throw new Error('Invalid market evidence digest');
 result.evidenceDigest=value.evidenceDigest;
 fields(value.provenance,['method','reference']);
 if(value.provenance.method!=='manual')throw new Error('Invalid market provenance');
 result.provenance={method:'manual',reference:value.provenance.reference===null?null:text(value.provenance.reference,128)};
 const missing=[];
 for(const key of missingNames){
  const absent=key==='sourceReference'?result.provenance.reference===null:key==='period'?result.periodStart===null:result[key]===null;
  if(absent)missing.push(key);
 }
 const declared=dataArray(value.missing,missingNames.length).map(key=>{if(!missingNames.includes(key))throw new Error('Unknown missing field');return key;}).sort(compareKeys);
 missing.sort(compareKeys);
 if(JSON.stringify(declared)!==JSON.stringify(missing))throw new Error('Missing information mismatch');
 result.missing=missing;result.status='candidate';result.reviewState='unreviewed';
 result.id='observation-'+digest({seriesId:result.seriesId,revision:result.revision}).slice(0,48);
 if(value.id!==undefined&&value.id!==result.id)throw new Error('Invalid observation identity');
 return json(result);
}

export function prepareMarketImport(value,options={}){
 fields(value,['idempotencyKey','observations']);fields(options,[],['nowMs']);
 const nowMs=options.nowMs===undefined?Date.now():integer(options.nowMs,Date.UTC(2000,0,1),4102444800000);
 const observations=dataArray(value.observations,10).map(record=>normalizeMarketObservation(record,nowMs));
 if(!observations.length||new Set(observations.map(record=>record.id)).size!==observations.length)throw new Error('Invalid market batch');
 observations.sort((a,b)=>compareKeys(a.seriesId,b.seriesId)||a.revision-b.revision);
 validateSeriesRevisions(observations);
 return Object.freeze({idempotencyKey:id(value.idempotencyKey),observations:Object.freeze(observations),sourceDigest:digest(observations.map(record=>digest(record))),dryRun:true});
}

export function validateSeriesRevisions(records){
 const series=new Map();
 const sorted=[...records].sort((a,b)=>compareKeys(a.seriesId,b.seriesId)||a.revision-b.revision);
 for(const record of sorted){
  const prior=series.get(record.seriesId);
  if(prior){
   if(record.id===prior.id&&digest(record)===digest(prior))continue;
   if(['categoryId','subjectId','sourceId','metric','region'].some(key=>prior[key]!==record[key])||record.revision!==prior.revision+1||record.supersedesId!==prior.id)throw new Error('Inconsistent market series history');
  }
  series.set(record.seriesId,record);
 }
}
