/**
 * Build-artifact-derived instructions for owner UAT, never proof of hosted access.
 */
import {buildPrivatePreviewManifest} from './preview-package.mjs';
const remoteIds=[
 'authenticated-current-sha-uat','unauthenticated-preview-denial',
 'netlify-private-and-locked','live-response-security-headers',
 'hosting-billing-and-analytics','owner-legal-editorial-approval'
];
const ownerIds=[
 'publisher-identity','contact-channel','jurisdiction','publisher-channel',
 'commercial-hosting-review','editorial-signoff','legal-privacy-review',
 'authentic-audience-proof','affiliate-application-consent','tax-payout-kyc',
 'production-release'
];
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const keys=(x,fields)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===fields.length&&fields.every(k=>own(x,k));
const hash40=/^[a-f0-9]{40}$/;
const hash64=/^[a-f0-9]{64}$/;
const safeRoute=/^\/(?:[a-zA-Z0-9_-]+\/)*$/;
const manifestKeys=['schemaVersion','mode','sourceCommit','hostingCandidate',
 'productionPromoted','publicLaunchAuthorized','affiliateActivationAuthorized',
 'delegatedSpendINR','fileCount','totalBytes','files'];
function validatedManifest(manifest,policy){
 if(!keys(manifest,manifestKeys))throw new Error('Invalid private preview manifest fields');
 const expected=buildPrivatePreviewManifest(manifest.files,policy,manifest.sourceCommit);
 for(const key of manifestKeys){
  if(key==='files'){
   if(manifest.files.length!==expected.files.length||
    manifest.files.some((f,i)=>!keys(f,['path','bytes','sha256'])||
      f.path!==expected.files[i].path||f.bytes!==expected.files[i].bytes||
      f.sha256!==expected.files[i].sha256))
    throw new Error('Invalid private preview manifest files');
  }else if(manifest[key]!==expected[key])
   throw new Error('Invalid private preview manifest metadata: '+key);
 }
 return expected;
}
function validatedPublisher(p){
 if(!p||p.source!=='repository-only-readiness-inventory'||
    p.status!=='prelaunch-owner-evidence-required'||p.applicationReady!==false||
    p.canPublish!==false||p.canActivateAffiliates!==false||p.canSpend!==false||
    p.publisherIdentityVerified!==false||p.editorialClaimsApproved!==0||
    p.actualTraffic!==null||p.actualEarnings!==null||
    p.programApplicationsSubmitted!==0||p.programsAccepted!==0||
    p.trackingLinksEnabled!==0)
  throw new Error('Invalid publisher approval or evidence');
 const e=p.remotePreviewEvidence;
 if(!e||e.status!=='BLOCKED_UNVERIFIED'||e.readyForPublicRelease!==false||
    e.credentialCollectionAllowed!==false||e.commitsAreApprovalEvidence!==false||
    !Array.isArray(e.gates)||e.gates.length!==remoteIds.length||
    remoteIds.some((id,i)=>{
     const g=e.gates[i];
     return !g||g.id!==id||g.status!=='UNVERIFIED'||
       g.source!=='owner-or-provider-observation';
    }))
  throw new Error('Invalid remote UAT evidence gate');
 if(!Array.isArray(p.ownerGates)||p.ownerGates.length!==ownerIds.length||
    ownerIds.some((id,i)=>{
     const g=p.ownerGates[i];
     return !g||g.id!==id||g.actor!=='owner'||g.status!=='unverified'||
       g.sensitiveValuesStored!==false;
    }))
  throw new Error('Invalid owner gate publisher evidence');
}
const packetKeys=['schemaVersion','source','sourceCommit','routeCount','routes',
 'remoteGates','ownerGates','releaseVerdict','publicReleaseAuthorized',
 'remoteAuthenticatedUatPassed','anonymousPreviewDenialVerified',
 'hostingProviderAccountVerified','editorialClaimsApproved','delegatedSpendINR'];
