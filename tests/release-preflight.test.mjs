import test from 'node:test';
import assert from 'node:assert/strict';
import { auditStaticRoutes, auditDeploymentConstraints } from '../src/lib/release-preflight.mjs';

const goodPage = '<!doctype html><html lang="en"><head><meta name="robots" content="noindex, nofollow"><title>StackPilot AI</title></head><body><h1>Comparison</h1></body></html>';
const policy = {policyVersion:1,monthlyBudgetINR:0,delegatedSpendINR:0,hostingCandidate:'netlify-free',commercialHostingApproved:false,productionLaunchApproved:false,affiliateActivationApproved:false,paidServicesApproved:false};
const headers = '/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n';
const robots = 'User-agent: *\nDisallow: /\n';

test('audits all generated static routes rather than a fixed hand-written shortlist', () => {
  const result=auditStaticRoutes([
    {path:'index.html',html:goodPage},
    {path:'unplanned/new-tool/index.html',html:goodPage},
    {path:'software/kinsta/index.html',html:goodPage}
  ]);
  assert.equal(result.checkedRoutes,3);
  assert.deepEqual(result.violations,[]);
});

test('fails closed if any new page lacks prelaunch noindex, title or English language marker', () => {
  const missingIndex=goodPage.replace('noindex, nofollow','index, follow');
  const bad=auditStaticRoutes([{path:'index.html',html:goodPage},{path:'new-path/index.html',html:missingIndex}]);
  assert.ok(bad.violations.some(v=>v.includes('new-path/index.html')&&v.includes('noindex')));
  assert.deepEqual(auditStaticRoutes([{path:'index.html',html:goodPage.replace('<title>StackPilot AI</title>','')}]).violations.filter(v=>v.includes('title')).length,1);
  assert.ok(auditStaticRoutes([{path:'index.html',html:goodPage.replace('lang="en"','lang="fr"')}]).violations.some(v=>v.includes('lang')));
});

test('fails closed for unexpected external JavaScript and external form submission', () => {
  const external=goodPage.replace('</body>', '<script src="https://tracking.example/collect.js"></script><form action="https://tracking.example/collect" method="post"></form></body>');
  const violations=auditStaticRoutes([{path:'index.html',html:external}]).violations;
  assert.ok(violations.some(v=>v.includes('externally hosted script')));
  assert.ok(violations.some(v=>v.includes('external form action')));
});

test('requires at least one route and rejects duplicate or unsafe route paths', () => {
  assert.ok(auditStaticRoutes([]).violations.length>0);
  assert.ok(auditStaticRoutes([{path:'index.html',html:goodPage},{path:'index.html',html:goodPage}]).violations.some(v=>v.includes('Duplicate')));
  assert.ok(auditStaticRoutes([{path:'../secret.html',html:goodPage}]).violations.some(v=>v.includes('Invalid route')));
});

test('validates zero budget, disabled release and affiliate gates, wildcard headers and robots', () => {
  assert.deepEqual(auditDeploymentConstraints({policy,headers,robots}).violations,[]);
  for (const [key,value] of Object.entries({monthlyBudgetINR:1,delegatedSpendINR:1,productionLaunchApproved:true,affiliateActivationApproved:true,paidServicesApproved:true,commercialHostingApproved:true})) {
    const result=auditDeploymentConstraints({policy:{...policy,[key]:value},headers,robots});
    assert.ok(result.violations.some(v=>v.includes(key)),key);
  }
  assert.ok(auditDeploymentConstraints({policy,headers:headers.replace('noindex','index'),robots}).violations.some(v=>v.includes('X-Robots-Tag')));
  assert.ok(auditDeploymentConstraints({policy,headers,robots:'User-agent: *\nAllow: /\n'}).violations.some(v=>v.includes('Disallow')));
});

test('does not mutate supplied inputs or assert site access from a static scan', () => {
  const pages=[{path:'index.html',html:goodPage}];
  const config={policy:{...policy},headers,robots};
  const before=structuredClone({pages,config});
  const route=auditStaticRoutes(pages);
  const deploy=auditDeploymentConstraints(config);
  assert.deepEqual({pages,config},before);
  assert.equal(route.checkedRoutes,1);
  assert.equal(Object.hasOwn(route,'authenticatedAccessVerified'),false);
  assert.equal(Object.hasOwn(deploy,'publicLaunchAuthorized'),false);
});
