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


/**
 * Create a revision-bound checklist, not a claim that remote UAT happened.
 * Every scenario is a locally generated prompt for the authenticated owner.
 */
const extraRouteScenarios={
 '/':[
  ['advisor-categories','Exercise the homepage advisor with CRM, SEO and hosting selections','Advisor shows neutral category matches without paid rankings or vendor approval.']
 ],
 '/preview-build/':[
  ['preview-sha-authenticated','While owner is signed in to the private Netlify Deploy Preview, open /preview-build/ and compare its full source SHA with the current draft PR HEAD','Report the exact full 40-character SHA match as a human-observed finding only. If UNKNOWN or mismatched, FAIL/BLOCKED. This does not verify actual-host security headers, anonymous denial, other routes or release approval.']
 ],
 '/tools/private-uat-worksheet/':[
  ['owner-uat-default','Open the local-only owner evidence worksheet and leave its six provider checks unassessed','BLOCKED_UNVERIFIED; no hosted UAT or release approval is inferred from CI or a visit.'],
  ['owner-uat-sha-csv','Manually enter observed and expected current SHA, record six self-attested check statuses and export local CSV','SHA mismatch always blocks; six passes are OWNER_SELF_REPORTED_ONLY, not an authenticated provider audit. Edits invalidate stale downloads.']
 ],
 '/compare/':[
  ['comparison-negative','Compare the same vendor with itself and then different vendors','A same vendor comparison is rejected; different vendors show neutral, unverified comparison fields.']
 ],
 '/tools/requirements-checklist/':[
  ['requirements-csv','Select a category, generate a requirements worksheet, download CSV and edit the selections','Offline CSV contains selected requirements only; editing invalidates the prior export.']
 ],
 '/tools/crm-migration-readiness/':[
  ['crm-reconcile-default','Leave one or more CRM migration evidence selectors unassessed with matching sample counts','NO_GO until all checks are self-reported passing; no migration approval is inferred.'],
  ['crm-reconcile-mismatch','Try 1,200 source and 1,193 target test records with passing gates','NO_GO with record discrepancy of 7 even when all gate statuses say pass.'],
  ['crm-rollback-export','Try matching 1,200 records, 90-minute change window and a measured 30-minute rollback; download CSV','READY_FOR_HUMAN_REVIEW only, offline self-reported CSV, stale export invalidates when fields change.']
 ],
 '/tools/crm-seat-audit/':[
  ['crm-seat-counts','Evaluate eight billed seats, five occupied seats and five active seats','Three vacant seats and 62.50% utilization; no promised refund or independently verified subscription.']
 ],
 '/tools/software-cost-calculator/':[
  ['cost-staleness','Enter two example quotes and change amount, currency and horizon after calculation','Estimates use entered values only and stale copy/export output is disabled after a change.']
 ],
 '/tools/seo-audit-scope/':[
  ['seo-audit-offline','Prepare a sample offline crawl scope and download the CSV','The scope is a local planning worksheet, not a vendor crawl-credit guarantee; edits invalidate the CSV.']
 ],
 '/tools/hosting-hidden-costs/':[
  ['hosting-cost-csv','Enter base hosting, backup, bandwidth, support, migration and old-host overlap estimates','Offline total separates recurring fees, one-time charges and overlap; CSV shows UNVERIFIED and edits disable stale downloads.']
 ],
 '/tools/hosting-cutover-gates/':[
  ['cutover-default','Evaluate five unassessed hosting cutover criteria','NO_GO remains until every critical check is self-attested; no live cutover is authorized.'],
  ['cutover-human-review','Set five host cutover criteria to user-entered pass and reevaluate','READY_FOR_HUMAN_REVIEW only; changing one check blocks stale export and never authorizes production.']
 ],
 '/tools/backup-restore-drill/':[
  ['backup-unknown','Leave observed restore time and recovery point age unknown','NO_GO with unknown measurements; no simulated recovery success claimed.'],
  ['backup-human-review','Enter observations within user-set RTO/RPO and self-attest both drill checks','READY_FOR_HUMAN_REVIEW only; CSV is offline and no data loss or downtime guarantee is claimed.']
 ],
 '/privacy/':[
  ['privacy-analytics','Review privacy disclosures for hosting-layer visit analytics and local-only tools','Page-visit analytics distinction is visible; tool values are not represented as remotely submitted.']
 ],
 '/disclosure/':[
  ['affiliate-disclosures','Review partnership disclosure on the unpublished private site','Inactive affiliate tracking and unverified research are accurately described; no earnings claim.']
 ]
};
const remoteExpectations={
 'authenticated-current-sha-uat':'Owner opens every route in a signed-in authorized Netlify session on the exact deployed commit, and records findings independently.',
 'unauthenticated-preview-denial':'Independent anonymous browser must not reveal preview content; a redirect alone is insufficient evidence of private access enforcement.',
 'netlify-private-and-locked':'Owner checks actual Netlify preview/private visibility and confirms production auto-publishing remains locked in provider settings.',
 'live-response-security-headers':'Observe actual security headers, noindex and Content-Security-Policy in hosted HTTP responses, not merely in repository files.',
 'hosting-billing-and-analytics':'Owner confirms hosting billing eligibility, zero-cost usage, and actual provider-side analytics and retention controls.',
 'owner-legal-editorial-approval':'Legal, publisher-identity, privacy, and editorial decisions are independently reviewed by authorized humans, not inferred from CI.'
};
export function buildPrivatePreviewUatCases(packet){
 // The Markdown formatter applies the exact fail-closed packet validation.
 formatPrivatePreviewUatPacketMarkdown(packet);
 const cases=[];
 function add({id,route,buildSha256,objective,expected}){
  if(typeof objective!=='string'||objective.length<6||
     typeof expected!=='string'||expected.length<11)
   throw new Error('Invalid private UAT case scenario');
  cases.push({
   id,sourceCommit:packet.sourceCommit,route,buildSha256,
   objective,expected,result:'UNTESTED',evidence:'NOT_COLLECTED',
   releaseAuthorized:false
  });
 }
 for(const entry of packet.routes){
  const label=entry.path==='/'?'root':entry.path.slice(1,-1).replaceAll('/','-');
  add({
   id:'route-smoke-'+label,
   route:entry.path,buildSha256:entry.buildSha256,
   objective:'Signed-in route and navigation check',
   expected:'Owner verifies authenticated Netlify preview route responds with page content, functional links, no console errors and the matching reviewed commit.'
  });
  for(const [name,objective,expected] of extraRouteScenarios[entry.path]??[]){
   add({id:'scenario-'+name,route:entry.path,buildSha256:entry.buildSha256,objective,expected});
  }
 }
 for(const gate of packet.remoteGates){
  const expected=remoteExpectations[gate.id];
  if(!expected)throw new Error('Invalid remote UAT gate scenario');
  add({
   id:'remote-'+gate.id,route:'',buildSha256:'',
   objective:'Independent external/provider evidence check',
   expected
  });
 }
 cases.sort((a,b)=>a.id.localeCompare(b.id,'en'));
 const ids=new Set();
 for(const entry of cases){
  if(ids.has(entry.id)||!/^[-a-z0-9]+$/.test(entry.id)||
     entry.sourceCommit!==packet.sourceCommit||
     entry.result!=='UNTESTED'||entry.evidence!=='NOT_COLLECTED'||
     entry.releaseAuthorized!==false||
     (entry.route!==''&&!packet.routes.some(r=>r.path===entry.route&&r.buildSha256===entry.buildSha256))||
     (entry.route===''&&entry.buildSha256!==''))
   throw new Error('Invalid private UAT case ID, route or authorization');
  ids.add(entry.id);
 }
 return {
  schemaVersion:1,sourceCommit:packet.sourceCommit,
  caseCount:cases.length,releaseVerdict:'NO_GO',releaseAuthorized:false,cases
 };
}
export function formatPrivatePreviewUatWorksheetCsv(packet){
 const plan=buildPrivatePreviewUatCases(packet);
 // Fixed-schema source-backed rows, not an interactive input field or a "verified" export.
 const quote=(value)=>'"'+String(value).replaceAll('"','""')+'"';
 const lines=['case_id,source_commit,route,build_sha256,scenario,expected,result,evidence'];
 for(const entry of plan.cases){
  lines.push([
   entry.id,entry.sourceCommit,entry.route,entry.buildSha256,
   entry.objective,entry.expected,entry.result,entry.evidence
  ].map(quote).join(','));
 }
 return lines.join('\r\n')+'\r\n';
}
