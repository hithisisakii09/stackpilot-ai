import {fields, id, integer, choice, json} from '../contracts/validation.mjs';

export const claimLifecycleStates = Object.freeze(['candidate','evidence-collected','needs-review','verified','approved','rejected','stale','reverification-required']);
const edges = Object.freeze({
  candidate:['evidence-collected'],
  'evidence-collected':['needs-review','stale','reverification-required'],
  'needs-review':['verified','rejected','stale','reverification-required'],
  verified:['approved','stale','reverification-required'],
  approved:['stale','reverification-required'],
  rejected:['evidence-collected'],
  stale:['evidence-collected'],
  'reverification-required':['evidence-collected'],
});

export function normalizeLifecycleInput(value) {
  fields(value, ['claimId','agentId','expectedVersion','idempotencyKey','to'], ['expiresAt','requestId']);
  const result = {claimId:id(value.claimId), agentId:id(value.agentId), expectedVersion:integer(value.expectedVersion,0,99), idempotencyKey:id(value.idempotencyKey), to:choice(value.to,claimLifecycleStates)};
  if (result.to === 'evidence-collected') {
    if (Object.hasOwn(value,'requestId')) throw new Error('Invalid lifecycle input');
    const time = typeof value.expiresAt === 'string' ? Date.parse(value.expiresAt) : NaN;
    if (!Number.isFinite(time) || new Date(time).toISOString() !== value.expiresAt) throw new Error('Invalid lifecycle expiry');
    result.expiresAt = value.expiresAt;
  } else {
    if (Object.hasOwn(value,'expiresAt')) throw new Error('Invalid lifecycle input');
    if (result.to === 'needs-review') result.requestId = id(value.requestId);
    else if (Object.hasOwn(value,'requestId')) throw new Error('Invalid lifecycle input');
  }
  return json(result);
}

export function evaluateClaimTransition(value) {
  fields(value, ['from','to','role','decision','requesterUserId','actorId','current']);
  choice(value.from,claimLifecycleStates); choice(value.to,claimLifecycleStates);
  choice(value.role,['owner','reviewer']); id(value.actorId);
  if (value.requesterUserId !== null) id(value.requesterUserId);
  choice(value.decision,[null,'approved','rejected','revoked']);
  if (typeof value.current !== 'boolean' || !edges[value.from].includes(value.to)) throw new Error('Invalid lifecycle transition');
  if (['stale','reverification-required'].includes(value.to)) {
    if (value.current) throw new Error('Current evidence cannot be invalidated');
    return value.to;
  }
  if (value.to === 'evidence-collected') return value.to;
  if (!value.current) throw new Error('Stale lifecycle binding');
  if (['verified','approved','rejected'].includes(value.to)) {
    const required = value.to === 'rejected' ? 'rejected' : 'approved';
    if (value.role !== 'owner' || value.requesterUserId === null || value.actorId === value.requesterUserId || value.decision !== required) throw new Error('Independent claim approval required');
  }
  return value.to;
}

export function effectiveClaimState(value) {
  fields(value, ['recordedStatus','bindingMatches','evidenceRevoked','expired','decision']);
  choice(value.recordedStatus,claimLifecycleStates); choice(value.decision,[null,'approved','rejected','revoked']);
  for (const name of ['bindingMatches','evidenceRevoked','expired']) if (typeof value[name] !== 'boolean') throw new Error('Invalid lifecycle state');
  if (!value.bindingMatches || value.evidenceRevoked || value.decision === 'revoked' || ['verified','approved'].includes(value.recordedStatus) && value.decision !== 'approved') return Object.freeze({status:'reverification-required', reason:'binding-or-approval-invalidated'});
  if (value.expired) return Object.freeze({status:'stale', reason:'evidence-expired'});
  return Object.freeze({status:value.recordedStatus, reason:null});
}
