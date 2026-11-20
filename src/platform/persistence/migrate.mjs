import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {buildMigrationSql} from './schema.mjs';
import {buildControlMigrationSql} from './control-schema.mjs';
import {fields} from '../contracts/validation.mjs';
import {buildApprovalMigrationSql} from './approval-schema.mjs';
import {buildRunnerMigrationSql} from './runner-schema.mjs';
import {buildSchedulerMigrationSql} from './scheduler-schema.mjs';
import {buildMarketMigrationSql} from './market-schema.mjs';
import {buildReconciliationMigrationSql} from './reconciliation-schema.mjs';
import {buildProductMigrationSql} from './product-schema.mjs';
import {buildLifecycleMigrationSql} from './lifecycle-schema.mjs';
import {buildPricingMigrationSql} from './pricing-schema.mjs';

const migrationUrl = new URL('./migrations/0001_platform_foundation.sql',import.meta.url);
const manifestUrl = new URL('./migrations/manifest.json',import.meta.url);

function canonicalBytes(bytes) {
  if (!Buffer.isBuffer(bytes)) throw new Error('Invalid migration bytes');
  return Buffer.from(bytes.toString('latin1').replace(/\r\n/g,'\n'),'latin1');
}

export function verifyMigration(bytes,manifest) {
  fields(manifest,['version','file','sha256']);
  const canonical = canonicalBytes(bytes);
  const digest = createHash('sha256').update(canonical).digest('hex');
  if (manifest?.version !== 1 || manifest?.file !== '0001_platform_foundation.sql' || manifest?.sha256 !== digest || canonical.toString() !== buildMigrationSql()) {
    throw new Error('Invalid or changed migration');
  }
  return true;
}

export function verifyControlMigration(bytes,manifest) {
  fields(manifest,['version','file','sha256']);
  const canonical=canonicalBytes(bytes);
  if(manifest.version!==2||manifest.file!=='0002_local_identity_approvals.sql'||manifest.sha256!==createHash('sha256').update(canonical).digest('hex')||canonical.toString()!==buildControlMigrationSql()) throw new Error('Invalid or changed migration');
  return true;
}

export async function applyMigrations(pool,options={}) {
  fields(options,[],['targetVersion']);
  const target=Object.hasOwn(options,'targetVersion')?options.targetVersion:1;
  if(![1,2,3,4,5,6,7,8,9,10].includes(target)) throw new Error('Invalid migration target');
  const reviewed=[
    {bytes:readFileSync(migrationUrl),manifest:JSON.parse(readFileSync(manifestUrl,'utf8')),verify:verifyMigration},
    {bytes:readFileSync(new URL('./migrations/0002_local_identity_approvals.sql',import.meta.url)),manifest:JSON.parse(readFileSync(new URL('./migrations/control-manifest.json',import.meta.url),'utf8')),verify:verifyControlMigration},
    {bytes:readFileSync(new URL('./migrations/0003_independent_approvals.sql',import.meta.url)),manifest:JSON.parse(readFileSync(new URL('./migrations/approval-manifest.json',import.meta.url),'utf8')),verify:verifyApprovalMigration},
    {bytes:readFileSync(new URL('./migrations/0004_synthetic_runner.sql',import.meta.url)),manifest:JSON.parse(readFileSync(new URL('./migrations/runner-manifest.json',import.meta.url),'utf8')),verify:verifyRunnerMigration},
    {bytes:readFileSync(new URL('./migrations/0005_local_scheduler.sql',import.meta.url)),manifest:JSON.parse(readFileSync(new URL('./migrations/scheduler-manifest.json',import.meta.url),'utf8')),verify:verifySchedulerMigration},
    {bytes:readFileSync(new URL('./migrations/0006_market_observations.sql',import.meta.url)),manifest:JSON.parse(readFileSync(new URL('./migrations/market-manifest.json',import.meta.url),'utf8')),verify:verifyMarketMigration},
    {bytes:readFileSync(new URL('./migrations/0007_candidate_reconciliation.sql',import.meta.url)),manifest:JSON.parse(readFileSync(new URL('./migrations/reconciliation-manifest.json',import.meta.url),'utf8')),verify:verifyReconciliationMigration},
    {bytes:readFileSync(new URL('./migrations/0008_product_candidates.sql',import.meta.url)),manifest:JSON.parse(readFileSync(new URL('./migrations/product-manifest.json',import.meta.url),'utf8')),verify:verifyProductMigration},
    {bytes:readFileSync(new URL('./migrations/0009_claim_lifecycle.sql',import.meta.url)),manifest:JSON.parse(readFileSync(new URL('./migrations/lifecycle-manifest.json',import.meta.url),'utf8')),verify:verifyLifecycleMigration},
    {bytes:readFileSync(new URL('./migrations/0010_pricing_observations.sql',import.meta.url)),manifest:JSON.parse(readFileSync(new URL('./migrations/pricing-manifest.json',import.meta.url),'utf8')),verify:verifyPricingMigration}
  ];
  for(const migration of reviewed) migration.verify(migration.bytes,migration.manifest);
  const client = await pool.connect();
  let discard = false;
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query('SELECT pg_advisory_xact_lock(781240001)');
    await client.query('CREATE TABLE IF NOT EXISTS _platform_migrations (version integer PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    const applied = await client.query('SELECT version, sha256 FROM _platform_migrations ORDER BY version');
    if (applied.rows.length > target || applied.rows.some((row,i)=>row.version !== i+1 || row.sha256 !== reviewed[i].manifest.sha256)) throw new Error('Migration history drift');
    for(const migration of reviewed.slice(applied.rows.length,target)) {
      await client.query(canonicalBytes(migration.bytes).toString());
      await client.query('INSERT INTO _platform_migrations(version,sha256) VALUES ($1,$2)',[migration.manifest.version,migration.manifest.sha256]);
    }
    await client.query('COMMIT');
    return Object.freeze({version:target,applied:applied.rows.length<target});
  } catch (error) {
    try {await client.query('ROLLBACK');}
    catch {discard=true;}
    const safe = new Error('Migration failed or history drift detected');
    if (typeof error?.code==='string' && /^[A-Z0-9]{5}$/.test(error.code)) safe.code = error.code;
    throw safe;
  } finally {
    client.release(discard);
  }
}

