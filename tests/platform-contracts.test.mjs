import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseActor,parseResource,parseTaskInput,parseArtifact,parseCandidateEvidence,parseLockedPolicy,CLAIM_STATES} from '../src/platform/contracts/domain.mjs';

const policy=JSON.parse(readFileSync(new URL('../config/operating-policy.json',import.meta.url),'utf8'));
const resource=()=>({id:'market-alpha',organizationId:'org-alpha',type:'market'});
const task=()=>({schemaVersion:1,id:'task-alpha',organizationId:'org-alpha',agentId:'market-research-agent',action:'research-market',resource:resource(),correlationId:'run-alpha',idempotencyKey:'idem-alpha',costINR:0,input:{query:'CRM'},limits:{maxConcurrent:1,maxTasks:5,maxAttempts:2,timeoutMs:30000,maxOutputBytes:16384}});
const evidence=()=>({schemaVersion:1,id:'evidence-alpha',organizationId:'org-alpha',productId:'product-alpha',sourceUrl:'https://example.com/docs/',collectedAt:'2026-11-11T00:00:00.000Z',statement:'Unreviewed candidate observation.',status:'candidate'});
const now='2026-11-12T00:00:00.000Z';

test('platform actor and resource contracts validate IDs without granting identity or roles',()=>{
 assert.deepEqual(parseActor({id:'user-alpha',organizationId:'org-alpha',type:'user'}),{id:'user-alpha',organizationId:'org-alpha',type:'user'});
 assert.deepEqual(parseResource(resource()),resource());
 for(const extra of [{role:'owner'},{authenticated:true},{token:'synthetic-test-value'},{owner:true}])assert.throws(()=>parseActor({id:'user-alpha',organizationId:'org-alpha',type:'user',...extra}),/Invalid/);
 for(const id of ['', '../owner','user alpha','User-Alpha','a'.repeat(65)])assert.throws(()=>parseActor({id,organizationId:'org-alpha',type:'user'}),/Invalid/);
 assert.throws(()=>parseResource({...resource(),type:'unknown'}),/Invalid/);
});

test('task contracts return detached frozen data with bounded validated input and zero cost',()=>{
 const original=task();const parsed=parseTaskInput(original);
 assert.deepEqual(parsed,original);assert.notEqual(parsed,original);
 original.input.query='changed';assert.equal(parsed.input.query,'CRM');
 assert.ok(Object.isFrozen(parsed)&&Object.isFrozen(parsed.input)&&Object.isFrozen(parsed.limits));
 for(const costINR of [1,-1,NaN,Infinity,'0',null])assert.throws(()=>parseTaskInput({...task(),costINR}),/Invalid/);
 for(const patch of [{schemaVersion:2},{action:'invented-action'},{approved:true},{resource:{...resource(),organizationId:'org-other'}},{idempotencyKey:'../run'}])assert.throws(()=>parseTaskInput({...task(),...patch}),/Invalid/);
 for(const [key,value] of [['maxConcurrent',3],['maxTasks',21],['maxAttempts',4],['timeoutMs',300001],['maxOutputBytes',65537]])assert.throws(()=>parseTaskInput({...task(),limits:{...task().limits,[key]:value}}),/Invalid/);
});

test('untrusted JSON rejects prototypes, accessors, symbols, cycles and oversized/deep payloads without invoking getters',()=>{
 let reads=0;const getter={};Object.defineProperty(getter,'schemaVersion',{enumerable:true,get(){reads++;return 1;}});
 assert.throws(()=>parseTaskInput(getter),/Invalid/);assert.equal(reads,0);
 const cyclic={};cyclic.child=cyclic;
 let deep={};for(let i=0;i<8;i++)deep={child:deep};
 for(const input of [new Date(),{bad:undefined},{bad:()=>0},{bad:NaN},{bad:1n},cyclic,deep,{items:Array(101).fill(1)},{text:'x'.repeat(4097)},JSON.parse('{"__proto__":{"owner":true}}')])assert.throws(()=>parseTaskInput({...task(),input}),/Invalid/);
 assert.throws(()=>parseTaskInput({...task(),[Symbol('owner')]:true}),/Invalid/);
 const hidden=task();Object.defineProperty(hidden,'owner',{value:true});assert.throws(()=>parseTaskInput(hidden),/Invalid/);
});

