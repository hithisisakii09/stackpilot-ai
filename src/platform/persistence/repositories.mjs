import {randomUUID} from 'node:crypto';
import {and,eq,sql} from 'drizzle-orm';
import {schema} from './schema.mjs';
import {withTransaction} from './transaction.mjs';
import {prepareCandidateImport} from './candidate-import.mjs';
import {createAgentRegistry} from '../agents/registry.mjs';
import {parseAction,parseTaskInput} from '../contracts/domain.mjs';
import {fields,id,text,json,integer} from '../contracts/validation.mjs';

const eventId = () => 'event-'+randomUUID();
const scoped = (table,organizationId,recordId) => and(eq(table.organizationId,organizationId),eq(table.id,recordId));

async function audit(tx,action,targetId,data={}) {
  const auditId = eventId();
  const {organizationId,actorId,requestId} = tx.scope;
  await tx.db.insert(schema.audit_events).values({organizationId,id:auditId,actorId,requestId,action,targetId,data:json(data)});
  await tx.db.insert(schema.outbox_events).values({organizationId,id:eventId(),auditId,kind:action,payload:{targetId},status:'pending'});
}

async function insertRecord(tx,table,record,action) {
  const value = {...record,organizationId:tx.scope.organizationId};
  const rows = await tx.db.insert(table).values(value).returning();
  await audit(tx,action,record.id);
  return rows[0];
}

export function repositories(tx) {
  const organizationId = tx.scope.organizationId;
  const groups = {
    identity:Object.freeze({
      createOrganization:async value => {
        fields(value,['name']);
        const rows = await tx.db.insert(schema.organizations).values({id:organizationId,name:text(value.name,100)}).returning();
        await audit(tx,'organization-created',organizationId);
        return rows[0];
      },
      recordUser:async value => {
        fields(value,['id','displayName']);
        return insertRecord(tx,schema.users,{id:id(value.id),displayName:text(value.displayName,100),status:'unprovisioned'},'user-recorded');
      }
    }),
    agents:Object.freeze({
      register:async value => {
        const definition = createAgentRegistry([value]).list()[0];
        const record = {id:definition.id,role:definition.role,version:definition.version,enabled:false,definition,costInr:0};
        await tx.db.insert(schema.agents).values({...record,organizationId});
        for (const action of definition.capabilities) {
          await tx.db.insert(schema.agent_capabilities).values({organizationId,id:eventId(),agentId:record.id,action,tools:definition.tools});
        }
        await audit(tx,'agent-registered',record.id);
        return record;
      },
      configure:async value => {
        fields(value,['id','expectedVersion','patch']);
        const agentId = id(value.id);
        const expectedVersion = integer(value.expectedVersion,1,1000000);
        const old = await tx.db.select().from(schema.agents).where(scoped(schema.agents,organizationId,agentId));
        if (old.length!==1 || old[0].version!==expectedVersion) throw new Error('Agent configuration conflict');
        const next = createAgentRegistry([old[0].definition]).configure(agentId,value.patch).get(agentId);
        const updated = await tx.db.update(schema.agents).set({version:next.version,definition:next}).where(and(scoped(schema.agents,organizationId,agentId),eq(schema.agents.version,expectedVersion))).returning();
        if (updated.length!==1) throw new Error('Agent configuration conflict');
        await tx.db.delete(schema.agent_capabilities).where(and(eq(schema.agent_capabilities.organizationId,organizationId),eq(schema.agent_capabilities.agentId,agentId)));
        for (const action of next.capabilities) {
          await tx.db.insert(schema.agent_capabilities).values({organizationId,id:eventId(),agentId,action,tools:next.tools});
        }
        await audit(tx,'agent-configured',agentId,{fromVersion:expectedVersion,toVersion:next.version,previousDefinition:old[0].definition,definition:next});
        return updated[0];
      },
      list:() => tx.db.select().from(schema.agents).where(eq(schema.agents.organizationId,organizationId))
    }),
    workflows:Object.freeze({
      createDefinition:value => {
        fields(value,['id','name','objective']);
        return insertRecord(tx,schema.workflow_definitions,{id:id(value.id),name:text(value.name,100),objective:text(value.objective)},'workflow-defined');
      },
      createVersion:value => {
        fields(value,['id','definitionId','version','definition']);
        return insertRecord(tx,schema.workflow_versions,{id:id(value.id),definitionId:id(value.definitionId),version:integer(value.version,1,1000000),definition:json(value.definition)},'workflow-versioned');
      },
      createExecution:value => {
        fields(value,['id','versionId','idempotencyKey']);
        return insertRecord(tx,schema.workflow_executions,{id:id(value.id),versionId:id(value.versionId),idempotencyKey:id(value.idempotencyKey),status:'QUEUED',costInr:0},'workflow-queued');
      },
      createTask:value => {
        fields(value,['executionId','task']);
        const task = parseTaskInput(value.task);
        if (task.organizationId !== organizationId) throw new Error('Invalid task organization');
        const record = {id:task.id,executionId:id(value.executionId),agentId:task.agentId,title:task.id,status:'QUEUED',idempotencyKey:task.idempotencyKey,input:{action:task.action,resource:task.resource,data:task.input,limits:task.limits},costInr:0};
        return insertRecord(tx,schema.tasks,record,'task-queued');
      },
      addDependency:value => {
        fields(value,['id','executionId','taskId','dependsOnTaskId']);
        return insertRecord(tx,schema.task_dependencies,{id:id(value.id),executionId:id(value.executionId),taskId:id(value.taskId),dependsOnTaskId:id(value.dependsOnTaskId)},'dependency-recorded');
      }
    }),
    evidence:Object.freeze({
      listProducts:() => tx.db.select().from(schema.products).where(eq(schema.products.organizationId,organizationId)),
      listClaims:() => tx.db.select().from(schema.product_claims).where(eq(schema.product_claims.organizationId,organizationId)),
      getProduct:async recordId => {
        const rows = await tx.db.select().from(schema.products).where(scoped(schema.products,organizationId,id(recordId)));
        return rows[0] ?? null;
      }
    }),
    approvals:Object.freeze({
      request:value => {
        fields(value,['id','agentId','action','resourceId','payloadDigest','evidenceDigest']);
        if (!/^[a-f0-9]{64}$/.test(value.payloadDigest) || !/^[a-f0-9]{64}$/.test(value.evidenceDigest)) throw new Error('Invalid approval request digest');
        return insertRecord(tx,schema.approval_requests,{id:id(value.id),agentId:id(value.agentId),action:parseAction(value.action),resourceId:id(value.resourceId),payloadDigest:value.payloadDigest,evidenceDigest:value.evidenceDigest,status:'pending'},'approval-requested');
      },
      listPending:() => tx.db.select().from(schema.approval_requests).where(and(eq(schema.approval_requests.organizationId,organizationId),eq(schema.approval_requests.status,'pending')))
    }),
    audit:Object.freeze({
      append:(action,targetId,data) => audit(tx,id(action),id(targetId),data),
      list:() => tx.db.select().from(schema.audit_events).where(eq(schema.audit_events.organizationId,organizationId))
    })
  };
  const result = {};
  for (const [name,methods] of Object.entries(groups)) {
    const wrapped = {};
    for (const [method,implementation] of Object.entries(methods)) {
      wrapped[method] = (...args) => tx.track(()=>implementation(...args));
    }
    result[name] = Object.freeze(wrapped);
  }
  return Object.freeze(result);
}

