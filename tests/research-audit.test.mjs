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
