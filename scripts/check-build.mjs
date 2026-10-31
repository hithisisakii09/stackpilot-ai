import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const products = JSON.parse(readFileSync(new URL('../src/data/products.json', import.meta.url), 'utf8'));
const pages = ['index.html', 'compare/index.html', 'methodology/index.html', 'privacy/index.html', 'disclosure/index.html', 'research/index.html', 'tools/requirements-checklist/index.html', 'tools/software-cost-calculator/index.html', 'guides/saas-total-cost-of-ownership/index.html', ...products.map(p => `software/${p.id}/index.html`)];
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
assert.match(home, /\/tools\/requirements-checklist\//);
assert.match(home, /\/tools\/software-cost-calculator\//);
assert.match(home, /\/guides\/saas-total-cost-of-ownership\//);
const worksheet = readFileSync('dist/tools/requirements-checklist/index.html','utf8');
assert.match(worksheet,/No vendor scoring, referral links, accounts, analytics, or server submission/);
const compare = readFileSync('dist/compare/index.html', 'utf8');
for (const product of products) assert.ok(compare.includes(product.name), `Compare page omits ${product.name}`);
console.log(`Static route smoke passed for ${pages.length} pages`);

assert.ok(existsSync('dist/robots.txt'), 'Prelaunch robots.txt missing');
assert.match(readFileSync('dist/robots.txt', 'utf8'), /Disallow:\s*\//, 'Prelaunch crawl blocking disabled');
const vercelConfig = JSON.parse(readFileSync('vercel.json', 'utf8'));
assert.ok(vercelConfig.headers?.some(rule => rule.headers?.some(h => h.key === 'X-Robots-Tag' && /noindex/.test(h.value))),
  'Vercel noindex response header missing');

const research = readFileSync('dist/research/index.html', 'utf8');
for (const product of products) assert.ok(research.includes(product.name), `Research workbench omits ${product.name}`);
assert.match(research, /No product claims or pricing have been editorially approved/);

assert.ok(existsSync('dist/_headers'), 'Hosting-platform noindex header file missing from published assets');
const staticHeaders = readFileSync('dist/_headers','utf8');
assert.match(staticHeaders, /X-Robots-Tag:\s*noindex,\s*nofollow,\s*noarchive/i,
  'Netlify/Cloudflare prelaunch non-indexing header missing');
assert.match(staticHeaders, /X-Content-Type-Options:\s*nosniff/i,
  'Static hosting content-type safeguard missing');

const costCalculator = readFileSync('dist/tools/software-cost-calculator/index.html','utf8');
assert.match(costCalculator,/We do not supply or verify the prices/);
assert.match(costCalculator,/All calculations happen locally in your browser/);
assert.match(costCalculator,/currency exchange/);

const tcoGuide=readFileSync('dist/guides/saas-total-cost-of-ownership/index.html','utf8');
assert.match(tcoGuide,/SaaS total cost of ownership/);
assert.match(tcoGuide,/hypothetical/i);
assert.match(tcoGuide,/USD 1000\.00/);
assert.match(tcoGuide,/USD 936\.00/);
assert.match(tcoGuide,/USD 64\.00/);
assert.match(tcoGuide,/\/tools\/software-cost-calculator\//);