export function verifyApprovalMigration(bytes,manifest) {
  fields(manifest,['version','file','sha256']);
  const canonical=canonicalBytes(bytes);
  if(manifest.version!==3||manifest.file!=='0003_independent_approvals.sql'||manifest.sha256!==createHash('sha256').update(canonical).digest('hex')||canonical.toString()!==buildApprovalMigrationSql()) throw new Error('Invalid or changed migration');
  return true;
}

export function verifyRunnerMigration(bytes,manifest){
 fields(manifest,['version','file','sha256']);
 const canonical=canonicalBytes(bytes);
 if(manifest.version!==4||manifest.file!=='0004_synthetic_runner.sql'||manifest.sha256!==createHash('sha256').update(canonical).digest('hex')||canonical.toString()!==buildRunnerMigrationSql())throw new Error('Invalid or changed migration');
 return true;
}

export function verifySchedulerMigration(bytes,manifest){
 fields(manifest,['version','file','sha256']);
 const canonical=canonicalBytes(bytes);
 if(manifest.version!==5||manifest.file!=='0005_local_scheduler.sql'||manifest.sha256!==createHash('sha256').update(canonical).digest('hex')||canonical.toString()!==buildSchedulerMigrationSql())throw new Error('Invalid or changed migration');
 return true;
}

export function verifyMarketMigration(bytes,manifest){
 fields(manifest,['version','file','sha256']);
 const canonical=canonicalBytes(bytes);
 if(manifest.version!==6||manifest.file!=='0006_market_observations.sql'||manifest.sha256!==createHash('sha256').update(canonical).digest('hex')||canonical.toString()!==buildMarketMigrationSql())throw new Error('Invalid or changed migration');
 return true;
}

export function verifyReconciliationMigration(bytes, manifest) {
  fields(manifest, ['version', 'file', 'sha256']);
  const canonical = canonicalBytes(bytes);
  if (manifest.version !== 7 || manifest.file !== '0007_candidate_reconciliation.sql' || manifest.sha256 !== createHash('sha256').update(canonical).digest('hex') || canonical.toString() !== buildReconciliationMigrationSql()) throw new Error('Invalid or changed migration');
  return true;
}

export function verifyProductMigration(bytes, manifest) {
  fields(manifest, ['version', 'file', 'sha256']);
  const canonical = canonicalBytes(bytes);
  if (manifest.version !== 8 || manifest.file !== '0008_product_candidates.sql' || manifest.sha256 !== createHash('sha256').update(canonical).digest('hex') || canonical.toString() !== buildProductMigrationSql()) throw new Error('Invalid or changed migration');
  return true;
}

export function verifyLifecycleMigration(bytes, manifest) {
  fields(manifest, ['version', 'file', 'sha256']);
  const canonical = canonicalBytes(bytes);
  if (manifest.version !== 9 || manifest.file !== '0009_claim_lifecycle.sql' || manifest.sha256 !== createHash('sha256').update(canonical).digest('hex') || canonical.toString() !== buildLifecycleMigrationSql()) throw new Error('Invalid or changed migration');
  return true;
}

export function verifyPricingMigration(bytes, manifest) {
  fields(manifest, ['version', 'file', 'sha256']);
  const canonical=canonicalBytes(bytes);
  if(manifest.version!==10||manifest.file!=='0010_pricing_observations.sql'||manifest.sha256!==createHash('sha256').update(canonical).digest('hex')||canonical.toString()!==buildPricingMigrationSql()) throw new Error('Invalid or changed migration');
  return true;
}
