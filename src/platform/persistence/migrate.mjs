import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {buildMigrationSql} from './schema.mjs';
import {buildControlMigrationSql} from './control-schema.mjs';
import {fields} from '../contracts/validation.mjs';

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
  if(![1,2].includes(target)) throw new Error('Invalid migration target');
  const reviewed=[
    {bytes:readFileSync(migrationUrl),manifest:JSON.parse(readFileSync(manifestUrl,'utf8')),verify:verifyMigration},
    {bytes:readFileSync(new URL('./migrations/0002_local_identity_approvals.sql',import.meta.url)),manifest:JSON.parse(readFileSync(new URL('./migrations/control-manifest.json',import.meta.url),'utf8')),verify:verifyControlMigration}
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
