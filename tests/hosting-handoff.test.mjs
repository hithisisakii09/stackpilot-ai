import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const state='docs/current-operational-state.md';
const handoffs=['AGENTS.md','docs/autonomous-business.md','docs/zero-budget-hosting.md','docs/roadmap-to-launch.md'];

test('single status record explicitly differentiates evidence and unknowns',()=>{
 assert.ok(existsSync(state),'Missing authoritative hosting status handoff');
 const s=read(state);
 assert.match(s,/Owner screenshot/);
 assert.match(s,/User-reported browser/);
 assert.match(s,/GitHub commit status/);
 assert.match(s,/Not independently verified/);
 assert.match(s,/Private/);
 assert.match(s,/Auto Publishing Locked/);
 assert.match(s,/inspiring-chaja-cfb85f/);
 assert.match(s,/main@c8fadcb/);
 assert.match(s,/Vercel Hobby/);
 assert.match(s,/build-rate limit/);
 assert.match(s,/Netlify Deploy Preview/);
});
test('source of truth explicitly preserves all commercial and production gates',()=>{
 const s=read(state);
 assert.match(s,/monthly budget.*₹0/i);
 assert.match(s,/delegated spending.*₹0/i);
 assert.match(s,/draft PR #1.*unmerged/i);
 assert.match(s,/no.*public launch/i);
 assert.match(s,/no.*affiliate activation/i);
 assert.match(s,/no.*paid upgrade/i);
 assert.match(s,/noindex.*not.*access control/i);
 assert.match(s,/editorial approval.*pending/i);
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
