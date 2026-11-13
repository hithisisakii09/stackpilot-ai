import {openSyntheticRunner} from '../../src/platform/orchestration/runner.mjs';
import {expectedOutput} from '../../src/platform/orchestration/dag.mjs';
const runner=await openSyntheticRunner(JSON.parse(process.env.STACKPILOT_TEST_DB));
const scoped=runner.scope('org-alpha');
const [mode,execution]=process.argv.slice(2);
try {
 if(mode==='claim'||mode==='claim-complete'){
  const lease=await scoped.claim(execution);
  if(mode==='claim-complete')await scoped.complete(lease,expectedOutput(lease.work));
  console.log(JSON.stringify({attempt:lease.attempt}));
 }else if(mode==='recover-run'){
  await scoped.recover(execution);await scoped.run(execution);console.log(JSON.stringify({status:(await scoped.inspect(execution)).status}));
 }else throw new Error('Unknown fixture mode');
 // Exit without runner.close to model abrupt process loss after the DB commit.
 process.exit(0);
}finally{await runner.close();}
