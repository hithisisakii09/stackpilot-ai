import test from 'node:test';
import assert from 'node:assert/strict';
import products from '../src/data/products.json' with { type: 'json' };
import evidenceLeads from '../src/data/evidence-leads.json' with { type: 'json' };
import affiliateCandidates from '../src/data/affiliate-programs.json' with { type: 'json' };
import policy from '../config/operating-policy.json' with { type: 'json' };
import { buildOperatingBacklog } from '../src/lib/operating-backlog.mjs';

const make = (updates={}) => ({
  products, evidenceLeads, affiliateCandidates, policy,
  today: '2026-10-31', ...updates
});
test('produces one honest editorial research task per unreviewed product', () => {
  const result=buildOperatingBacklog(make());
  assert.equal(result.mode,'prelaunch');
  assert.equal(result.execution,'advisory-only');
  assert.equal(result.asOf,'2026-10-31');
  assert.equal(result.metrics.catalogCount,6);
  assert.equal(result.metrics.unreviewedProducts,6);
  assert.equal(result.metrics.approvedClaims,0);
  assert.equal(result.metrics.verifiedRevenue,null);
  assert.equal(result.metrics.sourcesNeedingRefresh,0);
  assert.equal(result.automatic.filter(t=>t.action==='draft-evidence-review').length,6);
  assert.ok(result.automatic.every(t=>t.autonomy==='automatic' && !t.claimsApproved));
});
test('unrecorded sources produce research collection tasks, never approvals', () => {
  const result=buildOperatingBacklog(make({evidenceLeads:[]}));
  assert.equal(result.automatic.filter(x=>x.action==='collect-primary-source').length,6);
  assert.equal(result.metrics.evidenceLeadCount,0);
  assert.ok(result.automatic.every(t=>!['approve-evidence','publish-production','activate-affiliate'].includes(t.action)));
});
test('stale intake dates produce refresh tasks with provenance IDs only', () => {
  const result=buildOperatingBacklog(make({today:'2027-03-15',staleAfterDays:90}));
  assert.equal(result.metrics.sourcesNeedingRefresh,6);
  const refresh=result.automatic.filter(x=>x.action==='refresh-primary-source');
  assert.equal(refresh.length,6);
  assert.ok(refresh.every(x=>x.sourceIds.length===1 && !x.reason.includes('https://')));
});
test('affiliate candidates get research tasks, not real applications', () => {
  const result=buildOperatingBacklog(make());
  assert.equal(result.automatic.filter(t=>t.action==='recheck-program-eligibility').length,5);
  assert.equal(result.automatic.filter(t=>t.action==='locate-official-program').length,1);
  assert.equal(result.metrics.programDiscoveryGaps,1);
  assert.ok(result.automatic.every(t=>!['submit-application','activate-affiliate','accept-contract','pay'].includes(t.action)));
});
test('owner-only gates remain separate from automatic tasks', () => {
  const result=buildOperatingBacklog(make());
  assert.ok(result.ownerGates.length>=4);
  assert.ok(result.ownerGates.every(t=>t.autonomy==='owner' && t.approvalRequired===true));
  assert.ok(!result.automatic.some(t=>t.approvalRequired));
  assert.equal(result.canPublish,false);
  assert.equal(result.canMonetize,false);
  assert.equal(result.canSpend,false);
});
test('deterministic ordering and IDs, independent of input order', () => {
  const forward=buildOperatingBacklog(make());
  const reversed=buildOperatingBacklog(make({
    products:[...products].reverse(),
    evidenceLeads:[...evidenceLeads].reverse(),
    affiliateCandidates:[...affiliateCandidates].reverse()
  }));
  assert.deepEqual(forward,reversed);
  const ids=forward.automatic.map(t=>t.id);
  assert.equal(ids.length,new Set(ids).size);
  assert.deepEqual(forward.automatic.map(t=>t.priority),[...forward.automatic.map(t=>t.priority)].sort((a,b)=>a-b));
});
test('rejects duplicate product IDs or missing partner records', () => {
  assert.throws(()=>buildOperatingBacklog(make({products:[...products,products[0]]})),/duplicate.*product/i);
  assert.throws(()=>buildOperatingBacklog(make({affiliateCandidates:affiliateCandidates.slice(1)})),/missing.*partner/i);
});
test('rejects future invalid date, threshold and forged approval policy', () => {
  assert.throws(()=>buildOperatingBacklog(make({today:'2026-02-30'})),/date/i);
  assert.throws(()=>buildOperatingBacklog(make({staleAfterDays:0})),/stale/i);
  assert.throws(()=>buildOperatingBacklog(make({policy:{...policy,delegatedSpendINR:50}})),/budget|policy/i);
  assert.throws(()=>buildOperatingBacklog(make({policy:{...policy,productionLaunchApproved:true}})),/budget|policy/i);
});
test('rejects externally asserted approvals in candidate-only product entries', () => {
  assert.throws(()=>buildOperatingBacklog(make({products:[{...products[0],verified:true},...products.slice(1)]})),/unapproved|verified|product/i);
  assert.throws(()=>buildOperatingBacklog(make({products:[{...products[0],affiliateUrl:'https://ref.example'},...products.slice(1)]})),/unapproved|affiliate/i);
});
test('does not mutate caller data, persist selections, or return referral URLs', () => {
  const input=structuredClone(make());
  const snapshot=structuredClone(input);
  const result=buildOperatingBacklog(input);
  assert.deepEqual(input,snapshot);
  const serialized=JSON.stringify(result);
  assert.doesNotMatch(serialized,/https?:\/\/|affiliateUrl|commissionPercent|verifiedEarningsAmount/i);
});