test('artifact output is validated draft data, never an approval or executable handler',()=>{
 const input={schemaVersion:1,id:'artifact-alpha',organizationId:'org-alpha',taskId:'task-alpha',type:'research-note',payload:{notes:['Candidate only']}};
 const result=parseArtifact(input);assert.ok(Object.isFrozen(result.payload.notes));
 input.payload.notes.push('changed');assert.equal(result.payload.notes.length,1);
 for(const patch of [{type:'approval'},{handler:()=>0},{published:true},{payload:{html:'<script>unsafe</script>'}}])assert.throws(()=>parseArtifact({...input,...patch}),/Invalid/);
});

test('candidate evidence is structurally sourced, time-bound and cannot self-promote',()=>{
 const result=parseCandidateEvidence(evidence(),{now});assert.equal(result.status,'candidate');assert.ok(Object.isFrozen(result));
 for(const patch of [{sourceUrl:'http://example.com/docs/'},{sourceUrl:'https://name:password@example.com/docs/'},{sourceUrl:'https://example.com/docs/#owner'},{collectedAt:'2026-11-13T00:00:00.000Z'},{collectedAt:'2026-02-30T00:00:00.000Z'},{status:'approved'},{approved:false},{reviewer:'user-owner'},{statement:'<script>unsafe</script>'}])assert.throws(()=>parseCandidateEvidence({...evidence(),...patch},{now}),/Invalid/);
 assert.throws(()=>parseCandidateEvidence(evidence(),{now:'invalid'}),/Invalid/);
 assert.ok(CLAIM_STATES.includes('reverification-required'));assert.ok(Object.isFrozen(CLAIM_STATES));
});

test('locked policy contract rejects broadened, incomplete or extra authorization fields',()=>{
 assert.deepEqual(parseLockedPolicy(policy),policy);
 for(const patch of [{monthlyBudgetINR:1},{delegatedSpendINR:-1},{commercialHostingApproved:true},{productionLaunchApproved:true},{affiliateActivationApproved:true},{paidServicesApproved:true},{approvedBy:'owner'}])assert.throws(()=>parseLockedPolicy({...policy,...patch}),/Invalid/);
 const partial={...policy};delete partial.hostingCandidate;assert.throws(()=>parseLockedPolicy(partial),/Invalid/);
});

test('platform contracts reject proxy traps and unsafe payload keys without evaluating them',()=>{
 let reads=0;
 const traps={get(){reads++;throw new Error('trap must not execute');},ownKeys(){reads++;throw new Error('trap must not execute');},getPrototypeOf(){reads++;throw new Error('trap must not execute');}};
 assert.throws(()=>parseTaskInput(new Proxy(task(),traps)),/Invalid/);
 assert.throws(()=>parseTaskInput({...task(),input:new Proxy({},traps)}),/Invalid/);
 assert.equal(reads,0);
 for(const key of ['<script>','line\nbreak',''])assert.throws(()=>parseTaskInput({...task(),input:{[key]:'synthetic'}}),/Invalid/);
});

test('candidate evidence clock options reject getters and proxies before accessing them',()=>{
 let reads=0;const options={};Object.defineProperty(options,'now',{enumerable:true,get(){reads++;return now;}});
 assert.throws(()=>parseCandidateEvidence(evidence(),options),/Invalid/);
 assert.throws(()=>parseCandidateEvidence(evidence(),new Proxy({now},{get(){reads++;return now;}})),/Invalid/);
 assert.equal(reads,0);
 assert.throws(()=>parseCandidateEvidence(evidence(),{now,approved:true}),/Invalid/);
});
