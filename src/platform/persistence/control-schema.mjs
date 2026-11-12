import {sql} from 'drizzle-orm';
import {pgTable,text,integer,timestamp,primaryKey,foreignKey,unique,index,check} from 'drizzle-orm/pg-core';
import {schema,tableSpecs} from './schema.mjs';

const column=(type='text',extra={})=>({type,...extra});
const digest=name=>`${name} ~ '^[a-f0-9]{64}$'`;
const tenant=(columns,extra={})=>({
 columns:{organizationId:column(),id:column(),createdAt:column('timestamp',{default:'now()'}),...columns},
 primary:['organizationId','id'],
 references:[{columns:['organizationId'],target:'organizations',targetColumns:['id']},...(extra.references??[])],
 unique:extra.unique??[],checks:extra.checks??[],indexes:extra.indexes??[]
});
const ref=(columns,target,targetColumns=['organizationId','id'])=>({columns,target,targetColumns});
const tenantRef=(name,target)=>ref(['organizationId',name],target);
const identityColumns={userId:column(),keyId:column(),keyFingerprint:column()};

export const controlTableSpecs={
 auth_challenges:tenant({...identityColumns,nonceDigest:column(),origin:column(),expiresAt:column('timestamp'),consumedAt:column('timestamp',{nullable:true})},{
  references:[tenantRef('userId','users')],
  unique:[['organizationId','id','userId','keyId','keyFingerprint']],
  checks:[digest('key_fingerprint'),digest('nonce_digest'),"origin ~ '^https://127[.]0[.]0[.]1:[0-9]{4,5}$'","expires_at > created_at AND expires_at <= created_at + interval '60 seconds'",'consumed_at IS NULL OR consumed_at >= created_at'],
  indexes:[['organizationId','expiresAt']]
 }),
 auth_sessions:tenant({...identityColumns,challengeId:column(),tokenHash:column(),expiresAt:column('timestamp'),revokedAt:column('timestamp',{nullable:true})},{
  references:[tenantRef('userId','users'),ref(['organizationId','challengeId','userId','keyId','keyFingerprint'],'auth_challenges',['organizationId','id','userId','keyId','keyFingerprint'])],
  unique:[['organizationId','tokenHash'],['organizationId','challengeId']],
  checks:[digest('key_fingerprint'),digest('token_hash'),"expires_at > created_at AND expires_at <= created_at + interval '15 minutes'",'revoked_at IS NULL OR revoked_at >= created_at'],
  indexes:[['organizationId','expiresAt']]
 }),
 approval_request_bindings:tenant({requestId:column(),requesterUserId:column('text',{nullable:true}),requesterAgentId:column('text',{nullable:true}),resourceType:column(),resourceVersion:column('integer'),policyVersion:column('integer'),risk:column(),requestDigest:column()},{
  references:[tenantRef('requestId','approval_requests'),tenantRef('requesterUserId','users'),tenantRef('requesterAgentId','agents')],
  unique:[['organizationId','requestId'],['organizationId','requestId','requestDigest']],
  checks:['(requester_user_id IS NOT NULL) <> (requester_agent_id IS NOT NULL)','resource_version > 0','policy_version > 0',"risk IN ('low','medium','high','critical')","resource_type ~ '^[a-z][a-z0-9-]{2,63}$'",digest('request_digest')]
 }),
 approval_decisions:{...tableSpecs.approval_decisions,
  columns:{...tableSpecs.approval_decisions.columns,version:column('integer',{default:'1'})},
  references:[...tableSpecs.approval_decisions.references,ref(['organizationId','requestId','requestDigest'],'approval_request_bindings',['organizationId','requestId','requestDigest'])],
  unique:[['organizationId','requestId','version']],
  checks:[...tableSpecs.approval_decisions.checks,'version > 0']
 }
};

function freeze(value) {for(const child of Object.values(value)) if(child&&typeof child==='object'&&!Object.isFrozen(child)) freeze(child);return Object.freeze(value);}
freeze(controlTableSpecs);
const snake=value=>value.replace(/[A-Z]/g,letter=>'_'+letter.toLowerCase());
const quote=value=>'"'+snake(value)+'"';
function indexesFor(spec) {
 const result=[...(spec.indexes??[])],covered=[spec.primary,...spec.unique,...result];
 for(const foreign of spec.references) if(!covered.some(keys=>foreign.columns.every((key,i)=>keys[i]===key))) {result.push(foreign.columns);covered.push(foreign.columns);}
 return result;
}
const builders={text,integer,timestamp:name=>timestamp(name,{withTimezone:true,mode:'date'})};
export const controlSchema={};
for(const [name,spec] of Object.entries(controlTableSpecs)) {
 const columns={};
 for(const [key,definition] of Object.entries(spec.columns)) {
  let builder=builders[definition.type](snake(key));
  if(!definition.nullable) builder=builder.notNull();
  if(definition.default!==undefined) builder=builder.default(sql.raw(definition.default));
  columns[key]=builder;
 }
 controlSchema[name]=pgTable(name,columns,table=>[
  primaryKey({columns:spec.primary.map(key=>table[key])}),
  ...spec.references.map((foreign,n)=>foreignKey({name:name+'_fk'+n,columns:foreign.columns.map(key=>table[key]),foreignColumns:foreign.targetColumns.map(key=>(controlSchema[foreign.target]??schema[foreign.target])[key])})),
  ...spec.unique.map((keys,n)=>unique(name+'_u'+n).on(...keys.map(key=>table[key]))),
  ...spec.checks.map((expression,n)=>check(name+'_c'+n,sql.raw(expression))),
  ...indexesFor(spec).map((keys,n)=>index(name+'_i'+n).on(...keys.map(key=>table[key])))
 ]);
}
Object.freeze(controlSchema);

