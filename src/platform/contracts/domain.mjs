import {ACTION_POLICIES} from './actions.mjs';
import {fields,id,text,choice,limits,json,invalid} from './validation.mjs';

export const CLAIM_STATES=Object.freeze(['candidate','evidence-collected','needs-review','verified','approved','published','rejected','stale','reverification-required']);
const lockedPolicy=Object.freeze({policyVersion:1,monthlyBudgetINR:0,delegatedSpendINR:0,hostingCandidate:'netlify-free',commercialHostingApproved:false,productionLaunchApproved:true,affiliateActivationApproved:false,paidServicesApproved:false});
export function parseLockedPolicy(value){
 fields(value,Object.keys(lockedPolicy));
 if(Object.entries(lockedPolicy).some(([key,expected])=>value[key]!==expected))invalid();
 return Object.freeze({...lockedPolicy});
}
export function parseActor(value){
 fields(value,['id','organizationId','type']);
 return Object.freeze({id:id(value.id),organizationId:id(value.organizationId),type:choice(value.type,['user','agent','system'])});
}
export function parseResource(value){
 fields(value,['id','organizationId','type']);
 return Object.freeze({id:id(value.id),organizationId:id(value.organizationId),type:choice(value.type,['market','product','claim','content','partnership','repository','workflow','system'])});
}
export function parseAction(value){
 if(typeof value!=='string'||!Object.hasOwn(ACTION_POLICIES,value))invalid();return value;
}
function zero(value){if(value!==0||typeof value!=='number')invalid();return 0;}
export function parseTaskInput(value){
 fields(value,['schemaVersion','id','organizationId','agentId','action','resource','correlationId','idempotencyKey','costINR','input','limits']);
 if(value.schemaVersion!==1)invalid();
 const resource=parseResource(value.resource),action=parseAction(value.action),organizationId=id(value.organizationId);
 if(resource.organizationId!==organizationId||resource.type!==ACTION_POLICIES[action].resourceType)invalid();
 return Object.freeze({schemaVersion:1,id:id(value.id),organizationId,agentId:id(value.agentId),action,resource,correlationId:id(value.correlationId),idempotencyKey:id(value.idempotencyKey),costINR:zero(value.costINR),input:json(value.input),limits:limits(value.limits)});
}
export function parseArtifact(value){
 fields(value,['schemaVersion','id','organizationId','taskId','type','payload']);if(value.schemaVersion!==1)invalid();
 return Object.freeze({schemaVersion:1,id:id(value.id),organizationId:id(value.organizationId),taskId:id(value.taskId),type:choice(value.type,['research-note','analysis','draft','test-report','code-proposal']),payload:json(value.payload)});
}
function timestamp(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))invalid();
 const date=new Date(value);if(!Number.isFinite(date.getTime())||date.toISOString()!==value)invalid();return value;
}
// Optional reference clock is caller configuration for deterministic analysis,
// not authenticated time or evidence of source collection/verification.
export function parseCandidateEvidence(value,options={}){
 fields(options,[],['now']);
 const now=Object.hasOwn(options,'now')?options.now:new Date().toISOString();
 fields(value,['schemaVersion','id','organizationId','productId','sourceUrl','collectedAt','statement','status']);
 if(value.schemaVersion!==1||value.status!=='candidate')invalid();
 const collectedAt=timestamp(value.collectedAt);if(collectedAt>timestamp(now))invalid();
 if(typeof value.sourceUrl!=='string'||value.sourceUrl.length>2048)invalid();
 let url;try{url=new URL(value.sourceUrl);}catch{invalid();}
 if(url.protocol!=='https:'||!url.hostname.includes('.')||url.username||url.password||url.port||url.search||url.hash||url.href!==value.sourceUrl)invalid();
 return Object.freeze({schemaVersion:1,id:id(value.id),organizationId:id(value.organizationId),productId:id(value.productId),sourceUrl:url.href,collectedAt,statement:text(value.statement),status:'candidate'});
}
export function parsePermissionRequest(value){
 fields(value,['schemaVersion','organizationId','actor','action','resource','scope','costINR','policy']);if(value.schemaVersion!==1)invalid();
 return Object.freeze({schemaVersion:1,organizationId:id(value.organizationId),actor:parseActor(value.actor),action:parseAction(value.action),resource:parseResource(value.resource),scope:choice(value.scope,['read','draft','inspect','review','publish','admin','spend']),costINR:zero(value.costINR),policy:parseLockedPolicy(value.policy)});
}
