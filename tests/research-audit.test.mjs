import test from 'node:test';
import assert from 'node:assert/strict';
import { buildResearchQueue } from '../src/lib/research-audit.mjs';

const product = {
 id: 'example', name: 'Example', verified: false, researchStatus: 'needs-review',
 sources: [{ url: 'https://example.com/docs', claim: 'Documentation', checkedAt: '2026-10-30' }],
 supportedTeams: [], budgetTiers: [], pricing: { status: 'unverified', amount: null }
};
test('research queue flags unapproved, missing fit and unverified pricing', () => {
 const [item] = buildResearchQueue([product], { today: '2026-10-30' });
 assert.ok(item.blockers.includes('editorial-review-pending'));
 assert.ok(item.blockers.includes('budget-fit-unknown'));
 assert.ok(item.blockers.includes('pricing-unverified'));
 assert.equal(item.sourceCount, 1);
});
test('current source does not trigger a refresh warning', () => {
 const [item] = buildResearchQueue([product], { today: '2026-10-31', staleAfterDays: 90 });
 assert.ok(!item.blockers.includes('source-refresh-required'));
 assert.equal(item.ageDays, 1);
});
test('stale source triggers an explicit refresh flag', () => {
 const [item] = buildResearchQueue([product], { today: '2027-03-05', staleAfterDays: 90 });
 assert.ok(item.blockers.includes('source-refresh-required'));
});
test('missing sources always require refresh', () => {
 const [item] = buildResearchQueue([{ ...product, sources: [] }], { today: '2026-10-30' });
 assert.ok(item.blockers.includes('no-source-evidence'));
 assert.ok(item.blockers.includes('source-refresh-required'));
});
test('invalid queue options are rejected', () => {
 assert.throws(() => buildResearchQueue([product], { today: '2026-02-30' }), /Invalid/);
 assert.throws(() => buildResearchQueue([product], { staleAfterDays: 0 }), /Invalid/);
});

test('a future-dated source cannot masquerade as the freshest checked evidence', () => {
 const first={...product,sources:[{...product.sources[0],checkedAt:'2099-01-01'}]};
 const [item]=buildResearchQueue([first],{today:'2026-11-01'});
 assert.equal(item.latestSourceDate,null);
 assert.equal(item.ageDays,null);
 assert.ok(item.blockers.includes('future-source-date'));
 assert.ok(item.blockers.includes('source-refresh-required'));
 assert.equal(item.sourceCount,1);
});
test('future-dated entry cannot mask old stale sources', () => {
 const old={...product.sources[0],checkedAt:'2026-01-01'};
 const future={...product.sources[0],checkedAt:'2027-05-01'};
 const [item]=buildResearchQueue([{...product,sources:[old,future]}],{
  today:'2026-11-01',staleAfterDays:90
 });
 assert.equal(item.latestSourceDate,'2026-01-01');
 assert.ok(item.ageDays>90);
 assert.deepEqual(item.blockers.filter(b=>b.includes('source-date')||b==='source-refresh-required'),
                  ['future-source-date','source-refresh-required']);
});
test('malformed dates cannot hide behind one otherwise recent source', () => {
 for(const broken of ['2026-02-30','today',null,undefined,'2026-11-01T00:00:00Z']){
  const input={...product,sources:[
   {...product.sources[0],checkedAt:'2026-11-01'},
   {...product.sources[0],checkedAt:broken}
  ]};
  const [item]=buildResearchQueue([input],{today:'2026-11-01'});
  assert.equal(item.latestSourceDate,'2026-11-01');
  assert.equal(item.ageDays,0);
  assert.ok(item.blockers.includes('invalid-source-date'),String(broken));
  assert.ok(item.blockers.includes('source-refresh-required'),String(broken));
 }
});
test('null and nonrecord sources remain a blocked review item rather than crash',()=>{
 const [item]=buildResearchQueue([{...product,sources:[null,{checkedAt:'2026-11-01'}]}],{
  today:'2026-11-01'
 });
 assert.ok(item.blockers.includes('invalid-source-date'));
 assert.ok(item.blockers.includes('source-refresh-required'));
});
test('valid same-day source stays current and the audit does not mutate catalog input',()=>{
 const x=structuredClone(product),snapshot=structuredClone(x);
 const [item]=buildResearchQueue([x],{today:'2026-10-30'});
 assert.deepEqual(x,snapshot);
 assert.equal(item.latestSourceDate,'2026-10-30');
 assert.equal(item.ageDays,0);
 assert.ok(!item.blockers.includes('invalid-source-date'));
 assert.ok(!item.blockers.includes('future-source-date'));
 assert.ok(!item.blockers.includes('source-refresh-required'));
});
