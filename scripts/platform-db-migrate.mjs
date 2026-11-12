import {openLocalPool} from '../src/platform/persistence/connection.mjs';
import {applyMigrations} from '../src/platform/persistence/migrate.mjs';

let pool;
try {
  const args=process.argv.slice(2);
  if(args[0]!=='--apply'||!(args.length===1||args.length===3&&args[1]==='--target-version'&&['1','2'].includes(args[2]))) throw new Error();
  const config = JSON.parse(process.env.STACKPILOT_LOCAL_DATABASE ?? 'null');
  if (config?.user!=='stackpilot_local') throw new Error();
  pool = await openLocalPool(config);
  console.log(JSON.stringify(await applyMigrations(pool,{targetVersion:args.length===3?Number(args[2]):1})));
} catch {
  console.error('Migration failed. Explicit --apply and verified owned local database configuration are required.');
  process.exitCode = 1;
} finally {
  if (pool) await pool.end();
}
