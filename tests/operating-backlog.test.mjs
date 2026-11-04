import test from 'node:test';
import assert from 'node:assert/strict';
import products from '../src/data/products.json' with { type: 'json' };
import evidenceLeads from '../src/data/evidence-leads.json' with { type: 'json' };
import affiliateCandidates from '../src/data/affiliate-programs.json' with { type: 'json' };
import editorialPackets from '../src/data/editorial-packet-ledger.json' with { type: 'json' };
import policy from '../config/operating-policy.json' with { type: 'json' };
import { readFileSync } from 'node:fs';
import { buildOperatingBacklog } from '../src/lib/operating-backlog.mjs';

const make = (updates={}) => ({
  products, evidenceLeads, affiliateCandidates, editorialPackets, policy,
  today: '2026-11-04', ...updates
});

test('prepared evidence packets stop repeating P30 drafting while every claim stays unreviewed', () => {
  const result=buildOperatingBacklog(make());
  assert.equal(result.mode,'prelaunch');
  assert.equal(result.execution,'advisory-only');
  assert.equal(result.asOf,'2026-11-04');
  assert.equal(result.metrics.catalogCount,6);
  assert.equal(result.metrics.unreviewedProducts,6);
  assert.equal(result.metrics.approvedClaims,0);
  assert.equal(result.metrics.verifiedRevenue,null);
  assert.equal(result.metrics.sourcesNeedingRefresh,0);
  assert.equal(result.metrics.preparedEvidencePackets,6);
  assert.equal(result.metrics.editorialReviewsPending,6);
  assert.equal(result.automatic.filter(t=>t.action==='draft-evidence-review').length,0);
  assert.equal(result.automatic.filter(t=>t.action==='locate-official-program').length,0);
  assert.equal(result.automatic.filter(t=>t.action==='recheck-program-eligibility').length,0);
  assert.ok(result.automatic.every(t=>t.autonomy==='automatic' && !t.claimsApproved));
  assert.ok(result.ownerGates.some(g=>g.id==='editorial-approval'));
});

test('a missing packet remains a P30 task rather than being treated as reviewed', () => {
  const result=buildOperatingBacklog(make({editorialPackets:[]}));
  assert.equal(result.metrics.preparedEvidencePackets,0);
  assert.equal(result.metrics.editorialReviewsPending,0);
  assert.equal(result.automatic.filter(t=>t.action==='draft-evidence-review').length,6);
});

test('a partially prepared ledger queues only products without a matching packet', () => {
  const packets=editorialPackets.filter(p=>p.productId!=='kinsta');
  const result=buildOperatingBacklog(make({editorialPackets:packets}));
  const drafts=result.automatic.filter(t=>t.action==='draft-evidence-review');
  assert.deepEqual(drafts.map(t=>t.productId),['kinsta']);
  assert.equal(result.metrics.preparedEvidencePackets,5);
  assert.equal(result.metrics.editorialReviewsPending,5);
});

test('stale source intake takes priority over a prepared packet', () => {
  const result=buildOperatingBacklog(make({today:'2027-03-15',staleAfterDays:90}));
  assert.equal(result.metrics.sourcesNeedingRefresh,6);
  assert.equal(result.metrics.preparedEvidencePackets,6);
  const refresh=result.automatic.filter(x=>x.action==='refresh-primary-source');
  assert.equal(refresh.length,6);
  assert.ok(refresh.every(x=>x.sourceIds.length===1 && !x.reason.includes('https://')));
  assert.equal(result.automatic.filter(x=>x.action==='draft-evidence-review').length,0);
});

test('unrecorded sources produce research collection tasks, never approvals', () => {
  const result=buildOperatingBacklog(make({evidenceLeads:[],editorialPackets:[]}));
  assert.equal(result.automatic.filter(x=>x.action==='collect-primary-source').length,6);
  assert.equal(result.metrics.evidenceLeadCount,0);
  assert.ok(result.automatic.every(t=>!['approve-evidence','publish-production','activate-affiliate'].includes(t.action)));
});

test('fresh affiliate research reviews do not repeat as daily tasks or grant applications', () => {
  const result=buildOperatingBacklog(make());
  assert.equal(result.automatic.filter(t=>t.action==='recheck-program-eligibility').length,0);
  assert.equal(result.automatic.filter(t=>t.action==='locate-official-program').length,0);
  assert.equal(result.metrics.programDiscoveryGaps,0);
  assert.equal(result.metrics.programsWithoutPublicAffiliateProgram,1);
  assert.equal(result.metrics.affiliateReviewsDue,0);
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

test('deterministic ordering and IDs are independent of input order', () => {
  const forward=buildOperatingBacklog(make());
  const reversed=buildOperatingBacklog(make({
    products:[...products].reverse(),
    evidenceLeads:[...evidenceLeads].reverse(),
    affiliateCandidates:[...affiliateCandidates].reverse(),
    editorialPackets:[...editorialPackets].reverse()
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

test('rejects forged, incomplete, future-dated or unsafe editorial packet records', () => {
  const packet=editorialPackets[0];
  for(const [key,value] of Object.entries({
    status:'approved',
    preparedOn:'2099-01-01',
    documentPath:'../../private.md',
    sourceIds:['another-vendor-source'],
    approved:true
  })){
    assert.throws(()=>buildOperatingBacklog(make({editorialPackets:[{...packet,[key]:value},...editorialPackets.slice(1)]})),/packet|editorial|source|status|date|path/i,key);
  }
});

test('rejects duplicate packets for a product and undeclared packet fields', () => {
  const packet=editorialPackets[0];
  assert.throws(()=>buildOperatingBacklog(make({editorialPackets:[...editorialPackets,{...packet,id:'duplicate-packet'}]})),/duplicate|packet/i);
  assert.throws(()=>buildOperatingBacklog(make({editorialPackets:[{...packet,reviewer:'AI'},...editorialPackets.slice(1)]})),/field|packet/i);
});

test('packet manifest points to a real private six-vendor source note without claiming approval', () => {
  for(const packet of editorialPackets){
    assert.equal(packet.status,'prepared-unapproved');
    assert.equal(packet.sourceIds.length,1);
    assert.equal(packet.documentPath,'docs/editorial-drafts/2026-11-03-plan-scoped-vendor-evidence-review.md');
  }
  const content=readFileSync(new URL('../docs/editorial-drafts/2026-11-03-plan-scoped-vendor-evidence-review.md',import.meta.url),'utf8');
  for(const product of products) assert.ok(content.includes('## '+product.name));
  assert.match(content,/Approved claims: 0/);
  assert.match(content,/No customer account, paid plan/i);
});

test('does not mutate caller data or leak referral URLs', () => {
  const input=structuredClone(make());
  const snapshot=structuredClone(input);
  const result=buildOperatingBacklog(input);
  assert.deepEqual(input,snapshot);
  const serialized=JSON.stringify(result);
  assert.doesNotMatch(serialized,/https?:\/\/|affiliateUrl|commissionPercent|verifiedRevenueAmount/i);
});
