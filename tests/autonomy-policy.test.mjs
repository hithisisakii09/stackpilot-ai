import test from 'node:test';
import assert from 'node:assert/strict';
import { decideAutonomousActions } from '../src/lib/autonomy-policy.mjs';

const ready = () => ({
  ciPassed: true, browserQaPassed: true, vendorClaimsApproved: true,
  privacyPolicyApproved: true, commercialHostingApproved: true,
  productionApproval: true, affiliateProgramApproved: true,
  domainsReady: true, budgetApproved: false,
  productCount: 6, unreviewedProducts: 0
});
test('fail-closed default cannot publish or monetize', () => {
  const result = decideAutonomousActions({});
  assert.equal(result.canPublish, false);
  assert.equal(result.canMonetize, false);
  assert.equal(result.mode, 'prelaunch');
  assert.ok(result.blockers.includes('commercial-hosting-unapproved'));
  assert.ok(result.blockers.includes('production-approval-missing'));
});
test('unknown and nonboolean flags are not approvals', () => {
  const flags = { ...ready(), commercialHostingApproved: 'true', productionApproval: 1 };
  const result = decideAutonomousActions(flags);
  assert.equal(result.canPublish, false);
  assert.equal(result.canMonetize, false);
});
test('passing CI alone never grants production permission', () => {
  const result = decideAutonomousActions({ ciPassed: true, browserQaPassed: true });
  assert.equal(result.canPublish, false);
  assert.ok(result.blockers.includes('production-approval-missing'));
});
test('no independent vendor review blocks publication', () => {
  const result = decideAutonomousActions({ ...ready(), vendorClaimsApproved: false });
  assert.equal(result.canPublish, false);
  assert.ok(result.blockers.includes('vendor-claims-unverified'));
});
test('privacy or hosting approval missing blocks public publishing', () => {
  for (const missing of ['privacyPolicyApproved', 'commercialHostingApproved', 'domainsReady']) {
    const result = decideAutonomousActions({ ...ready(), [missing]: false });
    assert.equal(result.canPublish, false, missing);
  }
});
test('public site readiness is different from affiliate monetization readiness', () => {
  const result = decideAutonomousActions({ ...ready(), affiliateProgramApproved: false });
  assert.equal(result.canPublish, true);
  assert.equal(result.canMonetize, false);
  assert.ok(result.blockers.includes('affiliate-program-unapproved'));
});
test('all gates permit readiness but never trigger actual release', () => {
  const result = decideAutonomousActions(ready());
  assert.equal(result.canPublish, true);
  assert.equal(result.canMonetize, true);
  assert.equal(result.mode, 'ready-for-owner-release');
  assert.ok(result.tasks.every(task => task.action !== 'merge-main' && task.action !== 'publish-production' && task.action !== 'activate-affiliate'));
});
test('operations prioritize fixing CI and research gaps unattended', () => {
  const result = decideAutonomousActions({ ciPassed: false, browserQaPassed: false, productCount: 6, unreviewedProducts: 6 });
  assert.equal(result.tasks[0].action, 'inspect-ci');
  assert.ok(result.tasks.some(task => task.action === 'research-candidates' && task.autonomy === 'automatic'));
  assert.ok(result.tasks.some(task => task.action === 'inspect-browser-qa'));
});
test('paid activity always requires owner budget approval', () => {
  const result = decideAutonomousActions(ready());
  assert.equal(result.canSpend, false);
  assert.ok(result.blockers.includes('spend-budget-unapproved'));
});
test('preapproved budget alone never bypasses launch gates', () => {
  const result = decideAutonomousActions({ budgetApproved: true, commercialHostingApproved: false });
  assert.equal(result.canPublish, false);
  assert.equal(result.canMonetize, false);
  assert.equal(result.canSpend, false);
});
test('all autonomous tasks are noncommercial and lack external effects', () => {
  const result = decideAutonomousActions({});
  assert.ok(result.tasks.every(task => task.autonomy === 'automatic' ? ['inspect-ci','inspect-browser-qa','research-candidates','draft-code-improvements'].includes(task.action) : true));
  assert.ok(result.tasks.every(task => task.action !== 'pay' && task.action !== 'send-marketing' && task.action !== 'approve-evidence'));
});
test('decision function does not mutate caller input', () => {
  const data = { ...ready(), vendorClaimsApproved: false };
  const prior = structuredClone(data);
  decideAutonomousActions(data);
  assert.deepEqual(data, prior);
});
