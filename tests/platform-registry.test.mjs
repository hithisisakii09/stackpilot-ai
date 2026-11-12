import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_AGENT_DEFINITIONS} from '../src/platform/agents/roles.mjs';
import {createAgentRegistry} from '../src/platform/agents/registry.mjs';

const names=['Chief Orchestration Agent','Business Strategy Agent','Business Performance Agent','Planning and Prioritization Agent','Market Research Agent','Market Trend Agent','Seasonal Intelligence Agent','Competitor Intelligence Agent','Opportunity Discovery Agent','Market Scoring Agent','Product Discovery Agent','Product Verification Agent','Pricing Intelligence Agent','Product Comparison Agent','Product Suitability Agent','Evidence Collection Agent','Customer Research Agent','Customer Requirement Analysis Agent','Customer Segmentation Agent','Recommendation Optimization Agent','SEO Research Agent','Keyword Intelligence Agent','Content Strategy Agent','Editorial Agent','Content Quality Agent','Content Refresh Agent','Brand Discovery Agent','Vendor Research Agent','Partnership Preparation Agent','Commission Intelligence Agent','Affiliate Research Agent','Revenue Forecasting Agent','Software Architect Agent','Development Agent','Code Review Agent','QA Agent','Security Agent','DevOps Agent','Documentation Agent','Technical Debt Agent','Continuous Improvement Agent'];

test('all 41 requested logical roles exist uniquely in seven groups and three nonexecuting pipelines',()=>{
 const registry=createAgentRegistry();const agents=registry.list();
 assert.equal(agents.length,41);assert.deepEqual(agents.map(a=>a.role).sort(),[...names].sort());
 assert.equal(new Set(agents.map(a=>a.id)).size,41);assert.equal(new Set(agents.map(a=>a.group)).size,7);
 assert.deepEqual([...new Set(agents.map(a=>a.pipeline))].sort(),['analysis','engineering','research']);
 assert.ok(agents.every(a=>a.enabled===false&&a.costINR===0&&a.inputContract==='task-input-v1'&&a.outputContract==='artifact-v1'));
 assert.ok(Object.isFrozen(DEFAULT_AGENT_DEFINITIONS)&&Object.isFrozen(agents));
});

test('role definitions have versioned responsibilities and unavailable runtime status',()=>{
 const registry=createAgentRegistry();
 for(const agent of registry.list()){
  assert.equal(agent.schemaVersion,1);assert.equal(agent.version,1);
  assert.equal(agent.status,'disabled-no-handler');assert.ok(agent.responsibility.length>20);
 }
 const next=registry.configure('market-research-agent',{tools:[]});
 assert.equal(next.get('market-research-agent').version,2);
 assert.equal(registry.get('market-research-agent').version,1);
});

test('registry definition arrays reject accessors and custom iterators before reading them',()=>{
 let reads=0;const agent=createAgentRegistry().get('market-research-agent');
 const getters=[];Object.defineProperty(getters,0,{enumerable:true,get(){reads++;return agent;}});
 assert.throws(()=>createAgentRegistry(getters),/Invalid/);assert.equal(reads,0);
 const iterable=[agent];iterable[Symbol.iterator]=function*(){reads++;yield agent;};
 assert.throws(()=>createAgentRegistry(iterable),/Invalid/);assert.equal(reads,0);
 const sparse=Array(1);assert.throws(()=>createAgentRegistry(sparse),/Invalid/);
 const proxy=new Proxy([agent],{get(){reads++;return agent;},ownKeys(){reads++;return [];}});
 assert.throws(()=>createAgentRegistry(proxy),/Invalid/);assert.equal(reads,0);
 const revoked=Proxy.revocable([],{});revoked.revoke();assert.throws(()=>createAgentRegistry(revoked.proxy),/Invalid/);
});

test('registry returns immutable detached definitions and does not expose handlers or authority',()=>{
 const registry=createAgentRegistry();const agent=registry.get('market-research-agent');
 assert.ok(Object.isFrozen(agent)&&Object.isFrozen(agent.tools)&&Object.isFrozen(agent.limits));
 assert.equal(registry.get('unknown-agent'),null);assert.equal(registry.get('__proto__'),null);
 assert.equal(Object.hasOwn(agent,'handler'),false);assert.equal(Object.hasOwn(registry,'execute'),false);
 const definition=structuredClone(agent);definition.id='custom-research-agent';
 const added=registry.register(definition);definition.tools.length=0;
 assert.equal(registry.list().length,41);assert.equal(added.list().length,42);assert.ok(added.get('custom-research-agent').tools.length>0);
 assert.throws(()=>registry.register(agent),/Invalid/);
});

test('roles can be independently narrowed without capability/tool/limit escalation',()=>{
 const registry=createAgentRegistry();const agent=registry.get('market-research-agent');
 const configured=registry.configure(agent.id,{tools:[],capabilities:[],limits:{...agent.limits,maxTasks:1}});
 assert.equal(configured.get(agent.id).tools.length,0);assert.equal(registry.get(agent.id).tools.length,agent.tools.length);
 assert.deepEqual(configured.get('qa-agent'),registry.get('qa-agent'));
 for(const patch of [{enabled:true},{tools:['publish-content']},{capabilities:['approve-claim']},{role:'Owner Agent'},{limits:{...agent.limits,maxTasks:21}},{limits:{...agent.limits,maxTasks:agent.limits.maxTasks+1}},{handler:()=>0}])assert.throws(()=>registry.configure(agent.id,patch),/Invalid/);
 assert.throws(()=>configured.configure(agent.id,{tools:agent.tools,capabilities:agent.capabilities}),/Invalid/);
 assert.throws(()=>registry.configure('missing-agent',{enabled:false}),/Invalid/);
});

test('registration rejects unknown contracts, tools, paid cost, duplicates and metadata laundering',()=>{
 const agent=structuredClone(createAgentRegistry().get('market-research-agent'));agent.id='custom-research-agent';
 for(const patch of [{inputContract:'unvalidated-input'},{outputContract:'published-claim'},{enabled:true},{costINR:1},{tools:['unknown-tool']},{capabilities:['approve-claim']},{tools:['test-report']},{approved:true},{limits:{...agent.limits,timeoutMs:Infinity}}])assert.throws(()=>createAgentRegistry().register({...agent,...patch}),/Invalid/);
 assert.throws(()=>createAgentRegistry([agent,agent]),/Invalid/);
});