function verify(packet){
 if(!keys(packet,packetKeys)||packet.schemaVersion!==1||
    packet.source!=='generated-private-preview-manifest'||
    !hash40.test(packet.sourceCommit)||packet.releaseVerdict!=='NO_GO'||
    packet.publicReleaseAuthorized!==false||
    packet.remoteAuthenticatedUatPassed!==false||
    packet.anonymousPreviewDenialVerified!==false||
    packet.hostingProviderAccountVerified!==false||
    packet.editorialClaimsApproved!==0||packet.delegatedSpendINR!==0)
  throw new Error('Invalid or approved UAT packet');
 if(!Array.isArray(packet.routes)||packet.routeCount!==packet.routes.length||
    packet.routes.length===0)throw new Error('Invalid UAT packet route count');
 const seen=new Set();
 for(const r of packet.routes){
  if(!keys(r,['path','buildSha256','status','authenticatedHostedPassed'])||
     !safeRoute.test(r.path)||!hash64.test(r.buildSha256)||
     r.status!=='UNTESTED'||r.authenticatedHostedPassed!==false||
     seen.has(r.path))throw new Error('Invalid or approved UAT packet route');
  seen.add(r.path);
 }
 if(!seen.has('/')||!seen.has('/compare/')||!seen.has('/research/')||
    packet.routes.some((r,i)=>i>0&&packet.routes[i-1].path.localeCompare(r.path,'en')>0))
  throw new Error('Invalid UAT packet route coverage');
 if(!Array.isArray(packet.remoteGates)||packet.remoteGates.length!==remoteIds.length||
    remoteIds.some((id,i)=>{
     const g=packet.remoteGates[i];
     return !keys(g,['id','status','source'])||g.id!==id||
      g.status!=='UNVERIFIED'||g.source!=='owner-or-provider-observation';
    }))throw new Error('Invalid UAT packet remote gate');
 if(!Array.isArray(packet.ownerGates)||packet.ownerGates.length!==ownerIds.length||
    ownerIds.some((id,i)=>{
     const g=packet.ownerGates[i];
     return !keys(g,['id','status'])||g.id!==id||g.status!=='UNVERIFIED';
    }))throw new Error('Invalid UAT packet owner gate');
 return packet;
}
export function buildPrivatePreviewUatPacket({manifest,policy,publisher}={}){
 const m=validatedManifest(manifest,policy);
 validatedPublisher(publisher);
 const routes=m.files.filter(f=>f.path==='index.html'||f.path.endsWith('/index.html'))
  .map(f=>({
   path:f.path==='index.html'?'/':'/'+f.path.slice(0,-'index.html'.length),
   buildSha256:f.sha256,status:'UNTESTED',authenticatedHostedPassed:false
  })).sort((a,b)=>a.path.localeCompare(b.path,'en'));
 return verify({
  schemaVersion:1,source:'generated-private-preview-manifest',
  sourceCommit:m.sourceCommit,routeCount:routes.length,routes,
  remoteGates:remoteIds.map(id=>({
   id,status:'UNVERIFIED',source:'owner-or-provider-observation'
  })),
  ownerGates:ownerIds.map(id=>({id,status:'UNVERIFIED'})),
  releaseVerdict:'NO_GO',publicReleaseAuthorized:false,
  remoteAuthenticatedUatPassed:false,anonymousPreviewDenialVerified:false,
  hostingProviderAccountVerified:false,editorialClaimsApproved:0,delegatedSpendINR:0
 });
}
export function formatPrivatePreviewUatPacketMarkdown(input){
 const p=verify(input);
 return [
  '# StackPilot AI — Private Netlify preview owner UAT packet',
  '',
  '**RELEASE NO-GO — not authenticated hosted-test evidence or a launch approval.**',
  '',
  'Source commit (must match deployed PR preview): '+p.sourceCommit,
  'Emitted static HTML routes requiring UAT: '+p.routeCount,
  'Source: validated private GitHub build manifest, not a live HTTP response.',
  'Share no credentials, tokens, Netlify cookies, customer data or identity documents. Keep no credentials in this report.',
  '',
  '## Authenticated hosted-route checklist',
  'Sign in with the owner browser. Visit each path on the private Netlify preview. Record tests separately in a secured evidence system.',
  '',
  '| Path | Built asset SHA-256 | Authenticated hosted status |',
  '| --- | --- | --- |',
  ...p.routes.map(r=>'| '+r.path+' | '+r.buildSha256+' | UNTESTED |'),
  '',
  '## Remote and provider gates — all UNVERIFIED',
  'Check authenticated current-SHA pages, anonymous preview denial, security headers,',
  'production auto-publish lock, hosting billing/analytics, owner/legal/editorial approval.',
  ...p.remoteGates.map(g=>'- [ ] '+g.id+': '+g.status+' (owner/provider observation required)'),
  '',
  '## Owner review and commercial decision gates',
  ...p.ownerGates.map(g=>'- [ ] '+g.id+': '+g.status+' (keep sensitive proof outside GitHub)'),
  '',
  'No authenticated remote UAT has been demonstrated by this packet.',
  'No anonymous denial, actual security headers, provider privacy/billing or legal approval is proved by GitHub CI.',
  'All catalog/editorial decisions remain unverified; no tracked affiliates or spending authorized.',
  '**Final: NO-GO. Separate human owner approval is required for public production.**',
  ''
 ].join('\n');
}
