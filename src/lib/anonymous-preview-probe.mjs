/**
 * Limited read-only, unauthenticated response-status sampler for one owner
 * controlled Netlify Deploy Preview. It never establishes release readiness,
 * current deployed SHA, full access-control security, or private live UAT.
 * Requests exactly two fixed site pages, with no credentials or redirects.
 */
const origin='https://deploy-preview-1--inspiring-chaja-cfb85f.netlify.app';
const routes=Object.freeze(['/','/compare/']);
const allowedOptions=['fetchImpl','requestedCommit','timeoutMs'];
const hexCommit=/^[0-9a-f]{40}$/;
export function assessAnonymousHttpStatus(status){
 if(status===401||status===403)return 'DENIED_FROM_CI_RUNNER';
 if(Number.isInteger(status)&&status>=200&&status<=299)
  return 'POTENTIAL_ANONYMOUS_RESPONSE';
 return 'INCONCLUSIVE';
}
export async function probeAnonymousPreview(options={}){
 if(!options||typeof options!=='object'||Array.isArray(options)||
    Object.keys(options).some(key=>!allowedOptions.includes(key)))
  throw new Error('Invalid anonymous probe options or origin');
 const {fetchImpl=fetch,requestedCommit,timeoutMs=4000}=options;
 if(typeof requestedCommit!=='string'||!hexCommit.test(requestedCommit))
  throw new Error('Invalid requested Git SHA for anonymous preview probe');
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>4000)
  throw new Error('Invalid anonymous preview timeout');
 if(typeof fetchImpl!=='function')throw new Error('Invalid fetch implementation');
 const samples=[];
 for(const path of routes){
  let httpStatus=null,status='INCONCLUSIVE';
  try{
   const result=await fetchImpl(origin+path,{
    method:'GET',redirect:'manual',credentials:'omit',cache:'no-store',
    headers:{Accept:'text/html'},signal:AbortSignal.timeout(timeoutMs)
   });
   if(Number.isInteger(result?.status)&&result.status>=100&&result.status<=599)
    httpStatus=result.status;
   status=assessAnonymousHttpStatus(httpStatus);
   // Never collect content, cookies, header values, login URL or sensitive error details.
   try{await result?.body?.cancel?.();}catch{}
  }catch{
   // The error may embed private proxy URLs/tokens. Record no exception text.
  }
  samples.push({path,httpStatus,status});
 }
 const values=new Set(samples.map(x=>x.status));
 const overallStatus=values.has('POTENTIAL_ANONYMOUS_RESPONSE')
  ?'POTENTIAL_ANONYMOUS_RESPONSE'
  :values.has('INCONCLUSIVE')?'INCONCLUSIVE':'DENIED_FROM_CI_RUNNER';
 return{
  schemaVersion:1,source:'anonymous-ci-runner-sample',requestedCommit,
  currentDeployShaVerified:false,
  remoteAuthenticatedUatPassed:false,publicReleaseAuthorized:false,
  canMonetize:false,canSpend:false,
  sampleCount:samples.length,overallStatus,samples,
  limitations:[
   'CI runner status samples are not proof of private access for all visitors.',
   'Requested commit is not verified as the actual version served by the preview host.',
   'Even 401/403 responses never replace authenticated owner testing, response-header review or provider account checks.',
   'A 2xx HTTP status may be a public login page; flag for human review, not a confirmed data leak.'
  ]
 };
}
