/**
 * Owner-entered LOCAL-only observations for a private Netlify Deploy Preview.
 * No external observation, identity proof, authentication or release approval.
 */
export const OWNER_UAT_CHECKS=Object.freeze([
 Object.freeze({id:'previewSha',label:'Current preview commit observed',hint:'After signing in, compare the full displayed commit to current PR #1 HEAD; mark pass only on actual matching observation.'}),
 Object.freeze({id:'authenticatedRoutes',label:'Authenticated routes and interactions tested',hint:'Open each route in the SHA-bound CI UAT packet; test forms and downloads in desktop/mobile authenticated browsers.'}),
 Object.freeze({id:'anonymousDenial',label:'Separate anonymous browser denied',hint:'In an unrelated incognito session verify no preview content appears; do not confuse a redirect or noindex with access control.'}),
 Object.freeze({id:'liveHeaders',label:'Live Netlify security headers inspected',hint:'Check actual X-Robots-Tag, Content-Security-Policy, nosniff and framing controls on the authenticated hosted response.'}),
 Object.freeze({id:'privateAndLocked',label:'Netlify access and publishing locks inspected',hint:'In the provider account check both production and preview Private, and Auto Publishing Locked; do not change settings.'}),
 Object.freeze({id:'billingAnalytics',label:'Free plan, credits and privacy/analytics reviewed',hint:'Check actual account billing, usage and hosting analytics disclosures without posting account numbers or financial data.'})
]);
const SHA=/^[a-f0-9]{40}$/;
const STATUSES=new Set(['not-checked','pass','fail','blocked']);
const fields=['expectedSha','observedSha',...OWNER_UAT_CHECKS.map(x=>x.id)];
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const exact=(obj,keys)=>Boolean(obj&&typeof obj==='object'&&!Array.isArray(obj)&&
 Object.getPrototypeOf(obj)===Object.prototype&&Object.keys(obj).length===keys.length&&
 keys.every(k=>own(obj,k))&&Object.keys(obj).every(k=>keys.includes(k)));
export function assessOwnerUatEvidence(input){
 if(!exact(input,fields))throw new Error('Invalid owner UAT field set');
 if(typeof input.expectedSha!=='string'||!SHA.test(input.expectedSha)||
    typeof input.observedSha!=='string'||!SHA.test(input.observedSha))
  throw new Error('Invalid owner UAT Git commit SHA');
 for(const check of OWNER_UAT_CHECKS){
  if(!STATUSES.has(input[check.id]))throw new Error('Invalid owner UAT check status: '+check.id);
 }
 const snapshot=Object.fromEntries(fields.map(k=>[k,input[k]]));
 const shaMatches=input.expectedSha===input.observedSha;
 const blockers=OWNER_UAT_CHECKS.filter(x=>input[x.id]!=='pass').map(x=>x.id);
 if(!shaMatches)blockers.push('commitMismatch');
 return {
  input:snapshot,shaMatches,blockers,
  status:blockers.length?'BLOCKED_UNVERIFIED':'OWNER_SELF_REPORTED_ONLY',
  hostedUatIndependentlyVerified:false,
  publicReleaseAuthorized:false,
  accountSettingsChanged:false,
  canSpend:false,editorialApproved:false,
  dataSource:'owner-self-report-only'
 };
}
function same(actual,expected){
 if(typeof expected!=='object'||expected===null)return Object.is(actual,expected);
 if(Array.isArray(expected))return Array.isArray(actual)&&actual.length===expected.length&&
  expected.every((v,i)=>same(actual[i],v));
 if(!exact(actual,Object.keys(expected)))return false;
 return Object.keys(expected).every(key=>same(actual[key],expected[key]));
}
function verify(result){
 if(!result||typeof result!=='object'||Array.isArray(result)||!own(result,'input'))
  throw new Error('Invalid owner UAT assessment report');
 let expected;
 try{expected=assessOwnerUatEvidence(result.input);}
 catch{throw new Error('Invalid owner UAT report input');}
 if(!same(result,expected))throw new Error('Invalid owner UAT report integrity');
 return expected;
}
export function formatOwnerUatReport(result){
 const r=verify(result),i=r.input;
 const text=[
  'StackPilot AI — Owner-entered PRIVATE preview UAT evidence',
  'Source: self-reported human selections only; not independently verified by StackPilot.',
  'Review state: '+r.status,
  'Expected Git commit (current PR HEAD, entered manually): '+i.expectedSha,
  'Observed Git commit (signed-in preview page, entered manually): '+i.observedSha,
  'Commit strings match (self-reported only): '+r.shaMatches,
  ''
 ];
 for(const check of OWNER_UAT_CHECKS)text.push(check.label+': '+i[check.id]+' (self-reported)');
 for(const blocker of r.blockers)text.push('Open check: '+blocker);
 text.push(
  '',
  'No authenticated hosted routes, provider account settings or security controls are independently verified by this form.',
  'Even OWNER_SELF_REPORTED_ONLY is not a public-release authorization.',
  'Matching Git commit strings are not cryptographic provenance or proof of served source code.',
  'Review independent evidence and obtain separate owner approvals for editorial accuracy, privacy/legal, production, affiliates and spending.',
  'Privacy: never enter credentials, cookies, customer records, financial details or access tokens; this browser-only form submits nothing.'
 );
 return text.join('\n');
}
export function formatOwnerUatCsv(result){
 const r=verify(result),i=r.input;
 // Values are only validated 40-character lowercase hex or fixed known tokens.
 // No free-text input or spreadsheet formula from the owner can reach this CSV.
 const rows=[
  ['expected_commit',i.expectedSha],['observed_commit',i.observedSha],
  ['sha_matches',String(r.shaMatches)],
  ...OWNER_UAT_CHECKS.map(c=>[c.id,i[c.id]]),
  ['review_state',r.status],['hosted_uat_independently_verified','false'],
  ['public_release_authorized','false'],['account_settings_changed','false'],
  ['can_spend','false'],['editorial_approved','false']
 ];
 const cell=s=>'"'+String(s).replaceAll('"','""')+'"';
 return ['check,value,evidence_status',...rows.map(row=>[...row,'SELF_REPORTED'].map(cell).join(','))].join('\r\n')+'\r\n';
}
