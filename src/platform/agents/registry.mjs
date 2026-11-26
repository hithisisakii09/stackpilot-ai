import {classifyAction} from '../contracts/actions.mjs';
import {fields,id,text,choice,limits,integer,dataArray,invalid} from '../contracts/validation.mjs';
import {DEFAULT_AGENT_DEFINITIONS} from './roles.mjs';

const tools=Object.freeze({'analysis-report':'score-market','market-research':'research-market','candidate-research':'discover-products','evidence-inspection':'inspect-evidence','evidence-intake':'collect-evidence','customer-analysis':'analyze-customer','content-draft':'draft-content','partner-research':'research-affiliate','proposal-draft':'draft-proposal','test-report':'run-tests','code-proposal':'prepare-code-change','documentation-draft':'draft-documentation'});
const pipelines=Object.freeze({executive:'analysis',market:'research',product:'research',customer:'analysis',growth:'analysis',revenue:'research',engineering:'engineering'});
function array(value){
 const parsed=dataArray(value,16).map(id);
 if(new Set(parsed).size!==parsed.length)invalid();return Object.freeze(parsed);
}
function definition(value){
 fields(value,['schemaVersion','version','id','role','responsibility','group','pipeline','capabilities','tools','inputContract','outputContract','enabled','status','costINR','limits']);
 const group=choice(value.group,Object.keys(pipelines));
 if(value.schemaVersion!==1||value.status!=='disabled-no-handler'||value.pipeline!==pipelines[group]||value.enabled!==false||value.costINR!==0||value.inputContract!=='task-input-v1'||value.outputContract!=='artifact-v1')invalid();
 const capabilities=array(value.capabilities),selectedTools=array(value.tools);
 if(capabilities.some(x=>classifyAction(x)!=='allowed')||selectedTools.some(x=>!Object.hasOwn(tools,x)||!capabilities.includes(tools[x])))invalid();
 return Object.freeze({schemaVersion:1,version:integer(value.version,1,1000000),id:id(value.id),role:text(value.role,100),responsibility:text(value.responsibility,300),group,pipeline:value.pipeline,capabilities,tools:selectedTools,inputContract:value.inputContract,outputContract:value.outputContract,enabled:false,status:'disabled-no-handler',costINR:0,limits:limits(value.limits)});
}
export function createAgentRegistry(definitions=DEFAULT_AGENT_DEFINITIONS){
 const entries=new Map();
 for(const candidate of dataArray(definitions)){const value=definition(candidate);if(entries.has(value.id))invalid();entries.set(value.id,value);}
 return Object.freeze({
  list:()=>Object.freeze([...entries.values()]),
  get:key=>typeof key==='string'?entries.get(key)??null:null,
  register:value=>createAgentRegistry([...entries.values(),value]),
  configure:(key,patch)=>{
   const old=entries.get(key);if(!old)invalid();
   fields(patch,[],['tools','capabilities','limits','enabled']);
   const next=definition({...old,...patch,version:old.version+1});
   if(next.tools.some(x=>!old.tools.includes(x))||next.capabilities.some(x=>!old.capabilities.includes(x))||Object.keys(old.limits).some(x=>next.limits[x]>old.limits[x]))invalid();
   return createAgentRegistry([...entries.values()].map(x=>x.id===key?next:x));
  }
 });
}
