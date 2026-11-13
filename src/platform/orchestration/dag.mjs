import {createHash} from 'node:crypto';
import {fields,id,dataArray,integer,choice,json} from '../contracts/validation.mjs';

export function digest(value){
 const canonical=x=>Array.isArray(x)?x.map(canonical):x!==null&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(key=>[key,canonical(x[key])])):x;
 return createHash('sha256').update(JSON.stringify(canonical(json(value)))).digest('hex');
}
export function validateDag(value){
 fields(value,['organizationId','tasks']);
 const organizationId=id(value.organizationId);
 const tasks=dataArray(value.tasks,20).map(task=>{
  fields(task,['id','dependencies']);
  return Object.freeze({id:id(task.id),dependencies:Object.freeze(dataArray(task.dependencies,20).map(id))});
 });
 if(!tasks.length||new Set(tasks.map(x=>x.id)).size!==tasks.length)throw new Error('Invalid DAG');
 const visited=new Set(),visiting=new Set(),byId=new Map(tasks.map(x=>[x.id,x]));
 function visit(key){
  if(visited.has(key))return;
  const task=byId.get(key);
  if(!task||visiting.has(key)||new Set(task.dependencies).size!==task.dependencies.length)throw new Error('Invalid DAG dependency');
  visiting.add(key);for(const dep of task.dependencies)visit(dep);visiting.delete(key);visited.add(key);
 }
 for(const task of tasks)visit(task.id);
 return Object.freeze({organizationId,tasks:Object.freeze(tasks)});
}
export const preparationWorkflow=Object.freeze({id:'synthetic-preparation-v1',version:1,tasks:Object.freeze([
 Object.freeze({id:'inspect-left',handler:'summarize',dependencies:Object.freeze([])}),
 Object.freeze({id:'inspect-right',handler:'summarize',dependencies:Object.freeze([])}),
 Object.freeze({id:'combine-results',handler:'combine',dependencies:Object.freeze(['inspect-left','inspect-right'])})
])});
export function parseSyntheticInput(value){
 return parseInput(value,false);
}
export function parseSyntheticTaskInput(value){
 return parseInput(value,true);
}
function parseInput(value,allowEmpty){
 fields(value,['items','scenario','delayMs']);
 const items=Object.freeze(dataArray(value.items,100).map(n=>integer(n,-10000,10000)));
 if(!allowEmpty&&!items.length)throw new Error('Missing synthetic input');
 return Object.freeze({items,scenario:choice(value.scenario,['normal','transient-first','transient-always','permanent','invalid-output','hang']),delayMs:integer(value.delayMs,0,2000)});
}
export function expectedOutput(work){
 fields(work,['handler','items','dependencies','scenario','delayMs']);
 const dependencies=json(work.dependencies);
 if(!['summarize','combine'].includes(work.handler))throw new Error('Unknown handler');
 const items=dataArray(work.items,100).map(n=>integer(n,-10000,10000));
 const data=work.handler==='summarize'?{count:items.length,total:items.reduce((a,b)=>a+b,0)}:{parts:dependencies};
 return Object.freeze({kind:'synthetic-preparation',digest:digest(data),data:json(data)});
}
