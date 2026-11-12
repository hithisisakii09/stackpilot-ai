import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {buildMigrationSql} from './schema.mjs';

const migrationUrl = new URL('./migrations/0001_platform_foundation.sql',import.meta.url);
const manifestUrl = new URL('./migrations/manifest.json',import.meta.url);

function canonicalBytes(bytes) {
  if (!Buffer.isBuffer(bytes)) throw new Error('Invalid migration bytes');
  return Buffer.from(bytes.toString('latin1').replace(/\r\n/g,'\n'),'latin1');
}

export function verifyMigration(bytes,manifest) {
  const canonical = canonicalBytes(bytes);
  const digest = createHash('sha256').update(canonical).digest('hex');
  if (manifest?.version !== 1 || manifest?.file !== '0001_platform_foundation.sql' || manifest?.sha256 !== digest || canonical.toString() !== buildMigrationSql()) {
    throw new Error('Invalid or changed migration');
  }
  return true;
}

export async function applyMigrations(pool) {
  const bytes = readFileSync(migrationUrl);
  const manifest = JSON.parse(readFileSync(manifestUrl,'utf8'));
  verifyMigration(bytes,manifest);
  const client = await pool.connect();
  let discard = false;
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query('SELECT pg_advisory_xact_lock(781240001)');
    await client.query('CREATE TABLE IF NOT EXISTS _platform_migrations (version integer PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    const applied = await client.query('SELECT version, sha256 FROM _platform_migrations ORDER BY version');
    if (applied.rows.length > 1 || applied.rows.some(row=>row.version !== 1 || row.sha256 !== manifest.sha256)) throw new Error('Migration history drift');
    if (applied.rows.length === 0) {
      await client.query(canonicalBytes(bytes).toString());
      await client.query('INSERT INTO _platform_migrations(version,sha256) VALUES ($1,$2)',[manifest.version,manifest.sha256]);
    }
    await client.query('COMMIT');
    return Object.freeze({version:1,applied:applied.rows.length===0});
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
