import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {getTableConfig} from 'drizzle-orm/pg-core';
import {schema,buildMigrationSql} from '../src/platform/persistence/schema.mjs';
import {normalizeLocalConnection} from '../src/platform/persistence/connection.mjs';
import {prepareCandidateImport} from '../src/platform/persistence/candidate-import.mjs';
import {verifyMigration,applyMigrations} from '../src/platform/persistence/migrate.mjs';
import {withTransaction} from '../src/platform/persistence/transaction.mjs';

const read = path => JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const products = read('../src/data/products.json');
const evidenceLeads = read('../src/data/evidence-leads.json');
const claims = read('../src/data/research-claims.json');
const connection = () => ({host:'127.0.0.1',port:55439,user:'stackpilot_app',database:'stackpilot_test',clusterId:'cluster-synthetic'});

test('canonical persistence schema covers all planned domains using real Drizzle tables',()=>{
 const required = ['organizations','users','roles','permissions','memberships','role_permissions','agents','agent_capabilities','workflow_definitions','workflow_versions','workflow_executions','tasks','task_dependencies','task_attempts','idempotency_keys','categories','vendors','products','product_aliases','product_claims','evidence_sources','claim_evidence','product_reviews','recommendations','market_opportunities','market_observations','competitors','seasonal_trends','keywords','keyword_clusters','content','content_versions','content_claims','partnerships','partnership_events','affiliate_programmes','commission_terms','revenue_forecasts','commission_records','external_statements','approval_requests','approval_decisions','audit_events','outbox_events','system_settings','retention_jobs','scheduled_jobs'];
 assert.deepEqual(Object.keys(schema).sort(),required.sort());
 for (const [name,table] of Object.entries(schema)) {
  const metadata = getTableConfig(table);
  assert.equal(metadata.name,name);
  assert.ok(metadata.columns.some(column=>column.name==='id'));
 }
 const ddl = buildMigrationSql();
 assert.match(ddl,/FORCE ROW LEVEL SECURITY/);
 assert.match(ddl,/NOBYPASSRLS/);
 assert.match(ddl,/REVOKE ALL ON TABLE "approval_decisions"/);
});

test('local database selection requires explicit loopback configuration and an owned cluster marker',()=>{
 assert.equal(normalizeLocalConnection(connection()).host,'127.0.0.1');
 for (const patch of [{host:'localhost'},{host:'db.example.com'},{database:'postgres'},{user:'postgres'},{port:543},{clusterId:''},{connectionString:'postgresql://example.com/private'},{ssl:true}]) {
  assert.throws(()=>normalizeLocalConnection({...connection(),...patch}),/Invalid local database/);
 }
 assert.throws(()=>normalizeLocalConnection(),/Invalid local database/);
});

test('candidate import preserves stable product identities and independently unapproved source/claim records',()=>{
 const prepared = prepareCandidateImport({products,evidenceLeads,claims});
 assert.equal(prepared.products.length,6);
 assert.deepEqual(prepared.products.map(product=>product.id).sort(),products.map(product=>product.id).sort());
 assert.equal(prepared.claims.length,6);
 assert.ok(prepared.sources.length>=6);
 assert.ok(prepared.products.every(product=>product.affiliateUrl===null && product.status==='candidate'));
 assert.ok(prepared.claims.every(claim=>claim.status==='candidate' && claim.approved===false));
 assert.match(prepared.sourceDigest,/^[a-f0-9]{64}$/);
 assert.equal(prepareCandidateImport({products:[...products].reverse(),evidenceLeads:[...evidenceLeads].reverse(),claims:[...claims].reverse()}).sourceDigest,prepared.sourceDigest);
 for (const mutated of [products.map((product,index)=>index===0?{...product,verified:true}:product),products.map((product,index)=>index===0?{...product,affiliateUrl:'https://example.com/tracking'}:product)]) {
  assert.throws(()=>prepareCandidateImport({products:mutated,evidenceLeads,claims}),/Invalid|approved|Affiliate|verification/i);
 }
 assert.throws(()=>prepareCandidateImport({products,evidenceLeads,claims:claims.map((claim,index)=>index===0?{...claim,approved:true}:claim)}),/approved/i);
});

