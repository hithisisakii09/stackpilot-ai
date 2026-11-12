import {sql} from 'drizzle-orm';
import {pgTable, text, integer, boolean, jsonb, timestamp, primaryKey, foreignKey, unique, index, check} from 'drizzle-orm/pg-core';

const column = (type='text', options={}) => ({type, ...options});
const optional = type => column(type, {nullable:true});
const zero = () => column('integer', {default:'0'});
const document = () => column('jsonb', {default:"'{}'::jsonb"});
const state = value => column('text', {default:`'${value}'`});
const reference = (columns, target, targetColumns=['organizationId','id']) => ({columns, target, targetColumns});
const tenantReference = (name, target) => reference(['organizationId',name], target);
const tenant = (columns, options={}) => ({
  columns:{organizationId:column(), id:column(), createdAt:column('timestamp', {default:'now()'}), ...columns},
  primary:['organizationId','id'],
  references:[reference(['organizationId'],'organizations',['id']), ...(options.references ?? [])],
  unique:options.unique ?? [],
  checks:options.checks ?? [],
  indexes:options.indexes ?? []
});
const budgetCheck = 'cost_inr = 0';
const candidateCheck = "status = 'candidate'";
const taskStates = "status IN ('QUEUED','RUNNING','WAITING_FOR_APPROVAL','BLOCKED','FAILED','COMPLETED','CANCELLED')";