export function createStore(pool) {
  return Object.freeze({transaction:(context,callback) => withTransaction(pool,context,tx=>callback(repositories(tx)))});
}

export async function importCandidates(pool,context,input,{dryRun=false}={}) {
  const prepared = prepareCandidateImport(input);
  const counts = Object.freeze({products:prepared.products.length,claims:prepared.claims.length,sources:prepared.sources.length});
  if (dryRun === true) return Object.freeze({dryRun:true,imported:false,sourceDigest:prepared.sourceDigest,counts});
  if (dryRun !== false) throw new Error('Invalid import mode');
  return withTransaction(pool,context,async tx=>{
    const organizationId = tx.scope.organizationId;
    await tx.db.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId+'|candidate-import-v1'},0))`);
    const prior = await tx.db.select().from(schema.idempotency_keys).where(scoped(schema.idempotency_keys,organizationId,'candidate-import-v1'));
    if (prior.length) {
      if (prior[0].sourceDigest !== prepared.sourceDigest) throw new Error('Candidate import conflicts with prior source');
      return Object.freeze({dryRun:false,imported:false,sourceDigest:prepared.sourceDigest,counts});
    }
    for (const [table,rows] of [[schema.categories,prepared.categories],[schema.vendors,prepared.vendors],[schema.products,prepared.products],[schema.evidence_sources,prepared.sources],[schema.product_claims,prepared.claims],[schema.claim_evidence,prepared.links]]) {
      for (const row of rows) await tx.db.insert(table).values({...row,organizationId});
    }
    await tx.db.insert(schema.idempotency_keys).values({organizationId,id:'candidate-import-v1',operation:'candidate-import',sourceDigest:prepared.sourceDigest,result:counts});
    await audit(tx,'candidates-imported','candidate-import-v1',{sourceDigest:prepared.sourceDigest,...counts});
    return Object.freeze({dryRun:false,imported:true,sourceDigest:prepared.sourceDigest,counts});
  });
}
