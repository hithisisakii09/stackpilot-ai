import {createServer} from 'node:https';
import {loadControlConfiguration} from './config.mjs';
import {createControlHandler,respond} from './routes.mjs';
import {openLocalControlPool,openLocalPool} from '../platform/persistence/connection.mjs';
import {createIdentityService} from '../platform/identity/sessions.mjs';
import {createApprovalService} from '../platform/approvals/service.mjs';
import {auditCurrentEditorialRuntimeSurface} from '../../scripts/editorial-runtime-source.mjs';

export async function startLocalControlPlane(options) {
  let pool,appPool,server,closed=false,closing;
  const sockets=new Set();
  function close() {
    if(closing) return closing;
    closed=true;
    closing=(async()=>{
      if(server?.listening) {
        const stopped=new Promise(resolve=>server.close(resolve));
        for(const socket of sockets) socket.destroy();
        await stopped;
      }
      if(appPool) await appPool.end();
      if(pool) await pool.end();
    })();
    return closing;
  }
  try {
    if(auditCurrentEditorialRuntimeSurface().status!=='STATIC-ONLY-LOCKED') throw new Error();
    const config=loadControlConfiguration(options);
    pool=await openLocalControlPool(config.database);
    pool.on('error',()=>{void close().catch(()=>{});});
    await pool.query(`SELECT c.version,s.token_hash,b.request_digest,r.action,a.id,u.id,d.decision,p.website,e.source_digest,ce.id
      FROM public.product_claims c,public.auth_sessions s,public.approval_request_bindings b,public.approval_requests r,
      public.agents a,public.users u,public.approval_decisions d,public.products p,public.evidence_sources e,public.claim_evidence ce LIMIT 0`);
    const grants=await pool.query(`SELECT
      has_table_privilege(current_user,'auth_sessions','INSERT') AND has_table_privilege(current_user,'auth_challenges','INSERT')
      AND has_table_privilege(current_user,'approval_requests','INSERT') AND has_table_privilege(current_user,'approval_request_bindings','INSERT')
      AND has_table_privilege(current_user,'approval_decisions','INSERT') AND has_table_privilege(current_user,'audit_events','INSERT')
      AND has_table_privilege(current_user,'outbox_events','INSERT') AND has_column_privilege(current_user,'auth_sessions','revoked_at','UPDATE')
      AND has_column_privilege(current_user,'auth_challenges','consumed_at','UPDATE') AS ready`);
    if(grants.rows[0]?.ready!==true) throw new Error();
    if(closed) throw new Error();
    const identity=createIdentityService({pool,trustPath:config.trustPath,origin:config.origin});
    const approvals=createApprovalService({identity});
    appPool=await openLocalPool({...config.database,user:'stackpilot_app'});
    server=createServer({key:config.key,cert:config.cert,minVersion:'TLSv1.2',handshakeTimeout:5000,maxHeaderSize:8192,
      requestTimeout:5000,headersTimeout:5000,keepAliveTimeout:1000,connectionsCheckingInterval:1000,
      highWaterMark:8192,rejectNonStandardBodyWrites:true},createControlHandler({identity,approvals,appPool,origin:config.origin,authority:config.authority}));
    // Retain an extra pair so application rejection sees a count above 32.
    server.maxHeadersCount=33;
    server.maxRequestsPerSocket=100;
    server.on('connection',socket=>{
      if(sockets.size>=32) return socket.destroy();
      sockets.add(socket);
      socket.setTimeout(10000,()=>socket.destroy());
      socket.once('close',()=>sockets.delete(socket));
    });
    server.on('tlsClientError',()=>{});
    server.on('clientError',(error,socket)=>{
      const status=error.code==='HPE_HEADER_OVERFLOW'?'431 Request Header Fields Too Large':'400 Bad Request';
      const body='{"error":"Request denied"}';
      if(socket.writable) socket.end('HTTP/1.1 '+status+'\r\nConnection: close\r\nContent-Type: application/json\r\nCache-Control: no-store\r\nContent-Length: '+Buffer.byteLength(body)+'\r\n\r\n'+body);
    });
    server.on('checkContinue',(req,res)=>respond(req,res,417,{error:'Request denied'}));
    server.on('checkExpectation',(req,res)=>respond(req,res,417,{error:'Request denied'}));
    await new Promise((resolve,reject)=>{
      const failed=()=>{server.off('close',aborted);reject(new Error());};
      const aborted=()=>{server.off('error',failed);reject(new Error());};
      server.once('error',failed);
      server.once('close',aborted);
      server.listen({host:'127.0.0.1',port:config.port,exclusive:true},()=>{
        server.off('error',failed);server.off('close',aborted);
        if(closed) {server.close(()=>reject(new Error()));return;}
        resolve();
      });
    });
    server.on('error',()=>{void close().catch(()=>{});});
    return Object.freeze({origin:config.origin,close});
  } catch {
    try {await close();} catch {}
    throw new Error('Local HTTPS startup failed');
  }
}