// Reviewed static metadata is the common source for Drizzle objects and DDL.
// Domain services and authenticated approval transitions arrive in later phases.
export const tableSpecs = {
  organizations:{columns:{id:column(), name:column(), monthlyBudgetInr:zero(), delegatedSpendInr:zero(), createdAt:column('timestamp',{default:'now()'})}, primary:['id'], checks:['monthly_budget_inr = 0','delegated_spend_inr = 0']},
  users:tenant({displayName:column(), status:state('unprovisioned')}, {checks:["status = 'unprovisioned'"]}),
  roles:tenant({name:column()}, {unique:[['organizationId','name']]}),
  permissions:tenant({action:column(), tier:column()}, {unique:[['organizationId','action']], checks:["tier IN ('allowed','human_approval','legal_review','prohibited')"]}),
  memberships:tenant({userId:column(), roleId:column()}, {references:[tenantReference('userId','users'),tenantReference('roleId','roles')], unique:[['organizationId','userId','roleId']]}),
  role_permissions:tenant({roleId:column(), permissionId:column()}, {references:[tenantReference('roleId','roles'),tenantReference('permissionId','permissions')], unique:[['organizationId','roleId','permissionId']]}),
  agents:tenant({role:column(), version:column('integer'), enabled:column('boolean',{default:'false'}), definition:document(), costInr:zero()}, {checks:['version > 0','enabled = false',budgetCheck]}),
  agent_capabilities:tenant({agentId:column(), action:column(), tools:document()}, {references:[tenantReference('agentId','agents')], unique:[['organizationId','agentId','action']]}),
  workflow_definitions:tenant({name:column(), objective:column()}),
  workflow_versions:tenant({definitionId:column(), version:column('integer'), definition:document()}, {references:[tenantReference('definitionId','workflow_definitions')], unique:[['organizationId','definitionId','version']], checks:['version > 0']}),
  workflow_executions:tenant({versionId:column(), status:state('QUEUED'), idempotencyKey:column(), costInr:zero()}, {references:[tenantReference('versionId','workflow_versions')], unique:[['organizationId','idempotencyKey']], checks:[taskStates,budgetCheck], indexes:[['organizationId','status','createdAt']]}),
  tasks:tenant({executionId:column(), agentId:optional('text'), title:column(), status:state('QUEUED'), idempotencyKey:column(), input:document(), retries:zero(), maxAttempts:column('integer',{default:'3'}), costInr:zero(), leaseUntil:optional('timestamp')}, {references:[tenantReference('executionId','workflow_executions'),tenantReference('agentId','agents')], unique:[['organizationId','idempotencyKey'],['organizationId','executionId','id']], checks:[taskStates,budgetCheck,'max_attempts BETWEEN 1 AND 3','retries BETWEEN 0 AND max_attempts'], indexes:[['organizationId','status','leaseUntil']]}),
  task_dependencies:tenant({executionId:column(), taskId:column(), dependsOnTaskId:column()}, {references:[reference(['organizationId','executionId','taskId'],'tasks',['organizationId','executionId','id']),reference(['organizationId','executionId','dependsOnTaskId'],'tasks',['organizationId','executionId','id'])], unique:[['organizationId','taskId','dependsOnTaskId']], checks:['task_id <> depends_on_task_id']}),
  task_attempts:tenant({taskId:column(), attempt:column('integer'), status:state('QUEUED'), output:document(), costInr:zero()}, {references:[tenantReference('taskId','tasks')], unique:[['organizationId','taskId','attempt']], checks:['attempt BETWEEN 1 AND 3',taskStates,budgetCheck]}),
  idempotency_keys:tenant({operation:column(), sourceDigest:column(), result:document()}, {checks:["source_digest ~ '^[a-f0-9]{64}$'"]}),
  categories:tenant({slug:column(), name:column()}, {unique:[['organizationId','slug']]}),
  vendors:tenant({name:column(), website:column()}, {unique:[['organizationId','website']], checks:["website LIKE 'https://%'"]}),
  products:tenant({categoryId:column(), vendorId:column(), slug:column(), name:column(), website:column(), status:state('candidate'), affiliateUrl:optional('text'), metadata:document()}, {references:[tenantReference('categoryId','categories'),tenantReference('vendorId','vendors')], unique:[['organizationId','slug']], checks:[candidateCheck,'affiliate_url IS NULL',"website LIKE 'https://%'"]}),
  product_aliases:tenant({productId:column(), alias:column()}, {references:[tenantReference('productId','products')], unique:[['organizationId','alias']]}),
  product_claims:tenant({productId:column(), statement:column(), caveat:column(), status:state('candidate'), approved:column('boolean',{default:'false'})}, {references:[tenantReference('productId','products')], unique:[['organizationId','productId','id']], checks:[candidateCheck,'approved = false']}),
  evidence_sources:tenant({productId:column(), sourceUrl:column(), collectedAt:column('timestamp'), status:state('candidate'), sourceDigest:column()}, {references:[tenantReference('productId','products')], unique:[['organizationId','productId','sourceUrl'],['organizationId','productId','id']], checks:[candidateCheck,"source_url LIKE 'https://%'","source_digest ~ '^[a-f0-9]{64}$'",'collected_at <= CURRENT_TIMESTAMP']}),
  claim_evidence:tenant({productId:column(), claimId:column(), sourceId:column()}, {references:[reference(['organizationId','productId','claimId'],'product_claims',['organizationId','productId','id']),reference(['organizationId','productId','sourceId'],'evidence_sources',['organizationId','productId','id'])], unique:[['organizationId','claimId','sourceId']]}),
  product_reviews:tenant({productId:column(), status:state('unreviewed'), notes:document()}, {references:[tenantReference('productId','products')], checks:["status = 'unreviewed'"]}),
  recommendations:tenant({productId:column(), explanation:document(), status:state('draft')}, {references:[tenantReference('productId','products')], checks:["status = 'draft'"]}),
  market_opportunities:tenant({categoryId:column(), observation:document(), confidence:optional('integer'), attractiveness:optional('integer')}, {references:[tenantReference('categoryId','categories')], checks:['confidence BETWEEN 0 AND 100','attractiveness BETWEEN 0 AND 100']}),
  market_observations:tenant({opportunityId:column(), sourceUrl:column(), observedAt:column('timestamp'), observation:document(), status:state('candidate')}, {references:[tenantReference('opportunityId','market_opportunities')], checks:[candidateCheck,"source_url LIKE 'https://%'",'observed_at <= CURRENT_TIMESTAMP']}),
  competitors:tenant({vendorId:column(), observation:document()}, {references:[tenantReference('vendorId','vendors')]}),
  seasonal_trends:tenant({categoryId:column(), observations:document(), status:state('insufficient-evidence')}, {references:[tenantReference('categoryId','categories')], checks:["status IN ('insufficient-evidence','candidate')"]}),
  keyword_clusters:tenant({name:column(), intent:column()}),
  keywords:tenant({clusterId:column(), phrase:column(), evidence:document()}, {references:[tenantReference('clusterId','keyword_clusters')]}),
  content:tenant({categoryId:column(), title:column(), status:state('draft')}, {references:[tenantReference('categoryId','categories')], checks:["status = 'draft'"]}),
  content_versions:tenant({contentId:column(), version:column('integer'), body:column(), status:state('draft')}, {references:[tenantReference('contentId','content')], unique:[['organizationId','contentId','version']], checks:['version > 0',"status = 'draft'"]}),
  content_claims:tenant({versionId:column(), claimId:column()}, {references:[tenantReference('versionId','content_versions'),tenantReference('claimId','product_claims')], unique:[['organizationId','versionId','claimId']]}),
  partnerships:tenant({vendorId:column(), step:column('integer',{default:'1'}), status:state('draft'), proposal:document()}, {references:[tenantReference('vendorId','vendors')], checks:['step BETWEEN 1 AND 12',"status IN ('draft','needs-review','rejected')"]}),
  partnership_events:tenant({partnershipId:column(), kind:column(), evidence:document()}, {references:[tenantReference('partnershipId','partnerships')]}),
  affiliate_programmes:tenant({vendorId:column(), sourceUrl:optional('text'), status:state('candidate'), active:column('boolean',{default:'false'})}, {references:[tenantReference('vendorId','vendors')], checks:[candidateCheck,'active = false']}),
  commission_terms:tenant({programmeId:column(), terms:document(), status:state('candidate')}, {references:[tenantReference('programmeId','affiliate_programmes')], checks:[candidateCheck]}),
  revenue_forecasts:tenant({programmeId:column(), assumptions:document(), status:state('unavailable')}, {references:[tenantReference('programmeId','affiliate_programmes')], checks:["status IN ('unavailable','scenario')"]}),
  external_statements:tenant({programmeId:column(), statementDigest:column(), recordedAt:column('timestamp')}, {references:[tenantReference('programmeId','affiliate_programmes')], unique:[['organizationId','statementDigest'],['organizationId','programmeId','id']], checks:["statement_digest ~ '^[a-f0-9]{64}$'"]}),
  commission_records:tenant({programmeId:column(), statementId:optional('text'), isEstimate:column('boolean'), amountMinor:column('integer'), currency:column()}, {references:[tenantReference('programmeId','affiliate_programmes'),reference(['organizationId','programmeId','statementId'],'external_statements',['organizationId','programmeId','id'])], checks:['amount_minor >= 0','is_estimate OR statement_id IS NOT NULL',"currency ~ '^[A-Z]{3}$'"]}),
  approval_requests:tenant({agentId:column(), action:column(), resourceId:column(), payloadDigest:column(), evidenceDigest:column(), status:state('pending')}, {references:[tenantReference('agentId','agents')], checks:["status = 'pending'","payload_digest ~ '^[a-f0-9]{64}$'","evidence_digest ~ '^[a-f0-9]{64}$'"]}),
  approval_decisions:tenant({requestId:column(), deciderUserId:column(), decision:column(), decidedAt:column('timestamp'), requestDigest:column()}, {references:[tenantReference('requestId','approval_requests'),tenantReference('deciderUserId','users')], unique:[['organizationId','requestId']], checks:["decision IN ('approved','rejected','revoked')","request_digest ~ '^[a-f0-9]{64}$'"]}),
  audit_events:tenant({actorId:column(), requestId:column(), action:column(), targetId:column(), data:document()}, {indexes:[['organizationId','createdAt']]}),
  outbox_events:tenant({auditId:column(), kind:column(), payload:document(), status:state('pending')}, {references:[tenantReference('auditId','audit_events')], checks:["status = 'pending'"]}),
  system_settings:tenant({key:column(), value:document()}, {unique:[['organizationId','key']]}),
  retention_jobs:tenant({tableName:column(), retainDays:column('integer'), status:state('disabled')}, {checks:['retain_days > 0',"status = 'disabled'"]}),
  scheduled_jobs:tenant({definitionId:column(), schedule:column(), enabled:column('boolean',{default:'false'}), costInr:zero()}, {references:[tenantReference('definitionId','workflow_definitions')], checks:['enabled = false',budgetCheck]})
};

