// Data validation only. No identity, approval, I/O or execution authority.
import {types} from 'node:util';
export function invalid(){throw new Error('Invalid platform contract');}
export function fields(value,required,optional=[]){
 if(value===null||typeof value!=='object'||types.isProxy(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))invalid();
 const descriptors=Object.getOwnPropertyDescriptors(value);
 const keys=Reflect.ownKeys(descriptors);
 if(required.some(k=>!Object.hasOwn(descriptors,k))||keys.some(k=>typeof k!=='string'||!required.includes(k)&&!optional.includes(k)||!Object.hasOwn(descriptors[k],'value')||!descriptors[k].enumerable))invalid();
 return value;
}
export function id(value){
 if(typeof value!=='string'||value.length<3||value.length>64||!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value))invalid();
 return value;
}
export function text(value,max=2000){
 if(typeof value!=='string'||!value.trim()||value.trim()!==value||value.length>max||/[<>\x00-\x1f\x7f]/.test(value))invalid();
 return value;
}
export function choice(value,allowed){if(!allowed.includes(value))invalid();return value;}
export function integer(value,min,max){if(!Number.isSafeInteger(value)||value<min||value>max)invalid();return value;}
export function dataArray(value,max=100){
 if(types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)invalid();
 const descriptors=Object.getOwnPropertyDescriptors(value),length=descriptors.length.value;
 if(length>max||Reflect.ownKeys(descriptors).length!==length+1)invalid();
 const result=[];
 for(let i=0;i<length;i++){
  const d=descriptors[i];if(!d||!Object.hasOwn(d,'value')||!d.enumerable)invalid();result.push(d.value);
 }
 return result;
}
export function limits(value){
 fields(value,['maxConcurrent','maxTasks','maxAttempts','timeoutMs','maxOutputBytes']);
 return Object.freeze({maxConcurrent:integer(value.maxConcurrent,1,2),maxTasks:integer(value.maxTasks,1,20),maxAttempts:integer(value.maxAttempts,1,3),timeoutMs:integer(value.timeoutMs,1,300000),maxOutputBytes:integer(value.maxOutputBytes,1,65536)});
}
export function json(value){
 let nodes=0;const seen=new WeakSet();
 function copy(x,depth){
  if(++nodes>500||depth>5)invalid();
  if(x===null||typeof x==='boolean')return x;
  if(typeof x==='number'){if(!Number.isFinite(x))invalid();return x;}
  if(typeof x==='string'){if(x.length>4096||/[<>\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(x))invalid();return x;}
  if(typeof x!=='object'||types.isProxy(x)||seen.has(x))invalid();seen.add(x);
  const descriptors=Object.getOwnPropertyDescriptors(x),keys=Reflect.ownKeys(descriptors);
  if(Array.isArray(x)){
   return Object.freeze(dataArray(x).map(value=>copy(value,depth+1)));
  }
  if(![Object.prototype,null].includes(Object.getPrototypeOf(x))||keys.length>100)invalid();
  const result=[];
  for(const key of keys){
   const d=descriptors[key];
   if(typeof key!=='string'||['__proto__','prototype','constructor'].includes(key)||!key||/[<>\x00-\x1f\x7f]/.test(key)||key.length>64||!Object.hasOwn(d,'value')||!d.enumerable)invalid();
   result.push([key,copy(d.value,depth+1)]);
  }
  return Object.freeze(Object.fromEntries(result));
 }
 const result=copy(value,0);
 if(new TextEncoder().encode(JSON.stringify(result)).length>16384)invalid();
 return result;
}
