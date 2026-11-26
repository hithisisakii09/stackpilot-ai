import {readFileSync} from 'node:fs';
import {openLocalPool} from '../src/platform/persistence/connection.mjs';
import {prepareCandidateImport} from '../src/platform/persistence/candidate-import.mjs';
import {importCandidates} from '../src/platform/persistence/repositories.mjs';

let pool;
try {
  const args = process.argv.slice(2);
  const read = path => JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
  const input = {products:read('../src/data/products.json'),evidenceLeads:read('../src/data/evidence-leads.json'),claims:read('../src/data/research-claims.json')};
  if (args.length===1 && args[0]==='--dry-run') {
    const prepared = prepareCandidateImport(input);
    console.log(JSON.stringify({dryRun:true,sourceDigest:prepared.sourceDigest,counts:{products:prepared.products.length,claims:prepared.claims.length,sources:prepared.sources.length}}));
  } else {
    if (args.length!==7 || args[0]!=='--apply' || args[1]!=='--organization' || args[3]!=='--actor' || args[5]!=='--request') throw new Error();
    const config = JSON.parse(process.env.STACKPILOT_LOCAL_DATABASE ?? 'null');
    if (config?.user!=='stackpilot_app') throw new Error();
    pool = await openLocalPool(config);
    const result = await importCandidates(pool,{organizationId:args[2],actorId:args[4],requestId:args[6]},input);
    console.log(JSON.stringify(result));
  }
} catch {
  console.error('Candidate import failed. Use --dry-run or explicit --apply organization/actor/request arguments and an owned local database.');
  process.exitCode = 1;
} finally {
  if (pool) await pool.end();
}
