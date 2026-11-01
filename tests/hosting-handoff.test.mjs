import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const state='docs/current-operational-state.md';
const archive='docs/history/2026-10-31-operational-state-snapshot.md';
const handoffs=['AGENTS.md','docs/autonomous-business.md','docs/zero-budget-hosting.md','docs/roadmap-to-launch.md'];

test('single current handoff labels verified checkpoint versus unverified hosted observations',()=>{
 assert.ok(existsSync(state),'Missing authoritative operational status handoff');
 const s=read(state);
 assert.match(s,/Snapshot date:.*2026-11-01/);
 assert.match(s,/previous verified checkpoint/i);
 assert.match(s,/361\/361 tests/);
 assert.match(s,/22 emitted HTML routes/);
 assert.match(s,/201 HTML anchor links/);
 assert.match(s,/GitHub draft PR #1/);
 assert.match(s,/Netlify Deploy Preview/i);
 assert.match(s,/Auto Publishing Locked/);
 assert.match(s,/Owner screenshots\/reports \(older\)/);
 assert.match(s,/not.*authenticated testing of actual Netlify/i);
 assert.match(s,/UNVERIFIED/);
 assert.match(s,/noindex is not authentication/i);
 assert.match(s,/historical/i);
});

test('historical Vercel and old-build details are archived, not active instructions',()=>{
 assert.ok(existsSync(archive),'Old operational record must be preserved for provenance');
 const old=read(archive),s=read(state);
 assert.match(old,/Archive only/i);
 assert.match(old,/Vercel Hobby/);
 assert.match(old,/build-rate limit/);
 assert.match(old,/231\/231/);
 assert.match(s,/owner.*deleted.*Vercel project/i);
 assert.match(s,/Do not recreate/i);
 assert.doesNotMatch(s,/16 Astro static pages|Latest baseline: 16 static pages/);
});

test('source of truth preserves budget, owner-only decisions and production gates',()=>{
 const s=read(state);
 assert.match(s,/monthly budget.*₹0/i);
 assert.match(s,/delegated spend.*₹0/i);
 assert.match(s,/draft PR #1.*unmerged/i);
 assert.match(s,/no.*public.*release|public release no-go/i);
 assert.match(s,/no.*affiliate activation|affiliate.*remain.*unverified/i);
 assert.match(s,/no upgrades permitted/i);
 assert.match(s,/editorial.*review/i);
 assert.match(s,/not.*publish/i);
 assert.match(s,/do not.*merge/i);
 for(const flag of ['commercialHostingApproved','productionLaunchApproved','affiliateActivationApproved','paidServicesApproved']){
  assert.ok(s.includes(flag),flag+' missing owner authorization safeguard');
 }
});

test('all active agent handoffs point to the dated status record',()=>{
 for(const path of handoffs){
  const s=read(path);
  assert.ok(s.includes('docs/current-operational-state.md'),path+' lacks status handoff reference');
  assert.match(s,/Netlify/i,path);
 }
});
test('active runbooks do not claim Netlify signup or deployment never happened',()=>{
 for(const path of handoffs){
  const s=read(path);
  assert.doesNotMatch(s,/has not been deployed to Netlify/i,path);
  assert.doesNotMatch(s,/do not import or deploy this repo to Netlify/i,path);
  assert.doesNotMatch(s,/no live account activation/i,path);
  assert.doesNotMatch(s,/Status: engineering development in a protected Vercel preview/i,path);
 }
});
test('agent instructions prioritize private Netlify preview without misleading release approval',()=>{
 const s=read('AGENTS.md');
 assert.match(s,/Netlify Deploy Preview/i);
 assert.match(s,/Vercel Hobby/i);
 assert.match(s,/do not.*merge/i);
 assert.match(s,/noindex/i);
 const roadmap=read('docs/roadmap-to-launch.md');
 assert.match(roadmap,/Netlify/i);
 assert.match(roadmap,/human editorial/i);
 assert.match(roadmap,/owner.*approval/i);
});