test('migration validation binds exact SQL bytes, version and canonical schema before any connection',()=>{
 const sql = readFileSync(new URL('../src/platform/persistence/migrations/0001_platform_foundation.sql',import.meta.url));
 const manifest = read('../src/platform/persistence/migrations/manifest.json');
 assert.equal(verifyMigration(sql,manifest),true);
 assert.throws(()=>verifyMigration(Buffer.concat([sql,Buffer.from('-- altered')]),manifest),/migration/i);
 assert.throws(()=>verifyMigration(sql,{...manifest,version:2}),/migration/i);
 assert.throws(()=>verifyMigration(sql,{...manifest,sha256:'0'.repeat(64)}),/migration/i);
 assert.equal(sql.toString(),buildMigrationSql());
});

test('rollback transport failure discards the transaction client and preserves sanitized errors',async()=>{
 let discarded;
 const client = {query:async query=>{
  if (query.includes('AS restricted')) return {rows:[{restricted:true}]};
  if (query==='ROLLBACK') throw new Error('SYNTHETIC_SENSITIVE_TEST_VALUE');
  return {rows:[]};
 },release:value=>{discarded=value;}};
 await assert.rejects(withTransaction({connect:async()=>client},{organizationId:'org-alpha',actorId:'system-test',requestId:'request-test'},()=>{throw new Error('SYNTHETIC_SENSITIVE_TEST_VALUE');}),error=>error.message==='Persistence operation failed');
 assert.equal(discarded,true);
});

test('failed migration rollback discards its client without emitting the underlying database detail',async()=>{
 let discarded;
 const client = {query:async query=>{
  if (query.startsWith('-- StackPilot') || query==='ROLLBACK') throw new Error('SYNTHETIC_SENSITIVE_TEST_VALUE');
  return {rows:[]};
 },release:value=>{discarded=value;}};
 await assert.rejects(applyMigrations({connect:async()=>client}),error=>error.message==='Migration failed or history drift detected');
 assert.equal(discarded,true);
});

test('null callback and migration failures still return generic persistence errors',async()=>{
 const client = {query:async query=>{
  if (query.includes('AS restricted')) return {rows:[{restricted:true}]};
  return {rows:[]};
 },release:()=>{}};
 await assert.rejects(withTransaction({connect:async()=>client},{organizationId:'org-alpha',actorId:'system-test',requestId:'request-test'},()=>{throw null;}),error=>error.message==='Persistence operation failed');
 const migration = {query:async query=>{
  if (query.startsWith('-- StackPilot')) throw null;
  return {rows:[]};
 },release:()=>{}};
 await assert.rejects(applyMigrations({connect:async()=>migration}),error=>error.message==='Migration failed or history drift detected');
});

test('candidate CLI dry-run reports validated counts without requiring a database',()=>{
 const script = fileURLToPath(new URL('../scripts/platform-import-candidates.mjs',import.meta.url));
 const result = spawnSync(process.execPath,[script,'--dry-run'],{encoding:'utf8',env:{...process.env,STACKPILOT_LOCAL_DATABASE:''}});
 assert.equal(result.status,0,result.stderr);
 const summary = JSON.parse(result.stdout);
 assert.equal(summary.dryRun,true);
 assert.equal(summary.counts.products,6);
 assert.equal(summary.counts.claims,6);
 assert.match(summary.sourceDigest,/^[a-f0-9]{64}$/);
});

test('database CLIs reject implicit writes and unavailable configuration with sanitized errors',()=>{
 const importer = fileURLToPath(new URL('../scripts/platform-import-candidates.mjs',import.meta.url));
 const migrator = fileURLToPath(new URL('../scripts/platform-db-migrate.mjs',import.meta.url));
 for (const [script,args] of [[importer,[]],[importer,['--approve']],[importer,['--apply','--organization','org-alpha','--actor','system-test','--request','request-test']],[migrator,[]],[migrator,['--apply']]]) {
  const result = spawnSync(process.execPath,[script,...args],{encoding:'utf8',env:{...process.env,STACKPILOT_LOCAL_DATABASE:''}});
  assert.equal(result.status,1);
  assert.equal(result.stdout,'');
  assert.match(result.stderr,/failed/);
 }
});
