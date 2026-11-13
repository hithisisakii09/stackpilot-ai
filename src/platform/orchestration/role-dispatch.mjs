import {createAgentRegistry} from '../agents/registry.mjs';
import {fields,id} from '../contracts/validation.mjs';

const registry=createAgentRegistry();
const pipelines=Object.freeze({research:'research-intake',analysis:'analysis-editorial-proposal',engineering:'engineering-verification'});
const handlers=Object.freeze({research:'research-local-draft',analysis:'analysis-local-draft',engineering:'engineering-local-draft'});

function descriptor(role){
 return Object.freeze({roleId:role.id,pipeline:pipelines[role.pipeline],handler:handlers[role.pipeline],action:role.capabilities[0],costInr:0,enabled:false,limits:role.limits});
}

export function listRoleDispatches(){
 return Object.freeze(registry.list().map(descriptor));
}

export function resolveRoleDispatch(value){
 fields(value,['roleId'],['allowInDisposableScope']);
 const role=registry.get(id(value.roleId));
 if(!role||value.allowInDisposableScope!==true)throw new Error('Local role preparation unavailable');
 return descriptor(role);
}
