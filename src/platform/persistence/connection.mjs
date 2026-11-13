import pg from 'pg';
import {fields,id,integer} from '../contracts/validation.mjs';
import {assertControlAccess} from './control-access.mjs';

export function normalizeLocalConnection(value) {
  try {
    fields(value,['host','port','user','database','clusterId']);
    if (value.host !== '127.0.0.1' || !['stackpilot_local','stackpilot_app'].includes(value.user)) throw new Error();
    if (typeof value.database !== 'string' || !/^stackpilot_[a-z0-9_]{1,40}$/.test(value.database)) throw new Error();
    return Object.freeze({host:value.host,port:integer(value.port,1024,65535),user:value.user,database:value.database,clusterId:id(value.clusterId)});
  } catch {
    throw new Error('Invalid local database configuration');
  }
}

export async function openLocalPool(value) {
  const config = normalizeLocalConnection(value);
  return verifiedPool(config);
}

export async function openLocalControlPool(value) {
  fields(value,['host','port','user','database','clusterId']);
  if (value.user!=='stackpilot_control') throw new Error('Invalid local database configuration');
  const base=normalizeLocalConnection({...value,user:'stackpilot_app'});
  return verifiedPool({...base,user:'stackpilot_control'});
}

async function verifiedPool(config) {
  const pool = new pg.Pool({
    host:config.host,port:config.port,user:config.user,database:config.database,
    max:4,connectionTimeoutMillis:5000,idleTimeoutMillis:1000,
    options:'-c statement_timeout=10000',application_name:'stackpilot-local-persistence'
  });
  try {
    const result = await pool.query("SELECT current_database() AS database, current_user AS username, current_setting('stackpilot.cluster_id',true) AS cluster_id");
    const actual = result.rows[0];
    if (actual.database !== config.database || actual.username !== config.user || actual.cluster_id !== config.clusterId) throw new Error();
    if (config.user === 'stackpilot_app') {
      const role = await pool.query('SELECT rolsuper, rolbypassrls, rolcreaterole, rolcreatedb, rolinherit FROM pg_roles WHERE rolname = current_user');
      if (Object.values(role.rows[0]).some(Boolean)) throw new Error();
      const memberships = await pool.query('SELECT count(*) FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname=current_user)');
      if (memberships.rows[0].count !== '0') throw new Error();
    }
    if (config.user === 'stackpilot_control') await assertControlAccess(pool);
    return pool;
  } catch {
    await pool.end();
    throw new Error('Local database verification failed');
  }
}
