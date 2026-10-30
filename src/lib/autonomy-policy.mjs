/**
 * Bounded decision support for StackPilot AI.
 * No I/O, tokens, account actions, approvals or autonomous publishing.
 * "Ready" means prerequisites appear satisfied, not that an action happened.
 */
const isApproved = value => value === true;
const gates = [
  ['ciPassed', 'ci-unverified'],
  ['browserQaPassed', 'browser-qa-unverified'],
  ['vendorClaimsApproved', 'vendor-claims-unverified'],
  ['privacyPolicyApproved', 'privacy-policy-unapproved'],
  ['commercialHostingApproved', 'commercial-hosting-unapproved'],
  ['productionApproval', 'production-approval-missing'],
  ['domainsReady', 'domain-unverified']
];
const task = (action, autonomy, reason) => ({ action, autonomy, reason });

export function decideAutonomousActions(input = {}) {
  const data = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const blockers = gates.filter(([key]) => !isApproved(data[key])).map(([,reason]) => reason);
  if (!isApproved(data.affiliateProgramApproved)) blockers.push('affiliate-program-unapproved');
  // Even if the owner approves a budget, spending credentials and explicit
  // authority are provisioned separately. This engine never charges anything.
  blockers.push(isApproved(data.budgetApproved) ? 'spending-not-delegated' : 'spend-budget-unapproved');

  const canPublish = gates.every(([key]) => isApproved(data[key]));
  const canMonetize = canPublish && isApproved(data.affiliateProgramApproved);
  const tasks = [];
  if (!isApproved(data.ciPassed)) {
    tasks.push(task('inspect-ci','automatic','Review failed or unknown CI and propose a tested fix on the development branch'));
  }
  if (!isApproved(data.browserQaPassed)) {
    tasks.push(task('inspect-browser-qa','automatic','Investigate browser accessibility and mobile test gaps'));
  }
  if (!isApproved(data.vendorClaimsApproved) || (Number.isInteger(data.unreviewedProducts) && data.unreviewedProducts > 0)) {
    tasks.push(task('research-candidates','automatic','Collect source leads and draft review notes without approving claims'));
  }
  if (isApproved(data.ciPassed) && isApproved(data.browserQaPassed)) {
    tasks.push(task('draft-code-improvements','automatic','Propose safe test-first development changes on a nonproduction branch'));
  }
  if (!isApproved(data.commercialHostingApproved)) {
    tasks.push(task('review-commercial-hosting','approval','Verify commercial hosting entitlement before monetization'));
  }
  if (!isApproved(data.privacyPolicyApproved)) {
    tasks.push(task('review-privacy','approval','Have the legal/privacy operator approve an accurate final policy'));
  }
  if (!isApproved(data.vendorClaimsApproved)) {
    tasks.push(task('review-research','approval','Obtain authenticated human editorial verification of product claims'));
  }
  if (!isApproved(data.affiliateProgramApproved)) {
    tasks.push(task('review-affiliate-contracts','approval','Apply to legitimate programs and verify acceptance and commission terms'));
  }
  if (!isApproved(data.productionApproval) || !isApproved(data.domainsReady)) {
    tasks.push(task('review-release','approval','Confirm domain ownership, production release and indexing policy'));
  }
  return {
    mode: canPublish ? 'ready-for-owner-release' : 'prelaunch',
    canPublish,
    canMonetize,
    canSpend: false,
    blockers,
    tasks,
    assessedProductCount: Number.isInteger(data.productCount) && data.productCount >= 0 ? data.productCount : null
  };
}
