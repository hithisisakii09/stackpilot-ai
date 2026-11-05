/**
 * Security contract for future editorial operations.
 *
 * There is NO trusted reviewer identity provider, authorization service,
 * owner-pinned trust root, or externally anchored audit log in the static app.
 * A caller-provided role, token or signature must NEVER grant authorization.
 * This module intentionally exposes no "ALLOW" decision.
 */
export const EDITORIAL_ACTIONS=Object.freeze([
 'read-internal-packets','propose-source','record-needs-evidence',
 'record-rejection','verify-source','approve-claim','revoke-claim',
 'publish-comparison'
]);
const expectedPolicy={
 policyVersion:1,monthlyBudgetINR:0,delegatedSpendINR:0,
 hostingCandidate:'netlify-free',commercialHostingApproved:false,
 productionLaunchApproved:false,affiliateActivationApproved:false,
 paidServicesApproved:false
};
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function requireLockedPolicy(policy){
 if(!record(policy)||Object.keys(policy).length!==Object.keys(expectedPolicy).length||
    Object.entries(expectedPolicy).some(([key,value])=>policy[key]!==value))
  throw new Error('Restrictive operating policy required for editorial authorization');
}
export function evaluateEditorialAuthorization(request={}){
 if(!record(request)||Object.keys(request).length!==2||
    !Object.hasOwn(request,'action')||!Object.hasOwn(request,'policy'))
  throw new Error('Unauthorized editorial identity or authority fields');
 const {action,policy}=request;
 if(typeof action!=='string'||!EDITORIAL_ACTIONS.includes(action))
  throw new Error('Invalid editorial action');
 requireLockedPolicy(policy);
 return {
  action,decision:'DENY',
  reviewerAuthenticated:false,verifiedReviewerRole:false,
  trustedSigningAuthority:false,independentAuditAvailable:false,
  sourceVerified:false,canPublish:false,
  reason:'No independently authenticated reviewer or approval authority is configured'
 };
}

/**
 * Fail-closed audit for source-tree entrypoints that would introduce a server,
 * login, editorial admin route, Astro action, or serverless function.
 * This is not a Netlify account-level configuration or hosted UAT audit.
 */
export function auditEditorialRuntimeSurface({paths,astroConfig,netlifyConfig}={}){
 if(!Array.isArray(paths)||paths.length===0)
  throw new Error('Source paths must be a nonempty array');
 if(typeof astroConfig!=='string'||typeof netlifyConfig!=='string')
  throw new Error('Missing Astro or Netlify static configuration');
 const violations=[];
 const seen=new Set();
 for(const path of paths){
  if(typeof path!=='string'||!path||path.startsWith('/')||
     /[\\\x00-\x1f\x7f?#]/.test(path)||path.includes('//')||
     path.split('/').some(part=>!part||part==='.'||part==='..')||
     !/^[a-z0-9_./\[\]-]+$/i.test(path))
   throw new Error('Invalid repository source path');
  if(seen.has(path.toLowerCase()))throw new Error('Duplicate repository source path');
  seen.add(path.toLowerCase());
  const lower=path.toLowerCase();
  const forbidden=
   /^src\/pages\/(?:api|editorial|review|admin)(?:\/|\.)/.test(lower)||
   /^src\/pages\/.*\.(?:ts|tsx|js|jsx|mjs|cjs|json)$/.test(lower)||
   /^src\/(?:middleware|actions)(?:\/|\.)/.test(lower)||
   /^(?:netlify\/(?:functions|edge-functions)|\.netlify\/functions|functions|api|server|supabase\/functions|cloudflare\/functions)(?:\/|\.)/.test(lower);
  if(forbidden)violations.push(path+': Unapproved server/editorial runtime entrypoint');
 }
 const staticAstro=/^\s*import\s*\{\s*defineConfig\s*\}\s*from\s*['"]astro\/config['"]\s*;?\s*export\s+default\s+defineConfig\(\s*\{\s*output\s*:\s*['"]static['"]\s*,?\s*\}\s*\)\s*;?\s*$/;
 if(!staticAstro.test(astroConfig))
  violations.push('astro.config.mjs: Static-only Astro build invariant not met');
 const sections=[...netlifyConfig.matchAll(/^\s*(\[\[?[^\]\r\n]+\]\]?)\s*$/gm)].map(x=>x[1]);
 if(sections.length!==2||sections[0]!=='[build]'||sections[1]!=='[build.environment]'||
    !/^\s*command\s*=\s*["']npm run build["']\s*$/m.test(netlifyConfig)||
    !/^\s*publish\s*=\s*["']dist["']\s*$/m.test(netlifyConfig)||
    /\/\.netlify\/functions\/|\bhttps?:\/\//i.test(
      netlifyConfig.split('\n').filter(line=>!line.trimStart().startsWith('#')).join('\n')
    ))
  violations.push('netlify.toml: Unreviewed dynamic hosting section, function rewrite or build setting');
 return {
  status:violations.length?'BLOCKED':'STATIC-ONLY-LOCKED',
  checkedPaths:paths.length,reviewerApiEnabled:false,
  authenticatedReviewerService:false,publisherEnabled:false,
  violations
 };
}
