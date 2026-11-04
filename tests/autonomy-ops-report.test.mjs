import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const json = () => JSON.parse(execFileSync(process.execPath, [
  'scripts/ops-report.mjs', '--json'
], { encoding: 'utf8' }));
test('operations report uses a real catalog and remains private-prelaunch', () => {
  const report = json();
  assert.equal(report.candidateProducts, 6);
  assert.equal(report.pendingResearch, 6);
  assert.equal(report.mode, 'prelaunch');
  assert.equal(report.canPublish, false);
  assert.equal(report.canMonetize, false);
  assert.equal(report.canSpend, false);
  assert.equal(report.operationalStatus, 'preview-only');
});
test('report never fabricates human approval from existing vendor source leads', () => {
  const report = json();
  assert.equal(report.reviewedProducts, 0);
  assert.ok(report.blockers.includes('vendor-claims-unverified'));
  assert.ok(report.blockers.includes('commercial-hosting-unapproved'));
  assert.ok(report.blockers.includes('affiliate-program-unapproved'));
});
test('reported autonomous work is safe by explicit action allow-list', () => {
  const report = json();
  const allowed = new Set(['inspect-ci','inspect-browser-qa','research-candidates','draft-code-improvements']);
  assert.ok(report.tasks.filter(t => t.autonomy === 'automatic').every(t => allowed.has(t.action)));
});
test('workflow report has read-only token and a verification gate', () => {
  const code = readFileSync('.github/workflows/agent-ops.yml', 'utf8');
  assert.match(code, /contents: read/);
  assert.doesNotMatch(code, /issues: write|pull-requests: write|permissions:\s*write-all/);
  assert.match(code, /npm test/);
  assert.ok(code.includes('npm run --silent ops:report -- --json --ci-passed > artifacts/ops/report.json'));
  assert.doesNotMatch(code, /npm run ops:report -- --json --ci-passed > artifacts/);
  assert.match(code, /canPublish \|\| r.canMonetize \|\| r.canSpend/);
});
test('operations report never asserts successful CI unless caller attests', () => {
  assert.ok(json().blockers.includes('ci-unverified'));
  const report = JSON.parse(execFileSync(process.execPath, [
    'scripts/ops-report.mjs','--json','--ci-passed'
  ], { encoding: 'utf8' }));
  assert.ok(!report.blockers.includes('ci-unverified'));
  assert.equal(report.canPublish, false);
});