function freezeDefinition(value) {
  for (const child of Object.values(value)) {
    if (child && typeof child==='object') freezeDefinition(child);
  }
  return Object.freeze(value);
}
freezeDefinition(tableSpecs);

function indexesFor(spec) {
  const result = [...(spec.indexes ?? [])];
  const covered = [spec.primary,...(spec.unique ?? []),...result];
  for (const ref of spec.references ?? []) {
    if (!covered.some(keys=>ref.columns.every((key,i)=>keys[i]===key))) {
      result.push(ref.columns);
      covered.push(ref.columns);
    }
  }
  return result;
}

const snake = value => value.replace(/[A-Z]/g,letter=>'_'+letter.toLowerCase());
const quote = value => '"'+snake(value)+'"';
const builders = {text, integer, boolean, jsonb, timestamp:(name)=>timestamp(name,{withTimezone:true,mode:'date'})};

export const schema = {};
for (const [name,spec] of Object.entries(tableSpecs)) {
  const columns = {};
  for (const [key,definition] of Object.entries(spec.columns)) {
    let builder = builders[definition.type](snake(key));
    if (!definition.nullable) builder = builder.notNull();
    if (definition.default !== undefined) builder = builder.default(sql.raw(definition.default));
    columns[key] = builder;
  }
  schema[name] = pgTable(name,columns,table=>[
    primaryKey({columns:spec.primary.map(key=>table[key])}),
    ...(spec.references ?? []).map((ref,n)=>foreignKey({name:name+'_fk'+n,columns:ref.columns.map(key=>table[key]),foreignColumns:ref.targetColumns.map(key=>schema[ref.target][key])})),
    ...(spec.unique ?? []).map((keys,n)=>unique(name+'_u'+n).on(...keys.map(key=>table[key]))),
    ...(spec.checks ?? []).map((expression,n)=>check(name+'_c'+n,sql.raw(expression))),
    ...indexesFor(spec).map((keys,n)=>index(name+'_i'+n).on(...keys.map(key=>table[key])))
  ]);
}
Object.freeze(schema);

