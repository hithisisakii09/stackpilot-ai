import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('operating policy explicitly locks all spending and launch approvals', () => {
  const policy = JSON.parse(read('config/operating-policy.json'));
  assert.equal(policy.monthlyBudgetINR, 0);
  assert.equal(policy.delegatedSpendINR, 0);
  assert.equal(policy.hostingCandidate, 'netlify-free');
  assert.equal(policy.commercialHostingApproved, false);
  assert.equal(policy.productionLaunchApproved, false);
  assert.equal(policy.affiliateActivationApproved, false);
  assert.equal(policy.paidServicesApproved, false);
});

test('Netlify static build has no functions or paid build settings', () => {
  const netlify = read('netlify.toml');
  assert.match(netlify, /\[build\]/);
  assert.match(netlify, /command\s*=\s*["']npm run build["']/);
  assert.match(netlify, /publish\s*=\s*["']dist["']/);
  assert.match(netlify, /NODE_VERSION\s*=\s*["']22\.\d+\.\d+["']/);
  assert.doesNotMatch(netlify, /functions\s*=|edge_functions|plugin|\[\[redirects\]\]/);
});

test('all Netlify static responses have noindex and baseline hardening', () => {
  const headers = read('public/_headers');
  assert.match(headers, /\/\*/);
  assert.match(headers, /X-Robots-Tag:\s*noindex,\s*nofollow,\s*noarchive/i);
  assert.match(headers, /X-Content-Type-Options:\s*nosniff/i);
  assert.match(headers, /Referrer-Policy:\s*strict-origin-when-cross-origin/i);
});

test('operations report exposes owner zero-budget policy without converting it to authorization', () => {
  const out = execFileSync(process.execPath,['scripts/ops-report.mjs','--json'],{encoding:'utf8'});
  const report = JSON.parse(out);
  assert.equal(report.budget.monthlyBudgetINR, 0);
  assert.equal(report.budget.delegatedSpendINR, 0);
  assert.equal(report.budget.hostingCandidate, 'netlify-free');
  assert.equal(report.canSpend, false);
  assert.equal(report.canPublish, false);
  assert.equal(report.canMonetize, false);
});