export function buildControlMigrationSql() {
 const statements=['-- StackPilot local control migration 2. Storage only; control login remains disabled.'];
 const sqlTypes={text:'text',integer:'integer',timestamp:'timestamp with time zone'};
 for(const [name,spec] of Object.entries(controlTableSpecs)) {
  if(name==='approval_decisions') continue;
  const parts=Object.entries(spec.columns).map(([key,d])=>'  '+quote(key)+' '+sqlTypes[d.type]+(d.nullable?'':' NOT NULL')+(d.default!==undefined?' DEFAULT '+d.default:''));
  parts.push('  PRIMARY KEY ('+spec.primary.map(quote).join(', ')+')');
  spec.unique.forEach((keys,n)=>parts.push('  CONSTRAINT '+quote(name+'_u'+n)+' UNIQUE ('+keys.map(quote).join(', ')+')'));
  spec.checks.forEach((expression,n)=>parts.push('  CONSTRAINT '+quote(name+'_c'+n)+' CHECK ('+expression+')'));
  statements.push('CREATE TABLE '+quote(name)+' (\n'+parts.join(',\n')+'\n);');
 }
 statements.push('ALTER TABLE approval_decisions ADD COLUMN version integer NOT NULL DEFAULT 1;');
 statements.push('ALTER TABLE approval_decisions DROP CONSTRAINT approval_decisions_u0;');
 statements.push('ALTER TABLE approval_decisions ADD CONSTRAINT approval_decisions_u0 UNIQUE (organization_id, request_id, version);');
 statements.push('ALTER TABLE approval_decisions ADD CONSTRAINT approval_decisions_c2 CHECK (version > 0);');
 for(const [name,spec] of Object.entries(controlTableSpecs)) {
  spec.references.forEach((foreign,n)=>{
   if(name==='approval_decisions'&&n<3) return;
   statements.push('ALTER TABLE '+quote(name)+' ADD CONSTRAINT '+quote(name+'_fk'+n)+' FOREIGN KEY ('+foreign.columns.map(quote).join(', ')+') REFERENCES '+quote(foreign.target)+' ('+foreign.targetColumns.map(quote).join(', ')+')'+(name==='approval_decisions'?' NOT VALID':'')+';');
  });
  indexesFor(spec).forEach((keys,n)=>{
   // The v1 decider-user index already exists; new request-digest FK needs a separate index.
   if(name==='approval_decisions'&&n===0) return;
   statements.push('CREATE INDEX '+quote(name+'_i'+n)+' ON '+quote(name)+' ('+keys.map(quote).join(', ')+');');
  });
 }
 statements.push(`DO $$ BEGIN
 IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='stackpilot_control') THEN
  CREATE ROLE stackpilot_control NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  COMMENT ON ROLE stackpilot_control IS 'stackpilot-local-control-v2-no-login';
 ELSE
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='stackpilot_control' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolinherit AND NOT rolreplication AND NOT rolbypassrls AND rolconfig IS NULL AND shobj_description(oid,'pg_authid')='stackpilot-local-control-v2-no-login')
   OR EXISTS (SELECT FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname='stackpilot_control') OR roleid=(SELECT oid FROM pg_roles WHERE rolname='stackpilot_control'))
   OR EXISTS (SELECT FROM pg_shdepend WHERE refclassid='pg_authid'::regclass AND refobjid=(SELECT oid FROM pg_roles WHERE rolname='stackpilot_control') AND (deptype='o' OR (deptype IN ('a','i') AND (dbid=0 OR dbid=(SELECT oid FROM pg_database WHERE datname=current_database()))))) THEN
   RAISE EXCEPTION 'Unexpected control role configuration';
  END IF;
 END IF;
END $$;`);
 statements.push('GRANT USAGE ON SCHEMA public TO stackpilot_control;');
 for(const name of Object.keys(controlTableSpecs).filter(name=>name!=='approval_decisions')) {
  const condition="organization_id = nullif(current_setting('stackpilot.organization_id', true), '')";
  statements.push('ALTER TABLE '+quote(name)+' ENABLE ROW LEVEL SECURITY;');
  statements.push('ALTER TABLE '+quote(name)+' FORCE ROW LEVEL SECURITY;');
  statements.push('CREATE POLICY tenant_scope ON '+quote(name)+' USING ('+condition+') WITH CHECK ('+condition+');');
  statements.push('REVOKE ALL ON TABLE '+quote(name)+' FROM PUBLIC, stackpilot_app, stackpilot_control;');
  statements.push('GRANT SELECT, INSERT ON TABLE '+quote(name)+' TO stackpilot_control;');
 }
 // This reviewed role owns no tables; grants never confer authority on the application role.
 for(const name of Object.keys(tableSpecs)) statements.push('REVOKE ALL ON TABLE '+quote(name)+' FROM stackpilot_control;');
 statements.push('GRANT SELECT ON TABLE users, agents, approval_requests, approval_decisions TO stackpilot_control;');
 statements.push('GRANT INSERT ON TABLE approval_decisions, audit_events, outbox_events TO stackpilot_control;');
 statements.push('GRANT UPDATE (consumed_at) ON TABLE auth_challenges TO stackpilot_control;');
 statements.push('GRANT UPDATE (revoked_at) ON TABLE auth_sessions TO stackpilot_control;');
 return statements.join('\n\n')+'\n';
}
