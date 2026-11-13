import {execFileSync,spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,appendFileSync,realpathSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:net';
import pg from 'pg';

const bin = process.env.STACKPILOT_PG_BIN ?? (process.platform==='win32'?'C:\\Program Files\\PostgreSQL\\18-FixKart\\bin':execFileSync('pg_config',['--bindir'],{encoding:'utf8',windowsHide:true}).trim());
const executable = name => join(bin,name+(process.platform==='win32'?'.exe':''));
if (!existsSync(executable('initdb'))) throw new Error('Approved PostgreSQL binaries unavailable');
const version = execFileSync(executable('postgres'),['--version'],{encoding:'utf8',windowsHide:true}).trim();
if (!/PostgreSQL\) (16|18)\./.test(version)) throw new Error('PostgreSQL integration requires a reviewed major version 16 or 18');
console.log('PostgreSQL integration runtime '+version);
const root = realpathSync(mkdtempSync(join(tmpdir(),'stackpilot-db-')));
const dataDirectory = join(root,'data');
const clusterId = 'cluster-'+randomUUID();
let started = false;
let resultCode = 1;
const run = (name,args) => execFileSync(executable(name),args,{windowsHide:true,stdio:'ignore',timeout:60000});

try {
  run('initdb',['-D',dataDirectory,'--username=stackpilot_local','--auth=trust','--no-locale','--encoding=UTF8']);
  const server = createServer();
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const port = server.address().port;
  await new Promise(resolve=>server.close(resolve));
  appendFileSync(join(dataDirectory,'postgresql.conf'),`\nlisten_addresses = '127.0.0.1'\nport = ${port}\nunix_socket_directories = ''\nshared_buffers = '16MB'\nmax_connections = 20\nstackpilot.cluster_id = '${clusterId}'\n`);
  started = true;
  run('pg_ctl',['-D',dataDirectory,'-l',join(root,'server.log'),'-w','start']);
  const admin = new pg.Client({host:'127.0.0.1',port,user:'stackpilot_local',database:'postgres',connectionTimeoutMillis:5000});
  await admin.connect();
  try {
    const actual = await admin.query('SHOW data_directory');
    if (realpathSync(actual.rows[0].data_directory)!==realpathSync(dataDirectory)) throw new Error('Unexpected test cluster');
    await admin.query('CREATE DATABASE stackpilot_test');
    await admin.query('CREATE DATABASE stackpilot_restore');
    await admin.query('CREATE DATABASE stackpilot_failure');
    await admin.query('CREATE DATABASE stackpilot_control_test');
    await admin.query('CREATE DATABASE stackpilot_control_failure');
    await admin.query('CREATE DATABASE stackpilot_control_restore');
    await admin.query('CREATE DATABASE stackpilot_control_fresh');
    await admin.query('CREATE DATABASE stackpilot_control_acl_collision');
    await admin.query('CREATE DATABASE stackpilot_control_owner_collision');
    await admin.query('CREATE DATABASE stackpilot_identity_test');
    await admin.query('CREATE DATABASE stackpilot_approval_test');
    await admin.query('CREATE DATABASE stackpilot_approval_fresh');
    await admin.query('CREATE DATABASE stackpilot_approval_failure');
  } finally {
    await admin.end();
  }
  mkdirSync(join(root,'backup'));
  const config = {host:'127.0.0.1',port,user:'stackpilot_local',database:'stackpilot_test',clusterId};
  const result = spawnSync(process.execPath,['--test','tests/integration/platform-persistence.test.mjs'],{
    stdio:'inherit',windowsHide:true,timeout:120000,env:{...process.env,STACKPILOT_TEST_DB:JSON.stringify(config),STACKPILOT_TEST_BACKUP:join(root,'backup','database.dump'),STACKPILOT_PG_BIN:bin}
  });
  resultCode = result.status ?? 1;
  if(resultCode===0) {
    const control=spawnSync(process.execPath,['--test','tests/integration/platform-control-migration.test.mjs'],{
      stdio:'inherit',windowsHide:true,timeout:120000,env:{...process.env,STACKPILOT_TEST_DB:JSON.stringify({...config,database:'stackpilot_control_test'}),STACKPILOT_TEST_BACKUP:join(root,'backup','control.dump'),STACKPILOT_PG_BIN:bin}
    });
    resultCode=control.status??1;
  }
  if(resultCode===0) {
    const identity=spawnSync(process.execPath,['--test','tests/integration/platform-identity-sessions.test.mjs'],{
      stdio:'inherit',windowsHide:true,timeout:120000,env:{...process.env,STACKPILOT_TEST_DB:JSON.stringify({...config,database:'stackpilot_identity_test'})}
    });
    resultCode=identity.status??1;
  }
  if(resultCode===0) {
    const approval=spawnSync(process.execPath,['--test','tests/integration/platform-approval-service.test.mjs'],{
      stdio:'inherit',windowsHide:true,timeout:120000,env:{...process.env,STACKPILOT_TEST_DB:JSON.stringify({...config,database:'stackpilot_approval_test'})}
    });
    resultCode=approval.status??1;
  }
} finally {
  let stopped = !started;
  if (started && existsSync(join(dataDirectory,'postmaster.pid'))) {
    try {run('pg_ctl',['-D',dataDirectory,'-m','fast','-w','stop']);stopped=true;}
    catch {console.error('Owned test PostgreSQL instance could not be stopped');resultCode=1;}
  } else stopped = true;
  if (stopped) {
    const target = realpathSync(root);
    const intendedParent = realpathSync(tmpdir());
    if (dirname(target)!==intendedParent || !basename(target).startsWith('stackpilot-db-') || resolve(target)!==resolve(root)) throw new Error('Unsafe test cleanup target');
    if (started && !readFileSync(join(dataDirectory,'postgresql.conf'),'utf8').includes(clusterId)) throw new Error('Test ownership marker missing');
    rmSync(target,{recursive:true,force:true,maxRetries:5,retryDelay:200});
  }
}
process.exitCode = resultCode;
