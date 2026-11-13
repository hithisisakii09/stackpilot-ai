import {sql} from 'drizzle-orm';
import {fields,id,json} from '../platform/contracts/validation.mjs';
import {parseUnambiguousJson} from '../platform/identity/trust.mjs';
import {withAuthenticatedTransaction} from '../platform/identity/sessions.mjs';
import {parseSessionCookie,sessionCookie,expiredSessionCookie} from './csrf.mjs';

class RequestFailure extends Error {
  constructor(status) {super('Request denied');this.status=status;}
}
const deny=status=>{throw new RequestFailure(status);};

function single(req,name) {
  let count=0;
  for(let i=0;i<req.rawHeaders.length;i+=2) if(req.rawHeaders[i].toLowerCase()===name) count++;
  if(count>1) deny(400);
  return req.headers[name];
}

export function respond(req,res,status,body,headers={}) {
  if(res.destroyed||res.writableEnded) return;
  res.writeHead(status,{
    'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
    'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",
    'Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow, noarchive',
    'Strict-Transport-Security':'max-age=31536000','Connection':'close',...headers
  });
  res.end(req.method==='HEAD'?undefined:JSON.stringify(body));
}

async function body(req) {
  const contentType=single(req,'content-type');
  if(typeof contentType!=='string'||!/^application\/json(?:;\s*charset=utf-8)?$/i.test(contentType)||single(req,'content-encoding')!==undefined) deny(415);
  const length=single(req,'content-length');
  if(length!==undefined&&(!/^(0|[1-9][0-9]{0,8})$/.test(length)||Number(length)>8192)) deny(413);
  const bytes=await new Promise((resolve,reject)=>{
    const chunks=[];
    let total=0,finished=false;
    const timer=setTimeout(()=>finish(new RequestFailure(408)),5000);
    timer.unref();
    function finish(error) {
      if(finished) return;
      finished=true;
      clearTimeout(timer);
      req.off('data',data);req.off('end',end);req.off('aborted',aborted);req.off('error',aborted);
      if(error) {req.pause();reject(error);} else resolve(Buffer.concat(chunks));
    }
    function data(chunk) {total+=chunk.length;if(total>8192) finish(new RequestFailure(413));else chunks.push(chunk);}
    function end() {finish();}
    function aborted() {finish(new RequestFailure(400));}
    req.on('data',data);req.once('end',end);req.once('aborted',aborted);req.once('error',aborted);
  });
  try {return parseUnambiguousJson(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
  catch {deny(400);}
}

export function createControlHandler({identity,approvals,origin,authority}) {
  const counters={all:{start:performance.now(),count:0},auth:{start:performance.now(),count:0}};
  function throttle(group,limit) {
    const state=counters[group],now=performance.now();
    if(now-state.start>=60000) {state.start=now;state.count=0;}
    if(++state.count>limit) deny(429);
  }
  return async(req,res)=>{
    req.on('error',()=>{});
    try {
      throttle('all',120);
      if(req.rawHeaders.length>64) deny(431);
      if(single(req,'host')!==authority) deny(403);
      const requestOrigin=single(req,'origin');
      if(requestOrigin!==undefined&&requestOrigin!==origin) deny(403);
      if(!['GET','POST'].includes(req.method)) deny(405);
      if(req.method==='POST'&&requestOrigin!==origin) deny(403);
      if(typeof req.url!=='string'||req.url.length>2048||!/^\/[a-z0-9/-]*$/.test(req.url)) deny(400);
      const path=req.url;
      if(single(req,'authorization')!==undefined||single(req,'expect')!==undefined) deny(400);
      const cookieHeader=single(req,'cookie');
      const csrf=single(req,'x-csrf-token');
      if(path==='/auth/challenge'||path==='/auth/session') {
        throttle('auth',30);
        if(req.method!=='POST') deny(405);
        if(cookieHeader!==undefined) {try {parseSessionCookie(cookieHeader,false);} catch {deny(400);}}
        const input=await body(req);
        if(path==='/auth/challenge') return respond(req,res,200,await identity.createChallenge(input));
        const session=await identity.completeChallenge(input);
        return respond(req,res,200,{csrfToken:session.csrfToken,expiresAt:session.expiresAt},{'Set-Cookie':sessionCookie(input.keyId,session.token)});
      }
      const decisionPath=/^\/approval-requests\/([a-z][a-z0-9-]{2,63})\/(decisions|revocations)$/.exec(path);
      const known=['/session','/logout','/agents','/approval-requests'];
      if(!known.includes(path)&&!decisionPath) deny(404);
      let credentials,handle;
      try {credentials=parseSessionCookie(cookieHeader);handle=await identity.authenticate(credentials);}
      catch {deny(401);}
      if(req.method==='POST') {
        try {await identity.verifyCsrf(handle,csrf);} catch {deny(403);}
      }
      if(path==='/session') {
        if(req.method!=='GET') deny(405);
        return respond(req,res,200,await identity.sessionInformation(handle));
      }
      if(path==='/logout') {
        if(req.method!=='POST') deny(405);
        fields(await body(req),[]);
        await identity.logout(credentials);
        return respond(req,res,200,{loggedOut:true},{'Set-Cookie':expiredSessionCookie()});
      }
      if(path==='/agents') {
        if(req.method!=='GET') deny(405);
        const agents=await withAuthenticatedTransaction(identity,handle,false,async tx=>{
          const result=await tx.db.execute(sql`SELECT id,role,version,enabled,cost_inr FROM public.agents WHERE organization_id=${tx.scope.organizationId} ORDER BY id LIMIT 101`);
          if(result.rows.length>100) deny(403);
          return json(result.rows);
        });
        return respond(req,res,200,agents);
      }
      if(path==='/approval-requests') {
        const value=req.method==='GET'?await approvals.listPending(handle):await approvals.createClaimRequest(handle,await body(req));
        return respond(req,res,200,value);
      }
      const requestId=id(decisionPath[1]);
      if(req.method==='GET') {
        if(decisionPath[2]!=='decisions') deny(405);
        return respond(req,res,200,await approvals.history(handle,{requestId}));
      }
      const input=await body(req);
      fields(input,decisionPath[2]==='decisions'?['decision','expectedVersion','requestDigest']:['expectedVersion','requestDigest']);
      const method=decisionPath[2]==='decisions'?'decide':'revoke';
      return respond(req,res,200,await approvals[method](handle,{...input,requestId}));
    } catch(error) {
      const status=error instanceof RequestFailure?error.status:
        error?.message==='Identity operation failed'?401:
        error?.message==='Approval operation failed'?403:400;
      respond(req,res,status,{error:'Request denied'},status===429?{'Retry-After':'60'}:{});
    }
  };
}
