import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const products = JSON.parse(readFileSync(new URL('../src/data/products.json', import.meta.url), 'utf8'));
const pages = ['index.html', 'compare/index.html', 'methodology/index.html', 'privacy/index.html', 'disclosure/index.html', ...products.map(p => `software/${p.id}/index.html`)];
for (const page of pages) {
  const path = join('dist', page);
  assert.ok(existsSync(path), `Missing built route: ${path}`);
  const html = readFileSync(path, 'utf8');
  assert.match(html, /<meta[^>]*name=["']robots["'][^>]*noindex/i, `Non-indexing protection missing: ${page}`);
  assert.match(html, /StackPilot AI/, `Brand missing: ${page}`);
}
const home = readFileSync('dist/index.html', 'utf8');
assert.match(home, /\/compare\//);
assert.match(home, /\/software\/hubspot\//);
assert.match(home, /\/methodology\//);
assert.match(home, /Affiliate disclosure/);
const compare = readFileSync('dist/compare/index.html', 'utf8');
for (const product of products) assert.ok(compare.includes(product.name), `Compare page omits ${product.name}`);
console.log(`Static route smoke passed for ${pages.length} pages`);
