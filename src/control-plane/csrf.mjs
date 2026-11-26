export const SESSION_COOKIE='__Host-stackpilot_session';

export function parseSessionCookie(header,required=true) {
  if(typeof header!=='string'||header.length>4096) throw new Error();
  let session;
  for(const item of header.split(';')) {
    const part=item.trim();
    const separator=part.indexOf('=');
    if(separator<1) throw new Error();
    const name=part.slice(0,separator),value=part.slice(separator+1);
    if(!/^[A-Za-z0-9_!#$%&'*+.^|~-]+$/.test(name)||/[\x00-\x20\x7f-\xff,"\\]/.test(value)) throw new Error();
    if(name===SESSION_COOKIE) {
      if(session!==undefined) throw new Error();
      const match=/^([a-z][a-z0-9]*(?:-[a-z0-9]+)*)\.([A-Za-z0-9_-]{43})$/.exec(value);
      if(!match||match[1].length>64) throw new Error();
      session=Object.freeze({keyId:match[1],token:match[2]});
    }
  }
  if(!session&&required) throw new Error();
  return session;
}

export function sessionCookie(keyId,token) {
  // Validate before interpolating response header values.
  parseSessionCookie(SESSION_COOKIE+'='+keyId+'.'+token);
  return SESSION_COOKIE+'='+keyId+'.'+token+'; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=900';
}

export function expiredSessionCookie() {
  return SESSION_COOKIE+'=; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
}
