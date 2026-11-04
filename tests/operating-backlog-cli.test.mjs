import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

const run = (name,args=['--json','--as-of=2026-11-04'])=>
 JSON.parse(execFileSync(process.execPath,[name,...args],{encoding:'utf8'}));
test('read-only CLI produces bounded JSON queue with no real-world action',()=>{
 const q=run('scripts/operating-backlog.mjs');
 assert.equal(q.asOf,'2026-11-04');
 assert.equal(q.execution,'advisory-only');
 assert.equal(q.automatic.length,0);
 assert.equal(q.metrics.programsWithoutPublicAffiliateProgram,1);
 assert.equal(q.metrics.affiliateReviewsDue,0);
 assert.equal(q.metrics.preparedEvidencePackets,6);
 assert.equal(q.metrics.editorialReviewsPending,6);
 assert.equal(q.ownerGates.length,4);
 assert.equal(q.metrics.unreviewedProducts,6);
 assert.equal(q.canSpend,false);
});
test('read-only CLI supports deterministic freshness reassessment',()=>{
 const q=run('scripts/operating-backlog.mjs',['--json','--as-of=2027-03-15']);
 assert.equal(q.metrics.sourcesNeedingRefresh,6);
 assert.equal(q.automatic.filter(x=>x.action==='refresh-primary-source').length,6);
});
test('operations report exposes the backlog but still cannot launch',()=>{
 const r=run('scripts/ops-report.mjs',['--json']);
 assert.equal(r.researchBacklog.execution,'advisory-only');
 assert.equal(r.researchBacklog.automaticTasks,0);
 assert.equal(r.researchBacklog.preparedEvidencePackets,6);
 assert.equal(r.researchBacklog.editorialReviewsPending,6);
 assert.equal(r.researchBacklog.ownerApprovalGates,4);
 assert.equal(r.canPublish,false);
 assert.equal(r.canMonetize,false);
 assert.equal(r.canSpend,false);
});
test('read-only GitHub CI archives the next-action queue without deploying',()=>{
 const yml=readFileSync('.github/workflows/agent-ops.yml','utf8');
 assert.match(yml,/node scripts\/operating-backlog\.mjs --json > artifacts\/ops\/backlog\.json/);
 assert.match(yml,/retention-days:\s*7/);
 assert.match(yml,/contents:\s*read/);
 assert.doesNotMatch(yml,/NETLIFY_AUTH_TOKEN|netlify deploy|--prod|git push|permissions:\s*write-all/);
});
test('only safe action names appear in the queue, with zero earnings assertions',()=>{
 const x=run('scripts/operating-backlog.mjs');
 const allowed=new Set(['collect-primary-source','refresh-primary-source','draft-evidence-review','locate-official-program','recheck-program-eligibility','recheck-program-status']);
 assert.ok(x.automatic.every(t=>allowed.has(t.action)));
 assert.equal(x.metrics.verifiedRevenue,null);
 assert.equal(x.metrics.acceptedAffiliatePrograms,0);
 assert.equal(x.metrics.approvedClaims,0);
 assert.equal(x.metrics.preparedEvidencePackets,6);
 assert.equal(x.metrics.editorialReviewsPending,6);
 assert.equal(x.automatic.filter(t=>t.action==='draft-evidence-review').length,0);
});
