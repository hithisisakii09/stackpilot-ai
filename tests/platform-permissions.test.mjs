import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ACTION_POLICIES,classifyAction} from '../src/platform/contracts/actions.mjs';
import {evaluateAction} from '../src/platform/permissions/evaluate.mjs';

const policy=JSON.parse(readFileSync(new URL('../config/operating-policy.json',import.meta.url),'utf8'));
const request=(action='research-market')=>{const metadata=ACTION_POLICIES[action];return {schemaVersion:1,organizationId:'org-alpha',actor:{id:'user-alpha',organizationId:'org-alpha',type:'user'},action,resource:{id:'resource-alpha',organizationId:'org-alpha',type:metadata?.resourceType??'market'},scope:metadata?.scope??'draft',costINR:0,policy};};

test('action catalog classifies all four tiers and unknown values fail closed',()=>{
 assert.equal(classifyAction('research-market'),'allowed');
 assert.equal(classifyAction('approve-claim'),'human_approval');
 assert.equal(classifyAction('accept-commercial-agreement'),'legal_review');
 assert.equal(classifyAction('spend-money'),'prohibited');
 for(const value of ['constructor','__proto__','unknown',null,{}])assert.equal(classifyAction(value),'prohibited');
 assert.ok(Object.isFrozen(ACTION_POLICIES)&&Object.values(ACTION_POLICIES).every(Object.isFrozen));
});

test('even classified allowed actions cannot execute without independently provisioned identity',()=>{
 for(const action of Object.keys(ACTION_POLICIES)){
  const result=evaluateAction(request(action));
  assert.equal(result.decision,'DENY',action);assert.equal(result.permittedImmediately,false);
  assert.equal(result.canPublish,false);assert.equal(result.canSpend,false);assert.equal(result.canMonetize,false);
  assert.ok(Object.isFrozen(result.reasons));
 }
 const result=evaluateAction(request());assert.equal(result.tier,'allowed');assert.ok(result.reasons.includes('identity-service-unavailable'));
});

test('caller roles, tokens, approval flags and verifier callbacks cannot mint authorization',()=>{
 for(const patch of [{actor:{...request().actor,role:'owner'}},{actor:{...request().actor,authenticated:true}},{approved:true},{authority:'owner'},{verifyIdentity:()=>true},{policy:{...policy,productionLaunchApproved:false}},{costINR:NaN},{costINR:-1},{costINR:1},{action:'unknown'},{actor:null}]){
  const result=evaluateAction({...request(),...patch});assert.equal(result.decision,'DENY');assert.equal(result.tier,'prohibited');assert.deepEqual(result.reasons,['invalid-request']);
 }
 assert.equal(evaluateAction().decision,'DENY');
});

test('tenant, action-resource and scope mismatches are denied rather than trusting request claims',()=>{
 for(const patch of [{actor:{...request().actor,organizationId:'org-other'}},{resource:{...request().resource,organizationId:'org-other'}},{resource:{...request().resource,type:'claim'}},{scope:'publish'}]){
  const result=evaluateAction({...request(),...patch});assert.equal(result.decision,'DENY');assert.ok(result.reasons.some(x=>/mismatch/.test(x)));
 }
});

test('agent approval attempts and restricted actions cannot be mistaken for owner approval',()=>{
 for(const action of ['approve-claim','decide-approval']){
  const r=request(action);r.actor.type='agent';const result=evaluateAction(r);
  assert.ok(result.reasons.includes('agent-cannot-approve'));assert.equal(result.permittedImmediately,false);
 }
 for(const action of ['publish-content','send-brand-proposal','activate-affiliate','merge-protected-pr','launch-production','unlock-publishing','spend-money','accept-commercial-agreement'])assert.equal(evaluateAction(request(action)).decision,'DENY');
 assert.equal(evaluateAction(request('publish-content')).requiresApprovalQueue,true);
 assert.equal(evaluateAction(request('spend-money')).requiresApprovalQueue,false);
});
