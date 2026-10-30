import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const pages = [
  'src/pages/index.astro',
  'src/pages/software/[id].astro',
  'src/pages/compare/index.astro',
  'src/pages/methodology/index.astro',
  'src/pages/privacy/index.astro',
  'src/pages/disclosure/index.astro'
];
test('every prelaunch page is opted out of search indexing', () => {
  for (const page of pages) assert.match(read(page), /name="robots" content="noindex, nofollow"/, page);
});
test('official outbound links avoid opener and referrer leakage', () => {
  for (const page of ['src/pages/index.astro', 'src/pages/software/[id].astro']) {
    const code = read(page);
    assert.match(code, /rel="noopener noreferrer"/, page);
  }
});
test('catalog has no affiliate URLs', () => {
  const products = JSON.parse(read('src/data/products.json'));
  assert.ok(products.length >= 3);
  assert.ok(products.every(p => p.affiliateUrl === null));
});
test('site deliberately remains static', () => {
  assert.match(read('astro.config.mjs'), /output:\s*['"]static['"]/);
});
test('methodology does not describe agent-based ranking as active', () => {
  assert.match(read('src/pages/methodology/index.astro'), /No AI model makes real-time purchasing decisions/);
});

test('dependency graph is locked and CI installs it reproducibly', () => {
  const lock = JSON.parse(read('package-lock.json'));
  assert.equal(lock.lockfileVersion, 3);
  assert.ok(lock.packages['node_modules/astro']);
  const workflow = read('.github/workflows/ci.yml');
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /contents: read/);
});
