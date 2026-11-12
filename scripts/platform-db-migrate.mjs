import {openLocalPool} from '../src/platform/persistence/connection.mjs';
import {applyMigrations} from '../src/platform/persistence/migrate.mjs';

let pool;
try {
  if (process.argv.length!==3 || process.argv[2]!=='--apply') throw new Error();
  const config = JSON.parse(process.env.STACKPILOT_LOCAL_DATABASE ?? 'null');
  if (config?.user!=='stackpilot_local') throw new Error();
  pool = await openLocalPool(config);
  console.log(JSON.stringify(await applyMigrations(pool)));
} catch {
  console.error('Migration failed. Explicit --apply and verified owned local database configuration are required.');
  process.exitCode = 1;
} finally {
  if (pool) await pool.end();
}
