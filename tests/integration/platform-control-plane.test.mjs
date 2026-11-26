import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {readFileSync,mkdtempSync,writeFileSync,realpathSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer,Server as NetServer} from 'node:net';
import {request as httpsRequest} from 'node:https';
import {connect as tlsConnect} from 'node:tls';
import {openLocalPool} from '../../src/platform/persistence/connection.mjs';
import {applyMigrations} from '../../src/platform/persistence/migrate.mjs';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {startLocalControlPlane} from '../../src/control-plane/server.mjs';

const config=JSON.parse(process.env.STACKPILOT_TEST_DB??'null');
if(config?.database!=='stackpilot_https_test') throw new Error('Use the disposable test harness');
const admin=await openLocalPool(config);
const root=realpathSync(mkdtempSync(join(tmpdir(),'stackpilot-https-')));
const openssl=process.platform==='win32'?'C:\\Program Files\\Git\\usr\\bin\\openssl.exe':'openssl';
const file=name=>join(root,name);
const run=args=>execFileSync(openssl,args,{stdio:'ignore',windowsHide:true,timeout:30000,env:{...process.env,OPENSSL_CONF:file('openssl.cnf')}});
let app;

test('local control plane through CA-verified HTTPS clients',async t=>{
 try {
  console.log('Synthetic TLS runtime '+execFileSync(openssl,['version'],{encoding:'utf8',windowsHide:true}).trim());
  writeFileSync(file('openssl.cnf'),'[req]\ndistinguished_name=dn\n[dn]\n');
  run(['req','-x509','-newkey','rsa:2048','-nodes','-keyout',file('ca.key'),'-out',file('ca.crt'),'-subj','/CN=StackPilot Synthetic Test CA','-days','1','-addext','basicConstraints=critical,CA:TRUE','-addext','keyUsage=critical,keyCertSign,cRLSign']);
  run(['req','-new','-newkey','rsa:2048','-nodes','-keyout',file('server.key'),'-out',file('server.csr'),'-subj','/CN=127.0.0.1']);
  writeFileSync(file('extensions.cnf'),'subjectAltName=IP:127.0.0.1\nextendedKeyUsage=serverAuth\nbasicConstraints=CA:FALSE\n');
  run(['x509','-req','-in',file('server.csr'),'-CA',file('ca.crt'),'-CAkey',file('ca.key'),'-CAcreateserial','-out',file('server.crt'),'-days','1','-extfile',file('extensions.cnf')]);
  await applyMigrations(admin,{targetVersion:3});
  const keys={owner:generateKeyPairSync('ed25519'),reviewer:generateKeyPairSync('ed25519'),foreign:generateKeyPairSync('ed25519')};
  const principals=Object.entries(keys).map(([role,key])=>({keyId:role+'-key',userId:role+'-user',organizationId:role==='foreign'?'org-beta':'org-alpha',role:role==='foreign'?'owner':role,publicKeySpkiBase64:key.publicKey.export({type:'spki',format:'der'}).toString('base64')}));
  const trust=entries=>writeFileSync(file('trust.json'),JSON.stringify({schemaVersion:1,principals:entries}));
  trust(principals);
  for(const org of ['org-alpha','org-beta']) {
   await admin.query('INSERT INTO organizations(id,name) VALUES ($1,$2)',[org,'Synthetic HTTPS organization']);
   await admin.query("INSERT INTO categories(organization_id,id,slug,name) VALUES ($1,'category-test','category-test','Synthetic category')",[org]);
   await admin.query("INSERT INTO vendors(organization_id,id,name,website) VALUES ($1,'vendor-test','Synthetic vendor','https://example.com/')",[org]);
   await admin.query("INSERT INTO products(organization_id,id,category_id,vendor_id,slug,name,website) VALUES ($1,'product-test','category-test','vendor-test','product-test','Synthetic product','https://example.com/')",[org]);
   await admin.query("INSERT INTO agents(organization_id,id,role,version) VALUES ($1,$2,'qa',1)",[org,org==='org-alpha'?'qa-agent':'beta-agent']);
   await admin.query("INSERT INTO product_claims(organization_id,id,product_id,statement,caveat) VALUES ($1,'claim-test','product-test','Synthetic HTTPS review claim','Unverified synthetic evidence')",[org]);
   await admin.query("INSERT INTO evidence_sources(organization_id,id,product_id,source_url,collected_at,source_digest) VALUES ($1,'source-test','product-test','https://example.com/source',now()-interval '1 day',$2)",[org,'a'.repeat(64)]);
   await admin.query("INSERT INTO claim_evidence(organization_id,id,product_id,claim_id,source_id) VALUES ($1,'link-test','product-test','claim-test','source-test')",[org]);
  }
  for(const principal of principals) await admin.query("INSERT INTO users(organization_id,id,display_name) VALUES ($1,$2,'Synthetic user')",[principal.organizationId,principal.userId]);
  const probe=createServer();
  await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));
  const port=probe.address().port;
  await new Promise(resolve=>probe.close(resolve));
  const origin='https://127.0.0.1:'+port;
  const settings={origin,trustPath:file('trust.json'),tlsKeyPath:file('server.key'),tlsCertPath:file('server.crt'),database:{...config,user:'stackpilot_control'}};
  await t.test('startup rejects missing, unsafe, mismatched and unprovisioned configuration',async()=>{
   for(const value of [null,{...settings,origin:'https://0.0.0.0:'+port},{...settings,tlsKeyPath:file('ca.key')},{...settings,trustPath:file('missing.json')},settings]) {
    await assert.rejects(startLocalControlPlane(value),error=>error.message==='Local HTTPS startup failed'&&!error.cause);
   }
  });
  await admin.query('ALTER ROLE stackpilot_control LOGIN');
  app=await startLocalControlPlane(settings);
  await app.close();
  // Exercise the same explicit CLI used for operational startup.
  const child=spawn(process.execPath,[fileURLToPath(new URL('../../scripts/platform-control-plane.mjs',import.meta.url)),'--start'],{
    windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,STACKPILOT_CONTROL_CONFIG:JSON.stringify(settings)}
  });
  app={close:async()=>{
    if(child.exitCode!==null||child.signalCode!==null) return;
    await new Promise(resolve=>{child.once('exit',resolve);child.kill('SIGTERM');});
  }};
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Synthetic CLI startup timeout')),15000);
    child.once('error',()=>{clearTimeout(timer);reject(new Error('Synthetic CLI startup failed'));});
    child.once('exit',()=>{clearTimeout(timer);reject(new Error('Synthetic CLI startup failed'));});
    child.stdout.on('data',data=>{if(data.toString().includes('Local HTTPS control plane started')) {clearTimeout(timer);resolve();}});
    child.stderr.on('data',()=>{});
  });
  const ca=readFileSync(file('ca.crt'));
  async function call(method,path,{data,raw,cookie,csrf,headers={},trusted=true,omitOrigin=false}={}) {
   const payload=raw??(data===undefined?undefined:JSON.stringify(data));
   return new Promise((resolve,reject)=>{
    const req=httpsRequest(origin+path,{method,ca:trusted?ca:undefined,rejectUnauthorized:true,servername:'',agent:false,
     headers:{...(method==='POST'&&!omitOrigin?{Origin:origin}:{}),...(payload===undefined?{}:{'Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...headers}},res=>{
      let text='';res.on('data',chunk=>{text+=chunk;});res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,value:text?JSON.parse(text):null}));
     });
    req.on('error',()=>reject(new Error('Synthetic HTTPS client failed')));
    req.setTimeout(10000,()=>req.destroy());
    req.end(payload);
   });
  }
  async function login(role) {
   const challenge=await call('POST','/auth/challenge',{data:{keyId:role+'-key'}});
   assert.equal(challenge.status,200);
   const value=challenge.value;
   const proof={keyId:value.keyId,challengeId:value.challengeId,nonce:value.nonce,signature:sign(null,Buffer.from(value.message),keys[role].privateKey).toString('base64url')};
   const session=await call('POST','/auth/session',{data:proof});
   assert.equal(session.status,200);
   assert.equal(Object.hasOwn(session.value,'token'),false);
   const setCookie=session.headers['set-cookie'][0];
   assert.equal(setCookie.startsWith('__Host-stackpilot_session='),true);
   for(const flag of ['Secure','HttpOnly','SameSite=Strict','Path=/','Max-Age=900']) assert.equal(setCookie.includes(flag),true);
   assert.equal(setCookie.includes('Domain='),false);
   return {cookie:setCookie.split(';')[0],csrf:session.value.csrfToken,proof};
  }
  const owner=await login('owner'),reviewer=await login('reviewer'),foreign=await login('foreign');
  const capture=async requestId=>{
   const result=await call('POST','/approval-requests',{...reviewer,data:{requestId,agentId:'qa-agent',claimId:'claim-test'}});
   assert.equal(result.status,200);return result.value;
  };
  const decide=(request,decision='approved',who=owner)=>call('POST','/approval-requests/'+request.requestId+'/decisions',{...who,data:{decision,expectedVersion:0,requestDigest:request.requestDigest}});
  await t.test('CA trust, authenticated session/CSRF and scoped agent reads',async()=>{
   await assert.rejects(call('GET','/session',{trusted:false}),/Synthetic HTTPS client failed/);
   assert.equal((await call('GET','/session')).status,401);
   const session=await call('GET','/session',owner);
   assert.equal(session.status,200);
   assert.equal(session.value.userId,'owner-user');
   assert.equal(Object.hasOwn(session.value,'token'),false);
   assert.equal(session.headers['cache-control'],'no-store');
   assert.equal(session.headers['access-control-allow-origin'],undefined);
   assert.equal((await call('GET','/agents',owner)).value[0].id,'qa-agent');
   assert.equal((await call('GET','/agents',foreign)).value[0].id,'beta-agent');
   assert.equal((await call('POST','/auth/session',{data:owner.proof})).status,401);
  });
  await t.test('Host, Origin, cookies, CSRF and identity assertions fail closed',async()=>{
   assert.equal((await call('GET','/session',{...owner,headers:{Host:'evil.invalid'}})).status,403);
   assert.equal((await call('GET','/session',{...owner,headers:{Origin:'https://evil.invalid'}})).status,403);
   assert.equal((await call('POST','/logout',{...owner,data:{},headers:{Origin:'https://evil.invalid'}})).status,403);
   assert.equal((await call('POST','/logout',{...owner,data:{},omitOrigin:true})).status,403);
   assert.equal((await call('GET','/session',{cookie:owner.cookie+'; '+owner.cookie})).status,401);
   assert.equal((await call('GET','/session',{cookie:'__Host-stackpilot_session=forged'})).status,401);
   assert.equal((await call('POST','/logout',{cookie:owner.cookie,data:{}})).status,403);
   assert.equal((await call('POST','/approval-requests',{...reviewer,data:{requestId:'request-forged',agentId:'qa-agent',claimId:'claim-test',role:'owner',organizationId:'org-alpha'}})).status,403);
  });
  await t.test('independent approval, history, revocation and rejection over HTTPS',async()=>{
   const request=await capture('request-success');
   assert.equal((await call('GET','/approval-requests',owner)).value.length,1);
   assert.equal((await decide(request,'approved',reviewer)).status,403);
   assert.equal((await decide(request,'approved',foreign)).status,403);
   assert.equal((await call('GET','/approval-requests/request-success/decisions',foreign)).status,403);
   assert.equal((await decide(request)).status,200);
   assert.equal((await decide(request)).status,403);
   assert.equal((await call('POST','/approval-requests/request-success/revocations',{...owner,data:{expectedVersion:1,requestDigest:request.requestDigest}})).status,200);
   assert.deepEqual((await call('GET','/approval-requests/request-success/decisions',owner)).value.map(row=>row.decision),['approved','revoked']);
   const rejected=await capture('request-rejected');
   assert.equal((await decide(rejected,'rejected')).status,200);
   assert.equal((await call('POST','/approval-requests/request-rejected/revocations',{...owner,data:{expectedVersion:1,requestDigest:rejected.requestDigest}})).status,403);
   const self=await call('POST','/approval-requests',{...owner,data:{requestId:'request-self',agentId:'qa-agent',claimId:'claim-test'}});
   assert.equal((await decide(self.value)).status,403);
  });
  await t.test('stale and conflicting decisions preserve immutable history',async()=>{
   const stale=await capture('request-stale');
   await admin.query("UPDATE product_claims SET version=2 WHERE organization_id='org-alpha'");
   assert.equal((await decide(stale)).status,403);
   await admin.query("UPDATE product_claims SET version=1 WHERE organization_id='org-alpha'");
   const raced=await capture('request-race');
   const results=await Promise.all([decide(raced),decide(raced,'rejected')]);
   assert.deepEqual(results.map(row=>row.status).sort(),[200,403]);
   assert.equal((await call('GET','/approval-requests/request-race/decisions',owner)).value.length,1);
  });
  await t.test('expiry, trust changes and logout invalidate transport sessions',async()=>{
   const expired=await login('owner');
   const token=expired.cookie.slice(expired.cookie.indexOf('=')+1).split('.')[1];
   await admin.query("UPDATE auth_sessions SET created_at=now()-interval '30 minutes',expires_at=now()-interval '15 minutes' WHERE token_hash=$1",[createHash('sha256').update(token).digest('hex')]);
   assert.equal((await call('GET','/session',expired)).status,401);
   trust(principals.map(principal=>principal.organizationId==='org-alpha'?{...principal,role:principal.role==='owner'?'reviewer':'owner'}:principal));
   assert.equal((await call('GET','/session',owner)).status,401);
   trust(principals);
   const logout=await call('POST','/logout',{...owner,data:{}});
   assert.equal(logout.status,200);
   assert.equal(logout.headers['set-cookie'][0].includes('Max-Age=0'),true);
   assert.equal((await call('GET','/session',owner)).status,401);
  });
  await t.test('method, JSON, content type, duplicate fields and byte/header limits',async()=>{
   assert.equal((await call('PUT','/session')).status,405);
   assert.equal((await call('GET','/session?role=owner',reviewer)).status,400);
   assert.equal((await call('POST','/auth/challenge',{raw:'{'})).status,400);
   assert.equal((await call('POST','/auth/challenge',{raw:'{"keyId":"owner-key","keyId":"reviewer-key"}'})).status,400);
   assert.equal((await call('POST','/auth/challenge',{raw:'{}',headers:{'Content-Type':'text/plain'}})).status,415);
   assert.equal((await call('POST','/logout',{...reviewer,raw:'x'.repeat(8193)})).status,413);
   assert.equal((await call('POST','/logout',{...reviewer,raw:'x'.repeat(8193),headers:{'Transfer-Encoding':'chunked'}})).status,413);
   assert.equal((await call('GET','/session',{...reviewer,headers:{'X-Large':'x'.repeat(9000)}})).status,431);
   assert.equal((await call('GET','/session',{...reviewer,headers:Object.fromEntries(Array.from({length:33},(_,i)=>['X-Bound-'+i,'x']))})).status,431);
   const fragmented=await new Promise((resolve,reject)=>{
    const socket=tlsConnect({host:'127.0.0.1',port,ca,rejectUnauthorized:true,servername:''},async()=>{
     socket.setNoDelay(true);
     socket.write('GET /session HTTP/1.1\r\nHost: 127.0.0.1:'+port+'\r\nCookie: '+reviewer.cookie+'\r\n');
     for(let i=0;i<33;i++) {socket.write('X-Fragment-'+i+': x\r\n');await new Promise(resolve=>setTimeout(resolve,1));}
     socket.write('Origin: https://evil.invalid\r\nConnection: close\r\n\r\n');
    });
    let response='';
    socket.on('data',chunk=>{response+=chunk;if(response.length>16384) socket.destroy();});
    socket.on('end',()=>resolve(Number(/^HTTP\/1\.1 (\d{3})/.exec(response)?.[1]??0)));
    socket.on('error',()=>reject(new Error('Synthetic fragmented TLS request failed')));
    socket.setTimeout(10000,()=>socket.destroy());
   });
   assert.equal(fragmented,431);
  });
  await t.test('authentication and global throttling have bounded shared counters',async()=>{
   let authLimited=false;
   for(let i=0;i<32;i++) {
    const result=await call('POST','/auth/challenge',{data:{unexpected:true}});
    if(result.status===429) {authLimited=true;break;}
   }
   assert.equal(authLimited,true);
   let allLimited=false;
   for(let i=0;i<125;i++) {
    if((await call('GET','/session')).status===429) {allLimited=true;break;}
   }
   assert.equal(allLimited,true);
  });
  await t.test('unexpected idle database disconnect closes the listener safely',async()=>{
   await app.close();
   app=await startLocalControlPlane(settings);
   const stoppedBackends=await admin.query("SELECT pg_terminate_backend(pid) AS terminated FROM pg_stat_activity WHERE datname=current_database() AND usename='stackpilot_control' AND pid<>pg_backend_pid()");
   assert.equal(stoppedBackends.rows.some(row=>row.terminated===true),true);
   let stopped=false;
   for(let attempt=0;attempt<25;attempt++) {
    try {await call('GET','/session');} catch {stopped=true;break;}
    await new Promise(resolve=>setTimeout(resolve,20));
   }
   assert.equal(stopped,true);
  });
  await t.test('database failure during pending listen rejects startup and closes the eventual listener',async context=>{
   await app.close();
   const originalListen=NetServer.prototype.listen;
   let held,terminated=false;
   context.mock.method(NetServer.prototype,'listen',function(...args){
    held=this;
    void admin.query("SELECT pg_terminate_backend(pid) AS terminated FROM pg_stat_activity WHERE datname=current_database() AND usename='stackpilot_control' AND pid<>pg_backend_pid()").then(result=>{
     terminated=result.rows.some(row=>row.terminated===true);
     setTimeout(()=>originalListen.apply(this,args),50);
    }).catch(()=>this.emit('error',new Error('Synthetic startup interruption')));
    return this;
   });
   try {
    await assert.rejects(startLocalControlPlane(settings),error=>error.message==='Local HTTPS startup failed');
    assert.equal(terminated,true);
   } finally {
    context.mock.restoreAll();
    if(held?.listening) await new Promise(resolve=>held.close(resolve));
   }
  });
 } finally {
  if(app) await app.close();
  await admin.query('ALTER ROLE stackpilot_control NOLOGIN');
  await admin.end();
  const target=realpathSync(root);
  if(dirname(target)!==realpathSync(tmpdir())||!basename(target).startsWith('stackpilot-https-')) throw new Error('Unsafe TLS fixture cleanup');
  rmSync(target,{recursive:true,force:true});
 }
});
