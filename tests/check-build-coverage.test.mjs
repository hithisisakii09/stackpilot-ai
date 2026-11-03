import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('check-build script must audit all 25 emitted HTML routes for brand and noindex', () => {
  const content = readFileSync('scripts/check-build.mjs', 'utf8');
  assert.match(content, /'preview-build\/index\.html'/, 'Must audit preview-build route');
  assert.match(content, /'tools\/crm-migration-readiness\/index\.html'/, 'Must audit crm-migration-readiness route');
  assert.match(content, /'tools\/hosting-cutover-gates\/index\.html'/, 'Must audit hosting-cutover-gates route');
  assert.match(content, /'tools\/backup-restore-drill\/index\.html'/, 'Must audit backup-restore-drill route');
  assert.match(content, /'tools\/hosting-hidden-costs\/index\.html'/, 'Must audit hosting-hidden-costs route');
  assert.match(content, /'tools\/seo-audit-scope\/index\.html'/, 'Must audit seo-audit-scope route');
  assert.match(content, /'tools\/private-uat-worksheet\/index\.html'/, 'Must audit private-uat-worksheet route');
});
