import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {
 OWNER_UAT_CHECKS,assessOwnerUatEvidence,
 formatOwnerUatReport,formatOwnerUatCsv
} from '../src/lib/owner-uat-worksheet.mjs';
const first='0123456789abcdef0123456789abcdef01234567';
const second='0123456789abcdef0123456789abcdef01234568';
const ids=['previewSha','authenticatedRoutes','anonymousDenial','liveHeaders','privateAndLocked','billingAnalytics'];
const good=(overrides={})=>({
 expectedSha:first,observedSha:first,
 previewSha:'pass',authenticatedRoutes:'pass',anonymousDenial:'pass',
 liveHeaders:'pass',privateAndLocked:'pass',billingAnalytics:'pass',
 ...overrides
});
test('fixed six owner-only UAT checks are distinct and have useful guidance',()=>{
 assert.deepEqual(OWNER_UAT_CHECKS.map(x=>x.id),ids);
 assert.ok(OWNER_UAT_CHECKS.every(x=>x.label&&x.hint));
});
test('even six reported passes and matching hashes are not hosted verification or publication approval',()=>{
 const input=good();
 const r=assessOwnerUatEvidence(input);
 assert.equal(r.status,'OWNER_SELF_REPORTED_ONLY');
 assert.equal(r.shaMatches,true);
 assert.deepEqual(r.blockers,[]);
 assert.equal(r.hostedUatIndependentlyVerified,false);
 assert.equal(r.publicReleaseAuthorized,false);
 assert.equal(r.accountSettingsChanged,false);
 assert.equal(r.canSpend,false);
 assert.equal(r.editorialApproved,false);
 assert.equal(r.dataSource,'owner-self-report-only');
 assert.deepEqual(r.input,input);
 assert.notEqual(r.input,input);
 assert.match(formatOwnerUatReport(r),/not.*independently verified|independently verified.*no/i);
});
test('mismatched SHA never becomes approval even when every check is self-attested pass',()=>{
 const r=assessOwnerUatEvidence(good({observedSha:second}));
 assert.equal(r.shaMatches,false);
 assert.equal(r.status,'BLOCKED_UNVERIFIED');
 assert.deepEqual(r.blockers,['commitMismatch']);
 assert.match(formatOwnerUatReport(r),/BLOCKED_UNVERIFIED/);
 assert.match(formatOwnerUatReport(r),/commitMismatch/);
});
test('every untested, failed or blocked human gate stays blocked',()=>{
 for(const id of ids)for(const status of ['not-checked','fail','blocked']){
  const r=assessOwnerUatEvidence(good({[id]:status}));
  assert.equal(r.status,'BLOCKED_UNVERIFIED',id+' '+status);
  assert.ok(r.blockers.includes(id));
 }
});
test('missing, short, uppercase, padded, nonstring and malformed hashes are rejected',()=>{
 for(const id of ['expectedSha','observedSha']){
  for(const value of ['',null,undefined,first.slice(0,7),first.slice(1),first+' ',first.toUpperCase(),'main','h'.repeat(40),32]){
   assert.throws(()=>assessOwnerUatEvidence(good({[id]:value})),/invalid|sha|commit/i,id+' '+String(value));
  }
 }
});
test('no extra fields, missing gates, other statuses or nonplain inputs',()=>{
 for(const input of [null,undefined,[],{},'wrong',43,new Date()]){
  assert.throws(()=>assessOwnerUatEvidence(input),/invalid|field/i);
 }
 assert.throws(()=>assessOwnerUatEvidence({...good(),ownerHasApproved:true}),/invalid|field/i);
 const incomplete=good();delete incomplete.liveHeaders;
 assert.throws(()=>assessOwnerUatEvidence(incomplete),/invalid|field/i);
 for(const status of ['APPROVED','GO','passed',true,undefined,null,'']){
  assert.throws(()=>assessOwnerUatEvidence(good({liveHeaders:status})),/invalid|status/i);
 }
});
test('fixed text and CSV do not imply a cryptographic proof, a release or verified account access',()=>{
 const r=assessOwnerUatEvidence(good());
 const text=formatOwnerUatReport(r),csv=formatOwnerUatCsv(r);
 for(const word of ['OWNER_SELF_REPORTED_ONLY','self-reported','not a public-release authorization','independent','authenticated']){
  assert.match(text,new RegExp(word,'i'));
 }
 assert.match(csv,/^check,value,evidence_status\r\n/);
 assert.match(csv,/\"expected_commit\",\"0123456789abcdef0123456789abcdef01234567\",\"SELF_REPORTED\"/);
 assert.match(csv,/\"sha_matches\",\"true\",\"SELF_REPORTED\"/);
 assert.match(csv,/\"public_release_authorized\",\"false\",\"SELF_REPORTED\"/);
 assert.match(csv,/\"hosted_uat_independently_verified\",\"false\",\"SELF_REPORTED\"/);
 assert.ok(csv.endsWith('\r\n'));
 assert.doesNotMatch(csv,/https?:\/\/|@SUM|=HYPERLINK|commission|guaranteed/i);
});
test('reports reject forged status, approvals, changed hashes, blockers, hidden fields',()=>{
 const r=assessOwnerUatEvidence(good());
 const bad=[
  {...r,status:'GO'},{...r,status:'BLOCKED_UNVERIFIED'},
  {...r,publicReleaseAuthorized:true},{...r,hostedUatIndependentlyVerified:true},
  {...r,accountSettingsChanged:true},{...r,canSpend:true},
  {...r,editorialApproved:true},{...r,shaMatches:false},
  {...r,blockers:['authenticatedRoutes']},{...r,notes:'=HYPERLINK("bad")'},
  {...r,input:{...r.input,observedSha:second}},
  {...r,input:{...r.input,freeText:'customer-secret'}},null
 ];
 for(const forged of bad){
  assert.throws(()=>formatOwnerUatReport(forged),/invalid|integrity|report|assessment/i);
  assert.throws(()=>formatOwnerUatCsv(forged),/invalid|integrity|report|assessment/i);
 }
});
test('user form edits never modify assessment snapshot',()=>{
 const input=good(),copy=structuredClone(input);
 const r=assessOwnerUatEvidence(input);
 input.observedSha=second;input.privateAndLocked='fail';
 assert.equal(r.input.observedSha,first);
 assert.equal(r.input.privateAndLocked,'pass');
 assert.equal(copy.observedSha,first);
});
test('protected noindex worksheet exists, uses fixed selectors and local-only export',()=>{
 const path='src/pages/tools/private-uat-worksheet/index.astro';
 assert.ok(existsSync(path));
 const html=readFileSync(path,'utf8');
 for(const token of [
  'noindex, nofollow','Private owner UAT evidence worksheet',
  'OWNER_UAT_CHECKS.map','value="not-checked"','value="pass"',
  'value="fail"','value="blocked"',
  'id="owner-uat-form"','id="owner-uat-status"','id="owner-uat-report"',
  'id="owner-uat-copy"','id="owner-uat-download"',
  'assessOwnerUatEvidence','formatOwnerUatReport','formatOwnerUatCsv',
  'new Blob(','URL.revokeObjectURL','type="reset"','aria-live="polite"',
  'download.disabled=true','Netlify Web Analytics'
 ])assert.ok(html.includes(token),token);
 assert.match(html,/form\.addEventListener\('input'/);
 assert.match(html,/form\.addEventListener\('change'/);
 assert.match(html,/form\.addEventListener\('reset'/);
 assert.doesNotMatch(html,/<iframe|fetch\(|XMLHttpRequest|localStorage|sessionStorage|<form[^>]*action=/i);
});
test('homepage, source identity, UAT packet and actual Chromium QA link to worksheet',()=>{
 const home=readFileSync('src/pages/index.astro','utf8');
 const identity=readFileSync('src/pages/preview-build/index.astro','utf8');
 const packet=readFileSync('src/lib/preview-uat-packet.mjs','utf8');
 const qa=readFileSync('scripts/browser-acceptance.mjs','utf8');
 for(const html of [home,identity,packet,qa])
  assert.match(html,/\/tools\/private-uat-worksheet\//);
 assert.match(qa,/stackpilot-owner-uat-evidence\.csv/);
 assert.match(qa,/#owner-uat-report/);
});
