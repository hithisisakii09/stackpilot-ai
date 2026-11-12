import {ACTION_POLICIES} from '../contracts/actions.mjs';
import {parsePermissionRequest} from '../contracts/domain.mjs';

// All actors here are untrusted claims. No identity service, authority mint,
// caller-injected verifier or protected executor exists in Phase 1A.
const denied=(tier,reasons)=>Object.freeze({decision:'DENY',tier,permittedImmediately:false,requiresApprovalQueue:tier==='human_approval'||tier==='legal_review',reasons:Object.freeze(reasons),identityAuthenticated:false,canPublish:false,canMonetize:false,canSpend:false});
export function evaluateAction(value){
 let request;try{request=parsePermissionRequest(value);}catch{return denied('prohibited',['invalid-request']);}
 const {actor,organizationId,resource,action,scope}=request;
 const metadata=ACTION_POLICIES[action],reasons=[];
 if(actor.organizationId!==organizationId||resource.organizationId!==organizationId)reasons.push('organization-mismatch');
 if(resource.type!==metadata.resourceType)reasons.push('action-resource-mismatch');
 if(scope!==metadata.scope)reasons.push('scope-mismatch');
 if(actor.type==='agent'&&['approve-claim','decide-approval'].includes(action))reasons.push('agent-cannot-approve');
 if(metadata.tier==='prohibited')reasons.push('action-prohibited');
 reasons.push('identity-service-unavailable');
 return denied(metadata.tier,reasons);
}