export function buildMigrationSql() {
  const statements = ['-- StackPilot local foundation migration 1. Candidate-only and zero-budget.'];
  const sqlTypes = {text:'text',integer:'integer',boolean:'boolean',jsonb:'jsonb',timestamp:'timestamp with time zone'};
  for (const [name,spec] of Object.entries(tableSpecs)) {
    const parts = Object.entries(spec.columns).map(([key,definition])=>
      '  '+quote(key)+' '+sqlTypes[definition.type]+(definition.nullable?'':' NOT NULL')+(definition.default!==undefined?' DEFAULT '+definition.default:'')
    );
    parts.push('  PRIMARY KEY ('+spec.primary.map(quote).join(', ')+')');
    (spec.unique ?? []).forEach((keys,n)=>parts.push('  CONSTRAINT '+quote(name+'_u'+n)+' UNIQUE ('+keys.map(quote).join(', ')+')'));
    (spec.checks ?? []).forEach((expression,n)=>parts.push('  CONSTRAINT '+quote(name+'_c'+n)+' CHECK ('+expression+')'));
    statements.push('CREATE TABLE '+quote(name)+' (\n'+parts.join(',\n')+'\n);');
  }
  // Add references after tables so every domain can refer to earlier or later declarations.
  for (const [name,spec] of Object.entries(tableSpecs)) {
    (spec.references ?? []).forEach((ref,n)=>statements.push('ALTER TABLE '+quote(name)+' ADD CONSTRAINT '+quote(name+'_fk'+n)+' FOREIGN KEY ('+ref.columns.map(quote).join(', ')+') REFERENCES '+quote(ref.target)+' ('+ref.targetColumns.map(quote).join(', ')+');'));
    indexesFor(spec).forEach((keys,n)=>statements.push('CREATE INDEX '+quote(name+'_i'+n)+' ON '+quote(name)+' ('+keys.map(quote).join(', ')+');'));
  }
  statements.push("DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'stackpilot_app') THEN CREATE ROLE stackpilot_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS; END IF; END $$;");
  statements.push('REVOKE CREATE ON SCHEMA public FROM PUBLIC;');
  statements.push('GRANT USAGE ON SCHEMA public TO stackpilot_app;');
  for (const name of Object.keys(tableSpecs)) {
    const tenantColumn = name==='organizations'?'id':'organization_id';
    const condition = quote(tenantColumn)+" = nullif(current_setting('stackpilot.organization_id', true), '')";
    statements.push('ALTER TABLE '+quote(name)+' ENABLE ROW LEVEL SECURITY;');
    statements.push('ALTER TABLE '+quote(name)+' FORCE ROW LEVEL SECURITY;');
    statements.push('CREATE POLICY tenant_scope ON '+quote(name)+' USING ('+condition+') WITH CHECK ('+condition+');');
    statements.push('REVOKE ALL ON TABLE '+quote(name)+' FROM PUBLIC, stackpilot_app;');
    const readOnly = ['approval_decisions','external_statements','commission_records','commission_terms'];
    const grants = readOnly.includes(name)?'SELECT':'SELECT, INSERT';
    statements.push('GRANT '+grants+' ON TABLE '+quote(name)+' TO stackpilot_app;');
  }
  statements.push('GRANT UPDATE (version, definition) ON TABLE agents TO stackpilot_app;');
  statements.push('GRANT DELETE ON TABLE agent_capabilities TO stackpilot_app;');
  return statements.join('\n\n')+'\n';
}
