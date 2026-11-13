import {drizzle} from 'drizzle-orm/node-postgres';
import {fields,id} from '../contracts/validation.mjs';
import {schema} from './schema.mjs';
import {controlSchema} from './control-schema.mjs';
import {assertControlAccess} from './control-access.mjs';
import {approvalSchema} from './approval-schema.mjs';

// This internal persistence scope requires trusted session binding in Phase 1C.
export async function withTransaction(pool,context,callback) {
  return guardedTransaction(pool,context,callback,'stackpilot_app',schema);
}

export async function withControlTransaction(pool,context,callback) {
  return guardedTransaction(pool,context,callback,'stackpilot_control',{...schema,...controlSchema,...approvalSchema});
}

async function guardedTransaction(pool,context,callback,expectedRole,tables) {
  fields(context,['organizationId','actorId','requestId']);
  const scope = Object.freeze({organizationId:id(context.organizationId),actorId:id(context.actorId),requestId:id(context.requestId)});
  if (typeof callback !== 'function') throw new Error('Invalid transaction callback');
  const client = await pool.connect();
  const operations = new Set();
  const queries = new Set();
  let active = false;
  let began = false;
  let discard = false;

  function tracked(set,promise) {
    set.add(promise);
    promise.then(()=>set.delete(promise),()=>set.delete(promise));
    return promise;
  }
  function track(work) {
    if (!active) return Promise.reject(new Error('Inactive persistence transaction'));
    return tracked(operations,Promise.resolve().then(work));
  }
  const guardedClient = {query:(...args)=>{
    if (!active) return Promise.reject(new Error('Inactive persistence transaction'));
    return tracked(queries,Promise.resolve(client.query(...args)));
  }};
  try {
    if (expectedRole==='stackpilot_control') {
      await assertControlAccess(client);
    } else {
      const role = await client.query("SELECT current_user = 'stackpilot_app' AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolinherit AS restricted FROM pg_roles WHERE rolname=current_user");
      if (role.rows[0]?.restricted !== true) throw new Error('Invalid persistence role');
    }
    await client.query('BEGIN');
    began = true;
    if(expectedRole==='stackpilot_control') await client.query('SET LOCAL search_path = pg_catalog, public, pg_temp');
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '10s'");
    await client.query("SELECT set_config('stackpilot.organization_id',$1,true)",[scope.organizationId]);
    active = true;
    const result = await callback(Object.freeze({db:drizzle(guardedClient,{schema:tables}),scope,track}));
    const unfinished = operations.size>0 || queries.size>0;
    active = false;
    await Promise.allSettled([...operations,...queries]);
    if (unfinished) throw new Error('Unfinished persistence operation');
    await client.query('COMMIT');
    began = false;
    return result;
  } catch (error) {
    active = false;
    await Promise.allSettled([...operations,...queries]);
    if (began) {
      try {await client.query('ROLLBACK');}
      catch {discard=true;}
    }
    const safe = new Error('Persistence operation failed');
    const code = error?.code ?? error?.cause?.code;
    if (typeof code === 'string' && /^[A-Z0-9]{5}$/.test(code)) safe.code = code;
    throw safe;
  } finally {
    active = false;
    client.release(discard);
  }
}
